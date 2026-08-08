import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepairCategoryEntity } from './repair-category.entity';
import { RepairActivityEntity } from './repair-activity.entity';
import { PricingRuleEntity } from './pricing-rule.entity';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RepairCategoryEntity, RepairActivityEntity, PricingRuleEntity])],
  providers: [CatalogService],
  controllers: [CatalogController],
  exports: [TypeOrmModule, CatalogService],
})
export class CatalogModule {}
