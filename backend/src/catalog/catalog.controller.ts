import { Controller, Get } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  async publicCatalog() {
    const [categories, pricingRules] = await Promise.all([
      this.catalog.listCatalog(),
      this.catalog.listActivePricingRules(),
    ]);
    return {
      categories: categories.filter((category) => category.isActive),
      pricingRules,
    };
  }
}
