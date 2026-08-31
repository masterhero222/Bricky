import { getRepairCategoryByKey } from '../../constants/repairCatalog.js';

export function localizeKnowledgeMetadata(metadata) {
  return { ...metadata, categories: metadata.categories.map(category => {
    const local = getRepairCategoryByKey(category.categoryKey);
    if (!local) return category;
    const localized = value => /[\u0400-\u04ff]/.test(value || '');
    return { ...category,
      label: localized(category.label) ? category.label : local.label,
      description: localized(category.description) ? category.description : local.description,
    };
  }) };
}
