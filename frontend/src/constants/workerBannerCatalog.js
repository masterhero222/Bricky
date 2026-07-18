export const DEFAULT_WORKER_BANNER_KEY = "blueprint_general_v1";

export const WORKER_BANNER_CATALOG = Object.freeze({
  blueprint_general_v1: {
    key: "blueprint_general_v1",
    label: "Универсален Bricky",
    src: "/assets/worker-banners/v1/blueprint-general.svg",
    categoryKeys: [],
  },
  blueprint_electrical_v1: {
    key: "blueprint_electrical_v1",
    label: "Електро ремонти",
    src: "/assets/worker-banners/v1/blueprint-electrical.svg",
    categoryKeys: ["electro"],
  },
  blueprint_plumbing_v1: {
    key: "blueprint_plumbing_v1",
    label: "ВиК ремонти",
    src: "/assets/worker-banners/v1/blueprint-plumbing.svg",
    categoryKeys: ["vik"],
  },
  blueprint_renovation_v1: {
    key: "blueprint_renovation_v1",
    label: "Ремонтни дейности",
    src: "/assets/worker-banners/v1/blueprint-renovation.svg",
    categoryKeys: [
      "painting",
      "plaster",
      "tiles",
      "bathroom_renovation",
      "drywall",
      "flooring",
      "heating_cooling",
      "windows_doors",
      "furniture_mounting",
      "roof_waterproofing",
      "demolition_cleanup",
      "full_renovation",
      "small_repairs",
    ],
  },
});

export function resolveWorkerBanner(key) {
  return WORKER_BANNER_CATALOG[key] || WORKER_BANNER_CATALOG[DEFAULT_WORKER_BANNER_KEY];
}

export function bannerKeyForCategory(categoryKey) {
  const key = String(categoryKey || "");
  const found = Object.values(WORKER_BANNER_CATALOG).find((banner) => banner.categoryKeys.includes(key));
  return found?.key || DEFAULT_WORKER_BANNER_KEY;
}
