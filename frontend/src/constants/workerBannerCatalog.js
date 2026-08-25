export const DEFAULT_WORKER_BANNER_KEY = "blueprint_general_v1";

export const WORKER_BANNER_CATALOG = Object.freeze({
  blueprint_general_v1: {
    key: "blueprint_general_v1",
    label: "Универсален Bricky",
    src: "/assets/worker-banners/v1/blueprint-general.webp",
    categoryKeys: [],
  },
  blueprint_plumbing_v1: {
    key: "blueprint_plumbing_v1",
    label: "ВиК ремонти",
    src: "/assets/worker-banners/v1/blueprint-plumbing.webp",
    categoryKeys: ["vik"],
  },
  blueprint_electrical_v1: {
    key: "blueprint_electrical_v1",
    label: "Електро ремонти",
    src: "/assets/worker-banners/v1/blueprint-electrical.webp",
    categoryKeys: ["electro"],
  },
  blueprint_painting_v1: {
    key: "blueprint_painting_v1",
    label: "Боядисване",
    src: "/assets/worker-banners/v1/blueprint-painting.webp",
    categoryKeys: ["painting"],
  },
  blueprint_plaster_v1: {
    key: "blueprint_plaster_v1",
    label: "Шпакловка и мазилки",
    src: "/assets/worker-banners/v1/blueprint-plaster.webp",
    categoryKeys: ["plaster"],
  },
  blueprint_tiles_v1: {
    key: "blueprint_tiles_v1",
    label: "Плочки / теракот / гранитогрес",
    src: "/assets/worker-banners/v1/blueprint-tiles.webp",
    categoryKeys: ["tiles"],
  },
  blueprint_bathroom_v1: {
    key: "blueprint_bathroom_v1",
    label: "Ремонт на баня",
    src: "/assets/worker-banners/v1/blueprint-bathroom.webp",
    categoryKeys: ["bathroom_renovation"],
  },
  blueprint_drywall_v1: {
    key: "blueprint_drywall_v1",
    label: "Гипсокартон",
    src: "/assets/worker-banners/v1/blueprint-drywall.webp",
    categoryKeys: ["drywall"],
  },
  blueprint_flooring_v1: {
    key: "blueprint_flooring_v1",
    label: "Подови настилки",
    src: "/assets/worker-banners/v1/blueprint-flooring.webp",
    categoryKeys: ["flooring"],
  },
  blueprint_hvac_v1: {
    key: "blueprint_hvac_v1",
    label: "Климатици / отопление",
    src: "/assets/worker-banners/v1/blueprint-hvac.webp",
    categoryKeys: ["heating_cooling"],
  },
  blueprint_windows_doors_v1: {
    key: "blueprint_windows_doors_v1",
    label: "Врати и дограма",
    src: "/assets/worker-banners/v1/blueprint-windows-doors.webp",
    categoryKeys: ["windows_doors"],
  },
  blueprint_furniture_v1: {
    key: "blueprint_furniture_v1",
    label: "Мебели и монтажи",
    src: "/assets/worker-banners/v1/blueprint-furniture.webp",
    categoryKeys: ["furniture_mounting"],
  },
  blueprint_roofing_v1: {
    key: "blueprint_roofing_v1",
    label: "Покриви и хидроизолация",
    src: "/assets/worker-banners/v1/blueprint-roofing.webp",
    categoryKeys: ["roof_waterproofing"],
  },
  blueprint_demolition_v1: {
    key: "blueprint_demolition_v1",
    label: "Къртене, чистене, извозване",
    src: "/assets/worker-banners/v1/blueprint-demolition.webp",
    categoryKeys: ["demolition_cleanup"],
  },
  blueprint_full_renovation_v1: {
    key: "blueprint_full_renovation_v1",
    label: "Цялостен ремонт",
    src: "/assets/worker-banners/v1/blueprint-full-renovation.webp",
    categoryKeys: ["full_renovation"],
  },
  blueprint_handyman_v1: {
    key: "blueprint_handyman_v1",
    label: "Дребни домашни ремонти",
    src: "/assets/worker-banners/v1/blueprint-handyman.webp",
    categoryKeys: ["small_repairs"],
  },
});

export const WORKER_BANNER_KEYS = Object.freeze(Object.keys(WORKER_BANNER_CATALOG));

export function resolveWorkerBanner(key) {
  return WORKER_BANNER_CATALOG[key] || WORKER_BANNER_CATALOG[DEFAULT_WORKER_BANNER_KEY];
}

export function getAllowedBanners() {
  return Object.values(WORKER_BANNER_CATALOG);
}

export function isWorkerBannerAllowed(key) {
  return Boolean(WORKER_BANNER_CATALOG[key]);
}

export function bannerKeyForCategory(categoryKey) {
  const key = String(categoryKey || "").trim();
  const found = Object.values(WORKER_BANNER_CATALOG).find((banner) => banner.categoryKeys.includes(key));
  return found?.key || DEFAULT_WORKER_BANNER_KEY;
}
