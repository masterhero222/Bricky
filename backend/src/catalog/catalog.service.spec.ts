import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { PricingRuleEntity } from './pricing-rule.entity';

function repo(overrides: Record<string, any> = {}) {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    ...overrides,
  };
}

describe('CatalogService', () => {
  function setup(overrides: Record<string, any> = {}) {
    const categoriesRepo = overrides.categoriesRepo || repo();
    const activitiesRepo = overrides.activitiesRepo || repo();
    const pricingRepo = overrides.pricingRepo || repo();
    const transactionPricingRepo = overrides.transactionPricingRepo || repo();
    const dataSource = {
      transaction: jest.fn(async (work) =>
        work({
          getRepository: jest.fn((entity) => {
            if (entity === PricingRuleEntity) return transactionPricingRepo;
            throw new Error('Unexpected repository');
          }),
        }),
      ),
    };
    return {
      service: new CatalogService(categoriesRepo, activitiesRepo, pricingRepo, dataSource as any),
      categoriesRepo,
      activitiesRepo,
      pricingRepo,
      transactionPricingRepo,
      dataSource,
    };
  }

  it('groups activities under their canonical category', async () => {
    const categoriesRepo = repo({
      find: jest.fn().mockResolvedValue([
        { id: 1, categoryKey: 'vik', label: 'ВиК', sortOrder: 10, isActive: true },
      ]),
    });
    const activitiesRepo = repo({
      find: jest.fn().mockResolvedValue([
        { id: 2, categoryKey: 'vik', activityKey: 'leak', label: 'Теч', sortOrder: 10, isActive: true },
      ]),
    });
    const { service } = setup({ categoriesRepo, activitiesRepo });

    const result = await service.listCatalog();

    expect(result[0].activities).toEqual([
      expect.objectContaining({ activityKey: 'leak' }),
    ]);
  });

  it('requires a label when a new category or activity is created', async () => {
    const categoriesRepo = repo({ findOne: jest.fn().mockResolvedValue(null) });
    const { service } = setup({ categoriesRepo });

    await expect(service.upsertCategory('vik', {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates an active pricing version and retires the prior active version atomically', async () => {
    const category = { id: 1, categoryKey: 'vik', label: 'ВиК', isActive: true };
    const activity = { id: 2, categoryKey: 'vik', activityKey: 'leak', label: 'Теч', isActive: true };
    const categoriesRepo = repo({ findOne: jest.fn().mockResolvedValue(category) });
    const activitiesRepo = repo({ findOne: jest.fn().mockResolvedValue(activity) });
    const transactionPricingRepo = repo({
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(async (value) => ({ id: 3, ...value })),
    });
    const { service, dataSource } = setup({
      categoriesRepo,
      activitiesRepo,
      transactionPricingRepo,
    });

    const rule = await service.createPricingRule({
      version: '2026-q3',
      categoryKey: 'vik',
      activityKey: 'leak',
      laborMin: 50,
      laborMax: 90,
      materialMin: 10,
      materialMax: 30,
    });

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(transactionPricingRepo.update).toHaveBeenCalledWith(
      { categoryKey: 'vik', activityKey: 'leak', isActive: true },
      { isActive: false },
    );
    expect(rule).toEqual(expect.objectContaining({
      id: 3,
      laborMin: '50.00',
      laborMax: '90.00',
      currency: 'EUR',
      isActive: true,
    }));
  });

  it('rejects invalid pricing ranges and missing activities', async () => {
    const category = { id: 1, categoryKey: 'vik', label: 'ВиК', isActive: true };
    const categoriesRepo = repo({ findOne: jest.fn().mockResolvedValue(category) });
    const activitiesRepo = repo({ findOne: jest.fn().mockResolvedValue(null) });
    const { service } = setup({ categoriesRepo, activitiesRepo });

    await expect(
      service.createPricingRule({
        version: '2026-q3',
        categoryKey: 'vik',
        activityKey: 'leak',
        laborMin: 100,
        laborMax: 50,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    activitiesRepo.findOne.mockResolvedValue({ categoryKey: 'vik', activityKey: 'leak' });
    await expect(
      service.createPricingRule({
        version: '2026-q3',
        categoryKey: 'vik',
        activityKey: 'leak',
        laborMin: 100,
        laborMax: 50,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('activates one pricing rule while retiring active siblings', async () => {
    const transactionPricingRepo = repo({
      findOne: jest.fn().mockResolvedValue({
        id: 8,
        version: '2026-q3',
        categoryKey: 'vik',
        activityKey: 'leak',
        isActive: false,
      }),
    });
    const { service } = setup({ transactionPricingRepo });

    const result = await service.setPricingRuleActive(8, true);

    expect(transactionPricingRepo.update).toHaveBeenCalledWith(
      { categoryKey: 'vik', activityKey: 'leak', isActive: true },
      { isActive: false },
    );
    expect(result.isActive).toBe(true);
  });
});
