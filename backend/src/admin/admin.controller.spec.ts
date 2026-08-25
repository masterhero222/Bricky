import { ForbiddenException } from '@nestjs/common';
import { AdminController } from './admin.controller';

describe('AdminController catalog and timeline authorization', () => {
  function setup() {
    const admin = {
      listCategories: jest.fn().mockResolvedValue([]),
      upsertCategory: jest.fn().mockResolvedValue({ categoryKey: 'vik' }),
      upsertActivity: jest.fn().mockResolvedValue({ activityKey: 'general' }),
      listPricingRules: jest.fn().mockResolvedValue([]),
      createPricingRule: jest.fn().mockResolvedValue({ id: 1 }),
      setPricingRuleActive: jest.fn().mockResolvedValue({ id: 1, isActive: true }),
      getRequestTimeline: jest.fn().mockResolvedValue({ request: { id: 7 }, events: [] }),
      getWorkerDetails: jest.fn().mockResolvedValue({ workerUserId: 201 }),
    };
    return { controller: new AdminController(admin as any), admin };
  }

  it('allows admin roles to read catalog, pricing and request timeline', async () => {
    const { controller, admin } = setup();
    const req = { user: { id: 10, role: 'admin' } };

    await controller.categories(req);
    await controller.pricing(req);
    await controller.requestTimeline(req, '7');
    await controller.workerDetails(req, '201');

    expect(admin.listCategories).toHaveBeenCalled();
    expect(admin.listPricingRules).toHaveBeenCalled();
    expect(admin.getRequestTimeline).toHaveBeenCalledWith(7);
    expect(admin.getWorkerDetails).toHaveBeenCalledWith(201);
  });

  it('blocks non-admin users from private worker details', () => {
    const { controller } = setup();

    expect(() =>
      controller.workerDetails({ user: { id: 201, role: 'worker' } }, '201'),
    ).toThrow(ForbiddenException);
  });

  it('blocks regular admins from catalog mutations but allows pricing corrections', async () => {
    const { controller, admin } = setup();
    const req = { user: { id: 10, role: 'admin' } };

    expect(() => controller.upsertCategory(req, 'vik', { isActive: false })).toThrow(ForbiddenException);
    expect(() => controller.upsertActivity(req, 'vik', 'general', { isActive: false })).toThrow(ForbiddenException);
    await controller.createPricing(req, { version: '2026-q3' });
    await controller.setPricingStatus(req, '1', { isActive: true });
    expect(admin.createPricingRule).toHaveBeenCalled();
    expect(admin.setPricingRuleActive).toHaveBeenCalled();
  });

  it('allows super admins to mutate catalog and pricing', async () => {
    const { controller, admin } = setup();
    const req = { user: { id: 1, role: 'super_admin' } };

    await controller.upsertCategory(req, 'vik', { isActive: false, reason: 'maintenance' });
    await controller.upsertActivity(req, 'vik', 'general', { isActive: false });
    await controller.createPricing(req, { version: '2026-q3', categoryKey: 'vik' });
    await controller.setPricingStatus(req, '1', { isActive: true });

    expect(admin.upsertCategory).toHaveBeenCalledWith(
      1,
      'vik',
      expect.objectContaining({ isActive: false }),
      'maintenance',
    );
    expect(admin.upsertActivity).toHaveBeenCalledWith(
      1,
      'vik',
      'general',
      expect.objectContaining({ isActive: false }),
      undefined,
    );
    expect(admin.createPricingRule).toHaveBeenCalled();
    expect(admin.setPricingRuleActive).toHaveBeenCalledWith(1, 1, true, undefined);
  });
});
