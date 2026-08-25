import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PricingRuleEntity } from './pricing-rule.entity';
import { RepairActivityEntity } from './repair-activity.entity';
import { RepairCategoryEntity } from './repair-category.entity';

export type CatalogCategoryInput = {
  label?: string;
  description?: string | null;
  isActive?: boolean;
  sortOrder?: number;
};

export type CatalogActivityInput = {
  label?: string;
  unitType?: string | null;
  isActive?: boolean;
  sortOrder?: number;
};

export type PricingRuleInput = {
  version?: string;
  categoryKey?: string;
  activityKey?: string;
  laborMin?: number | string;
  laborMax?: number | string;
  materialMin?: number | string | null;
  materialMax?: number | string | null;
  currency?: string;
  validFrom?: string | Date | null;
  validTo?: string | Date | null;
  isActive?: boolean;
};

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(RepairCategoryEntity)
    private readonly categoriesRepo: Repository<RepairCategoryEntity>,
    @InjectRepository(RepairActivityEntity)
    private readonly activitiesRepo: Repository<RepairActivityEntity>,
    @InjectRepository(PricingRuleEntity)
    private readonly pricingRepo: Repository<PricingRuleEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async listCatalog() {
    const [categories, activities] = await Promise.all([
      this.categoriesRepo.find({ order: { sortOrder: 'ASC', label: 'ASC' } }),
      this.activitiesRepo.find({ order: { categoryKey: 'ASC', sortOrder: 'ASC', label: 'ASC' } }),
    ]);
    const byCategory = new Map<string, RepairActivityEntity[]>();
    activities.forEach((activity) => {
      const list = byCategory.get(activity.categoryKey) || [];
      list.push(activity);
      byCategory.set(activity.categoryKey, list);
    });
    return categories.map((category) => ({
      ...category,
      activities: byCategory.get(category.categoryKey) || [],
    }));
  }

  async upsertCategory(categoryKey: string, input: CatalogCategoryInput) {
    const key = this.normalizeKey(categoryKey, 'categoryKey', 80);
    let category = await this.categoriesRepo.findOne({ where: { categoryKey: key } });
    if (!category) {
      if (!String(input?.label || '').trim()) throw new BadRequestException('Category label is required');
      category = this.categoriesRepo.create({
        categoryKey: key,
        label: String(input.label).trim(),
        description: null,
        isActive: true,
        sortOrder: 0,
      });
    }
    if (input.label !== undefined) {
      const label = String(input.label).trim();
      if (!label) throw new BadRequestException('Category label is required');
      category.label = label;
    }
    if (input.description !== undefined) category.description = this.nullableText(input.description);
    if (input.isActive !== undefined) category.isActive = Boolean(input.isActive);
    if (input.sortOrder !== undefined) category.sortOrder = this.integer(input.sortOrder, 'sortOrder');
    return this.categoriesRepo.save(category);
  }

  async upsertActivity(categoryKey: string, activityKey: string, input: CatalogActivityInput) {
    const category = await this.requireCategory(categoryKey);
    const key = this.normalizeKey(activityKey, 'activityKey', 120);
    let activity = await this.activitiesRepo.findOne({
      where: { categoryKey: category.categoryKey, activityKey: key },
    });
    if (!activity) {
      if (!String(input?.label || '').trim()) throw new BadRequestException('Activity label is required');
      activity = this.activitiesRepo.create({
        categoryKey: category.categoryKey,
        activityKey: key,
        label: String(input.label).trim(),
        unitType: null,
        isActive: true,
        sortOrder: 0,
      });
    }
    if (input.label !== undefined) {
      const label = String(input.label).trim();
      if (!label) throw new BadRequestException('Activity label is required');
      activity.label = label;
    }
    if (input.unitType !== undefined) activity.unitType = this.nullableText(input.unitType, 40);
    if (input.isActive !== undefined) activity.isActive = Boolean(input.isActive);
    if (input.sortOrder !== undefined) activity.sortOrder = this.integer(input.sortOrder, 'sortOrder');
    return this.activitiesRepo.save(activity);
  }

  listPricingRules() {
    return this.pricingRepo.find({
      order: { categoryKey: 'ASC', activityKey: 'ASC', createdAt: 'DESC' },
    });
  }

  listActivePricingRules() {
    return this.pricingRepo.find({
      where: { isActive: true },
      order: { categoryKey: 'ASC', activityKey: 'ASC' },
    });
  }

  async createPricingRule(input: PricingRuleInput) {
    const category = await this.requireCategory(input?.categoryKey);
    const activityKey = this.normalizeKey(input?.activityKey, 'activityKey', 120);
    const activity = await this.activitiesRepo.findOne({
      where: { categoryKey: category.categoryKey, activityKey },
    });
    if (!activity) throw new NotFoundException('Repair activity not found');

    const version = String(input?.version || '').trim();
    if (!version || version.length > 80) throw new BadRequestException('Invalid pricing version');
    const laborMin = this.money(input?.laborMin, 'laborMin');
    const laborMax = this.money(input?.laborMax, 'laborMax');
    const materialMin = this.money(input?.materialMin, 'materialMin', true);
    const materialMax = this.money(input?.materialMax, 'materialMax', true);
    this.assertRange(laborMin, laborMax, 'labor');
    if (materialMin !== null || materialMax !== null) {
      if (materialMin === null || materialMax === null) {
        throw new BadRequestException('Both materialMin and materialMax are required');
      }
      this.assertRange(materialMin, materialMax, 'material');
    }
    const currency = String(input?.currency || 'EUR').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) throw new BadRequestException('Invalid currency');
    const validFrom = this.date(input?.validFrom, 'validFrom');
    const validTo = this.date(input?.validTo, 'validTo');
    if (validFrom && validTo && validTo <= validFrom) {
      throw new BadRequestException('validTo must be after validFrom');
    }

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PricingRuleEntity);
      const duplicate = await repo.findOne({
        where: { categoryKey: category.categoryKey, activityKey, version },
      });
      if (duplicate) throw new BadRequestException('Pricing version already exists for this activity');

      const isActive = input?.isActive !== false;
      if (isActive) {
        await repo.update({ categoryKey: category.categoryKey, activityKey, isActive: true }, { isActive: false });
      }
      return repo.save(
        repo.create({
          version,
          categoryKey: category.categoryKey,
          activityKey,
          laborMin,
          laborMax,
          materialMin,
          materialMax,
          currency,
          validFrom,
          validTo,
          isActive,
        }),
      );
    });
  }

  async setPricingRuleActive(id: number, isActive: boolean) {
    if (!Number.isInteger(id) || id <= 0) throw new BadRequestException('Invalid pricing rule id');
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PricingRuleEntity);
      const rule = await repo.findOne({ where: { id } });
      if (!rule) throw new NotFoundException('Pricing rule not found');
      if (isActive) {
        await repo.update(
          { categoryKey: rule.categoryKey, activityKey: rule.activityKey, isActive: true },
          { isActive: false },
        );
      }
      rule.isActive = Boolean(isActive);
      return repo.save(rule);
    });
  }

  private async requireCategory(categoryKey: unknown) {
    const key = this.normalizeKey(categoryKey, 'categoryKey', 80);
    const category = await this.categoriesRepo.findOne({ where: { categoryKey: key } });
    if (!category) throw new NotFoundException('Repair category not found');
    return category;
  }

  private normalizeKey(value: unknown, field: string, maxLength: number) {
    const key = String(value || '').trim().toLowerCase();
    if (!key || key.length > maxLength || !/^[a-z0-9][a-z0-9_-]*$/.test(key)) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return key;
  }

  private nullableText(value: unknown, maxLength?: number) {
    const text = String(value ?? '').trim();
    if (!text) return null;
    if (maxLength && text.length > maxLength) throw new BadRequestException('Text is too long');
    return text;
  }

  private integer(value: unknown, field: string) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) throw new BadRequestException(`Invalid ${field}`);
    return parsed;
  }

  private money(value: unknown, field: string): string;
  private money(value: unknown, field: string, nullable: true): string | null;
  private money(value: unknown, field: string, nullable = false): string | null {
    if ((value === null || value === undefined || value === '') && nullable) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 99999999.99) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return parsed.toFixed(2);
  }

  private assertRange(min: string, max: string, name: string) {
    if (Number(min) > Number(max)) throw new BadRequestException(`${name} minimum cannot exceed maximum`);
  }

  private date(value: unknown, field: string) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(parsed.getTime())) throw new BadRequestException(`Invalid ${field}`);
    return parsed;
  }
}
