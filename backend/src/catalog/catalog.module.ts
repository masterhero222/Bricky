import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepairCategoryEntity } from './repair-category.entity';
import { RepairActivityEntity } from './repair-activity.entity';
import { PricingRuleEntity } from './pricing-rule.entity';
import { CatalogService } from './catalog.service';

@Module({
  imports: [TypeOrmModule.forFeature([RepairCategoryEntity, RepairActivityEntity, PricingRuleEntity])],
  providers: [CatalogService],
  exports: [TypeOrmModule, CatalogService],
})
export class CatalogModule {}
