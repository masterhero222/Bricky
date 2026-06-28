const rule = (
  categoryKey,
  activityKey,
  mode,
  confidence,
  consumablesMin,
  consumablesMax,
  options = {}
) => ({
  key: `${categoryKey}.${activityKey}`,
  categoryKey,
  activityKey,
  mode,
  confidence,
  consumablesMin,
  consumablesMax,
  materialsEstimateMin: consumablesMin,
  materialsEstimateMax: consumablesMax,
  standardQuantity: 1,
  scaleWithScope: ["area_formula", "linear_formula", "item_formula"].includes(mode),
  includedMaterialKeys: [],
  excludedMaterialKeys: [],
  materialIncludesProduct: false,
  formulaNote: "",
  uiNote: "",
  ...options,
});

export const MATERIAL_QUANTITY_RULES_VERSION = "2026-v0.1";

export const MATERIAL_QUANTITY_RULES = [
  // ВиК
  rule("vik", "leak_repair", "inspection_required", "inspection_required", 20, 200, {
    includedMaterialKeys: ["vik.fittings", "vik.seals", "vik.teflon_tape"],
    uiNote: "Материалите зависят от мястото и причината за теча.",
  }),
  rule("vik", "faucet", "fixed_kit", "high", 0, 30, {
    includedMaterialKeys: ["vik.soft_connections", "vik.teflon_tape", "vik.seals", "vik.silicone"],
    excludedMaterialKeys: ["main_product.faucet"],
    uiNote: "Смесителят не е включен по подразбиране.",
  }),
  rule("vik", "siphon", "fixed_kit", "high", 15, 40, {
    includedMaterialKeys: ["vik.siphon", "vik.seals", "vik.silicone"],
  }),
  rule("vik", "cistern", "fixed_kit", "high", 20, 80, {
    includedMaterialKeys: ["vik.cistern_float", "vik.cistern_mechanism", "vik.seals", "vik.soft_connections"],
    excludedMaterialKeys: ["main_product.toilet"],
  }),
  rule("vik", "sink", "fixed_kit", "medium", 20, 70, {
    includedMaterialKeys: ["vik.siphon", "vik.soft_connections", "vik.silicone", "vik.fasteners"],
    excludedMaterialKeys: ["main_product.sink"],
    uiNote: "Мивката не е включена по подразбиране.",
  }),
  rule("vik", "shower", "fixed_kit", "medium", 0, 30, {
    includedMaterialKeys: ["vik.seals", "vik.teflon_tape", "vik.silicone"],
    excludedMaterialKeys: ["main_product.shower_system"],
    uiNote: "Душ системата не е включена по подразбиране.",
  }),
  rule("vik", "boiler", "fixed_kit", "medium", 20, 80, {
    includedMaterialKeys: ["vik.soft_connections", "vik.valves", "vik.fittings", "vik.fasteners"],
    excludedMaterialKeys: ["main_product.boiler"],
    uiNote: "Бойлерът не е включен по подразбиране.",
  }),
  rule("vik", "unblocking", "fixed_kit", "high", 0, 20, {
    includedMaterialKeys: ["common.protective_consumables"],
  }),
  rule("vik", "pipe_replacement", "inspection_required", "inspection_required", 50, 250, {
    includedMaterialKeys: ["vik.ppr_pipes", "vik.pvc_pipes", "vik.fittings", "vik.clamps"],
    formulaNote: "Тръби, фитинги и скоби според линейните метри и реалния маршрут.",
  }),

  // Електро
  rule("electro", "sockets", "item_formula", "high", 5, 25, {
    includedMaterialKeys: ["electro.socket", "electro.frame", "electro.terminals", "electro.fasteners"],
  }),
  rule("electro", "switches", "item_formula", "high", 5, 20, {
    includedMaterialKeys: ["electro.switch", "electro.frame", "electro.terminals"],
  }),
  rule("electro", "lighting", "fixed_kit", "medium", 0, 40, {
    includedMaterialKeys: ["electro.terminals", "electro.fasteners", "electro.cable"],
    excludedMaterialKeys: ["main_product.light_fixture"],
    uiNote: "Осветителното тяло не е включено по подразбиране.",
  }),
  rule("electro", "fuses", "item_formula", "high", 5, 30, {
    includedMaterialKeys: ["electro.breaker", "electro.terminals"],
  }),
  rule("electro", "panel", "inspection_required", "inspection_required", 40, 250, {
    includedMaterialKeys: ["electro.panel_box", "electro.breaker", "electro.rcd", "electro.busbar"],
    uiNote: "Необходим е оглед от квалифициран електротехник.",
  }),
  rule("electro", "faulty_circuit", "inspection_required", "inspection_required", 0, 100, {
    includedMaterialKeys: ["electro.cable", "electro.terminals", "electro.heat_shrink"],
    uiNote: "Материалите зависят от открития дефект.",
  }),
  rule("electro", "new_points", "linear_formula", "medium", 15, 80, {
    includedMaterialKeys: ["electro.cable", "electro.conduit", "electro.socket_box", "electro.socket", "electro.switch"],
    formulaNote: "Кабел и гофре според трасето плюс кутия и крайно устройство.",
  }),
  rule("electro", "diagnostics", "fixed_kit", "high", 0, 10),

  // Боядисване
  rule("painting", "room", "area_formula", "high", 40, 120, {
    includedMaterialKeys: ["painting.latex", "painting.primer", "painting.masking_tape", "painting.covering_nylon"],
    formulaNote: "Стандартна стая: 35-50 m² боядисвана площ, два слоя и 10-20% резерв.",
  }),
  rule("painting", "rental_refresh", "area_formula", "high", 30, 90, {
    includedMaterialKeys: ["painting.latex", "painting.masking_tape", "painting.covering_nylon"],
  }),
  rule("painting", "after_renovation", "area_formula", "medium", 60, 160, {
    includedMaterialKeys: ["painting.latex", "painting.primer", "painting.covering_film", "painting.repair_mix"],
  }),
  rule("painting", "ceiling", "area_formula", "high", 20, 50, {
    includedMaterialKeys: ["painting.ceiling_paint", "painting.primer", "painting.covering_nylon"],
  }),
  rule("painting", "corridor", "area_formula", "high", 30, 90, {
    includedMaterialKeys: ["painting.latex", "painting.primer", "painting.masking_tape"],
  }),
  rule("painting", "apartment", "package_formula", "medium", 250, 800, {
    includedMaterialKeys: ["painting.latex", "painting.primer", "painting.covering_film", "painting.masking_tape"],
  }),

  // Шпакловка
  rule("plaster", "fine_putty", "area_formula", "medium", 40, 80, {
    standardQuantity: 20,
    includedMaterialKeys: ["plaster.fine_putty", "plaster.primer", "plaster.sandpaper"],
  }),
  rule("plaster", "wall_leveling", "area_formula", "medium", 60, 120, {
    standardQuantity: 20,
    includedMaterialKeys: ["plaster.gypsum_putty", "plaster.primer", "plaster.mesh"],
  }),
  rule("plaster", "cracked_walls", "area_formula", "medium", 60, 140, {
    standardQuantity: 20,
    includedMaterialKeys: ["plaster.fine_putty", "plaster.fiberglass_tape", "plaster.mesh", "plaster.primer"],
  }),
  rule("plaster", "paint_preparation", "area_formula", "high", 20, 60, {
    standardQuantity: 20,
    includedMaterialKeys: ["plaster.primer", "plaster.fine_putty", "plaster.sandpaper"],
  }),
  rule("plaster", "plaster", "area_formula", "medium", 80, 160, {
    standardQuantity: 20,
    includedMaterialKeys: ["plaster.plaster_mix", "plaster.primer", "plaster.corner_bead"],
  }),
  rule("plaster", "ceiling", "area_formula", "medium", 40, 100, {
    standardQuantity: 20,
    includedMaterialKeys: ["plaster.fine_putty", "plaster.primer", "plaster.fiberglass_tape"],
  }),

  // Плочки
  rule("tiles", "tile_laying", "area_formula", "high", 40, 90, {
    standardQuantity: 5,
    includedMaterialKeys: ["tiles.adhesive", "tiles.grout", "tiles.primer", "tiles.spacers", "tiles.leveling_system"],
    excludedMaterialKeys: ["main_product.tiles"],
    uiNote: "Плочките не са включени по подразбиране.",
  }),
  rule("tiles", "broken_tiles", "fixed_kit", "high", 20, 60, {
    includedMaterialKeys: ["tiles.adhesive", "tiles.grout", "tiles.primer"],
    excludedMaterialKeys: ["main_product.tiles"],
  }),
  rule("tiles", "grouting", "area_formula", "high", 15, 35, {
    standardQuantity: 5,
    includedMaterialKeys: ["tiles.grout", "tiles.consumables"],
  }),
  rule("tiles", "terrace", "area_formula", "medium", 60, 130, {
    standardQuantity: 5,
    includedMaterialKeys: ["tiles.flex_adhesive", "tiles.waterproofing", "tiles.grout", "tiles.primer"],
    excludedMaterialKeys: ["main_product.tiles"],
  }),
  rule("tiles", "kitchen", "area_formula", "high", 50, 110, {
    standardQuantity: 5,
    includedMaterialKeys: ["tiles.adhesive", "tiles.grout", "tiles.primer", "tiles.profiles"],
    excludedMaterialKeys: ["main_product.tiles"],
  }),
  rule("tiles", "corridor", "area_formula", "high", 40, 90, {
    standardQuantity: 5,
    includedMaterialKeys: ["tiles.adhesive", "tiles.grout", "tiles.primer"],
    excludedMaterialKeys: ["main_product.tiles"],
  }),

  // Баня
  rule("bathroom_renovation", "full_bathroom", "package_formula", "medium", 900, 1800, {
    includedMaterialKeys: ["bathroom_renovation.ppr_pipes", "bathroom_renovation.fittings", "bathroom_renovation.adhesive", "bathroom_renovation.grout", "bathroom_renovation.waterproofing"],
    excludedMaterialKeys: ["main_product.sanitary", "main_product.tiles", "main_product.boiler"],
    uiNote: "Санитарията, плочките, бойлерът и оборудването не са включени.",
  }),
  rule("bathroom_renovation", "bathroom_plumbing", "package_formula", "medium", 100, 300, {
    includedMaterialKeys: ["bathroom_renovation.ppr_pipes", "bathroom_renovation.fittings", "bathroom_renovation.stop_valves", "bathroom_renovation.siphon"],
  }),
  rule("bathroom_renovation", "bathroom_tiles", "area_formula", "medium", 250, 700, {
    standardQuantity: 3,
    includedMaterialKeys: ["bathroom_renovation.adhesive", "bathroom_renovation.grout", "bathroom_renovation.primer"],
    excludedMaterialKeys: ["main_product.tiles"],
  }),
  rule("bathroom_renovation", "sanitary", "package_formula", "medium", null, null, {
    materialsEstimateMin: 150,
    materialsEstimateMax: 700,
    materialIncludesProduct: true,
    excludedMaterialKeys: ["main_product.premium_sanitary"],
    uiNote: "Оборудването се включва само в режим с ориентировъчни материали.",
  }),
  rule("bathroom_renovation", "waterproofing", "area_formula", "high", 50, 150, {
    standardQuantity: 3,
    includedMaterialKeys: ["bathroom_renovation.waterproofing", "bathroom_renovation.waterproofing_tape", "bathroom_renovation.primer"],
  }),
  rule("bathroom_renovation", "demolition", "logistics_formula", "medium", 50, 150, {
    includedMaterialKeys: ["common.bags", "common.protective_consumables", "common.transport"],
  }),

  // Гипсокартон
  rule("drywall", "wall_lining", "area_formula", "medium", 180, 350, {
    standardQuantity: 10,
    includedMaterialKeys: ["drywall.board", "drywall.cd_profile", "drywall.ud_profile", "drywall.screws", "drywall.joint_tape", "drywall.joint_putty"],
  }),
  rule("drywall", "suspended_ceiling", "area_formula", "medium", 200, 400, {
    standardQuantity: 10,
    includedMaterialKeys: ["drywall.board", "drywall.cd_profile", "drywall.ud_profile", "drywall.hangers", "drywall.screws"],
  }),
  rule("drywall", "partition_wall", "area_formula", "medium", 250, 550, {
    standardQuantity: 10,
    includedMaterialKeys: ["drywall.board", "drywall.cw_profile", "drywall.uw_profile", "drywall.mineral_wool", "drywall.screws"],
  }),
  rule("drywall", "hide_pipes", "fixed_kit", "medium", 40, 120, {
    includedMaterialKeys: ["drywall.board", "drywall.cd_profile", "drywall.ud_profile", "drywall.screws"],
  }),
  rule("drywall", "hide_cables", "fixed_kit", "medium", 30, 100, {
    includedMaterialKeys: ["drywall.board", "drywall.cd_profile", "drywall.screws"],
  }),
  rule("drywall", "niche", "package_formula", "medium", 60, 200, {
    includedMaterialKeys: ["drywall.board", "drywall.cd_profile", "drywall.corner_bead", "drywall.joint_putty"],
  }),

  // Подови настилки
  rule("flooring", "laminate", "area_formula", "high", null, null, {
    standardQuantity: 15,
    materialsEstimateMin: 200,
    materialsEstimateMax: 550,
    materialIncludesProduct: true,
    includedMaterialKeys: ["flooring.laminate", "flooring.underlay", "flooring.skirting", "flooring.trim"],
  }),
  rule("flooring", "parquet", "area_formula", "medium", null, null, {
    standardQuantity: 15,
    materialsEstimateMin: 450,
    materialsEstimateMax: 1500,
    materialIncludesProduct: true,
    includedMaterialKeys: ["flooring.parquet", "flooring.parquet_adhesive", "flooring.skirting"],
  }),
  rule("flooring", "vinyl", "area_formula", "high", null, null, {
    standardQuantity: 15,
    materialsEstimateMin: 300,
    materialsEstimateMax: 900,
    materialIncludesProduct: true,
    includedMaterialKeys: ["flooring.vinyl", "flooring.spc", "flooring.underlay", "flooring.skirting"],
  }),
  rule("flooring", "skirting", "linear_formula", "high", null, null, {
    standardQuantity: 15,
    materialsEstimateMin: 60,
    materialsEstimateMax: 180,
    materialIncludesProduct: true,
    includedMaterialKeys: ["flooring.skirting", "flooring.trim"],
  }),
  rule("flooring", "screed", "area_formula", "medium", 250, 500, {
    standardQuantity: 15,
    includedMaterialKeys: ["flooring.cement_screed", "flooring.primer"],
    formulaNote: "Дебелината на слоя може значително да промени количеството.",
  }),
  rule("flooring", "self_leveling", "area_formula", "medium", 100, 250, {
    standardQuantity: 15,
    includedMaterialKeys: ["flooring.self_leveling", "flooring.primer"],
  }),

  // Климатици
  rule("heating_cooling", "installation", "linear_formula", "medium", 50, 180, {
    standardQuantity: 1,
    includedMaterialKeys: ["heating_cooling.pipe_route", "heating_cooling.brackets", "heating_cooling.drain_hose", "heating_cooling.cable", "heating_cooling.fasteners"],
    excludedMaterialKeys: ["main_product.air_conditioner"],
    uiNote: "Климатикът не е включен по подразбиране.",
  }),
  rule("heating_cooling", "removal", "fixed_kit", "high", 0, 20),
  rule("heating_cooling", "maintenance", "fixed_kit", "high", 0, 30),
  rule("heating_cooling", "repair", "inspection_required", "inspection_required", 20, 250, {
    excludedMaterialKeys: ["main_product.expensive_parts"],
  }),
  rule("heating_cooling", "relocation", "package_formula", "medium", 80, 250, {
    includedMaterialKeys: ["heating_cooling.pipe_route", "heating_cooling.brackets", "heating_cooling.drain_hose", "heating_cooling.cable"],
  }),
  rule("heating_cooling", "heating", "inspection_required", "inspection_required", 20, 200),

  // Врати и дограма
  rule("windows_doors", "interior_door", "fixed_kit", "medium", 20, 80, {
    includedMaterialKeys: ["windows_doors.foam", "windows_doors.anchors", "windows_doors.trim"],
    excludedMaterialKeys: ["main_product.door"],
  }),
  rule("windows_doors", "entrance_door", "fixed_kit", "medium", 30, 150, {
    includedMaterialKeys: ["windows_doors.foam", "windows_doors.anchors", "windows_doors.silicone"],
    excludedMaterialKeys: ["main_product.door"],
  }),
  rule("windows_doors", "adjustment", "fixed_kit", "high", 0, 20, {
    includedMaterialKeys: ["windows_doors.seals", "windows_doors.hinges"],
  }),
  rule("windows_doors", "silicone", "linear_formula", "high", 10, 40, {
    includedMaterialKeys: ["windows_doors.silicone", "windows_doors.acrylic"],
  }),
  rule("windows_doors", "hardware", "item_formula", "medium", 20, 150, {
    includedMaterialKeys: ["windows_doors.lock", "windows_doors.hinges", "windows_doors.handles", "windows_doors.hardware"],
  }),
  rule("windows_doors", "joinery", "inspection_required", "inspection_required", 30, 250, {
    excludedMaterialKeys: ["main_product.joinery", "main_product.glazing"],
    uiNote: "Новата дограма и стъклопакетът не са включени.",
  }),

  // Мебели и монтаж
  rule("furniture_mounting", "furniture_assembly", "fixed_kit", "high", 0, 30, {
    includedMaterialKeys: ["furniture_mounting.fasteners"],
    excludedMaterialKeys: ["main_product.furniture"],
  }),
  rule("furniture_mounting", "kitchen_installation", "package_formula", "medium", 50, 250, {
    includedMaterialKeys: ["furniture_mounting.fasteners", "furniture_mounting.brackets", "furniture_mounting.silicone"],
    excludedMaterialKeys: ["main_product.kitchen", "main_product.appliances"],
  }),
  rule("furniture_mounting", "cabinets", "fixed_kit", "high", 10, 60, {
    includedMaterialKeys: ["furniture_mounting.fasteners", "furniture_mounting.brackets", "furniture_mounting.hinges"],
  }),
  rule("furniture_mounting", "shelves", "fixed_kit", "high", 10, 40, {
    includedMaterialKeys: ["common.dowels", "common.screws", "furniture_mounting.consoles"],
  }),
  rule("furniture_mounting", "curtain_rods", "fixed_kit", "high", 10, 40, {
    includedMaterialKeys: ["common.dowels", "common.screws", "furniture_mounting.fasteners"],
  }),
  rule("furniture_mounting", "television", "fixed_kit", "high", 10, 60, {
    includedMaterialKeys: ["furniture_mounting.anchors", "common.dowels", "electro.cable_channel"],
    excludedMaterialKeys: ["main_product.television", "main_product.tv_bracket"],
  }),

  // Покриви
  rule("roof_waterproofing", "roof_leak", "inspection_required", "inspection_required", 50, 250, {
    includedMaterialKeys: ["roof_waterproofing.sealant", "roof_waterproofing.roof_membrane"],
    uiNote: "Реалната цена се уточнява след оглед.",
  }),
  rule("roof_waterproofing", "gutters", "linear_formula", "medium", 80, 350, {
    standardQuantity: 20,
    includedMaterialKeys: ["roof_waterproofing.gutters", "roof_waterproofing.downpipes", "common.fasteners"],
  }),
  rule("roof_waterproofing", "tiles", "area_formula", "medium", null, null, {
    standardQuantity: 20,
    materialsEstimateMin: 150,
    materialsEstimateMax: 500,
    materialIncludesProduct: true,
    includedMaterialKeys: ["roof_waterproofing.roof_tiles", "roof_waterproofing.ridge_tiles", "roof_waterproofing.roof_membrane", "roof_waterproofing.battens"],
  }),
  rule("roof_waterproofing", "terrace", "area_formula", "medium", 200, 600, {
    standardQuantity: 20,
    includedMaterialKeys: ["roof_waterproofing.liquid_waterproofing", "roof_waterproofing.primer", "roof_waterproofing.drainage"],
  }),
  rule("roof_waterproofing", "waterproofing", "area_formula", "medium", 250, 700, {
    standardQuantity: 20,
    includedMaterialKeys: ["roof_waterproofing.bitumen_membrane", "roof_waterproofing.liquid_waterproofing", "roof_waterproofing.primer", "roof_waterproofing.funnels"],
  }),
  rule("roof_waterproofing", "partial_repair", "inspection_required", "inspection_required", 100, 400),

  // Къртене, транспорт и почистване
  rule("demolition_cleanup", "dismantling", "logistics_formula", "medium", 10, 40, {
    includedMaterialKeys: ["common.bags", "common.protective_consumables"],
  }),
  rule("demolition_cleanup", "tile_demolition", "logistics_formula", "medium", 10, 50, {
    includedMaterialKeys: ["common.bags", "common.transport"],
  }),
  rule("demolition_cleanup", "demolition", "inspection_required", "inspection_required", 10, 70, {
    includedMaterialKeys: ["common.bags", "common.protective_consumables"],
  }),
  rule("demolition_cleanup", "transport", "logistics_formula", "medium", 40, 120, {
    includedMaterialKeys: ["common.transport", "common.container", "common.landfill_fee"],
  }),
  rule("demolition_cleanup", "construction_waste", "logistics_formula", "medium", 50, 150, {
    includedMaterialKeys: ["common.bags", "common.transport", "common.landfill_fee"],
  }),
  rule("demolition_cleanup", "cleaning", "fixed_kit", "high", 5, 30, {
    includedMaterialKeys: ["common.cleaning_consumables", "common.bags"],
  }),

  // Цялостен ремонт
  rule("full_renovation", "apartment_turnkey", "package_formula", "inspection_required", null, null, {
    standardQuantity: 40,
    scaleWithScope: true,
    materialsEstimateMin: 4500,
    materialsEstimateMax: 9000,
    materialIncludesProduct: true,
    uiNote: "Материалите са широк проектен ориентир и изискват оглед.",
  }),
  rule("full_renovation", "house_turnkey", "package_formula", "inspection_required", null, null, {
    standardQuantity: 40,
    scaleWithScope: true,
    materialsEstimateMin: 5500,
    materialsEstimateMax: 12000,
    materialIncludesProduct: true,
  }),
  rule("full_renovation", "finishing", "package_formula", "inspection_required", null, null, {
    standardQuantity: 40,
    scaleWithScope: true,
    materialsEstimateMin: 2500,
    materialsEstimateMax: 6000,
    materialIncludesProduct: true,
  }),
  rule("full_renovation", "crew_management", "package_formula", "medium", 0, 300),
  rule("full_renovation", "electrical", "package_formula", "medium", 500, 1500),
  rule("full_renovation", "plumbing", "package_formula", "medium", 500, 1800),
  rule("full_renovation", "bathroom", "package_formula", "medium", 900, 1800),
  rule("full_renovation", "floors", "area_formula", "medium", null, null, {
    standardQuantity: 40,
    materialsEstimateMin: 1000,
    materialsEstimateMax: 4000,
    materialIncludesProduct: true,
  }),

  // Дребни домашни ремонти
  rule("small_repairs", "small_fixes", "fixed_kit", "high", 5, 40, {
    includedMaterialKeys: ["common.screws", "common.dowels", "common.mounting_adhesive"],
  }),
  rule("small_repairs", "small_installations", "fixed_kit", "high", 10, 60, {
    includedMaterialKeys: ["common.dowels", "common.screws", "common.anchors", "common.fasteners"],
  }),
  rule("small_repairs", "adjustments", "fixed_kit", "high", 0, 25),
  rule("small_repairs", "home_emergency", "inspection_required", "inspection_required", 10, 80),
  rule("small_repairs", "hanging_installation", "fixed_kit", "high", 10, 60, {
    includedMaterialKeys: ["common.dowels", "common.screws", "common.anchors", "common.fasteners"],
  }),
  rule("small_repairs", "other", "inspection_required", "inspection_required", 0, 80),
];

const RULES_BY_KEY = new Map(MATERIAL_QUANTITY_RULES.map((item) => [item.key, item]));

export function getMaterialQuantityRule(categoryKey, activityKey) {
  return RULES_BY_KEY.get(`${categoryKey}.${activityKey}`) || null;
}
