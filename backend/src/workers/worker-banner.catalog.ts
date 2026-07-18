import { RepairCategoryKey } from '../requests/repair-catalog';

export const DEFAULT_WORKER_BANNER_KEY = 'blueprint_general_v1';

export type WorkerBannerPolicy = {
  key: string;
  categoryKeys: RepairCategoryKey[];
};

export const WORKER_BANNER_POLICIES: readonly WorkerBannerPolicy[] = Object.freeze([
  { key: 'blueprint_general_v1', categoryKeys: [] },
  { key: 'blueprint_plumbing_v1', categoryKeys: ['vik'] },
  { key: 'blueprint_electrical_v1', categoryKeys: ['electro'] },
  { key: 'blueprint_painting_v1', categoryKeys: ['painting'] },
  { key: 'blueprint_plaster_v1', categoryKeys: ['plaster'] },
  { key: 'blueprint_tiles_v1', categoryKeys: ['tiles'] },
  { key: 'blueprint_bathroom_v1', categoryKeys: ['bathroom_renovation'] },
  { key: 'blueprint_drywall_v1', categoryKeys: ['drywall'] },
  { key: 'blueprint_flooring_v1', categoryKeys: ['flooring'] },
  { key: 'blueprint_hvac_v1', categoryKeys: ['heating_cooling'] },
  { key: 'blueprint_windows_doors_v1', categoryKeys: ['windows_doors'] },
  { key: 'blueprint_furniture_v1', categoryKeys: ['furniture_mounting'] },
  { key: 'blueprint_roofing_v1', categoryKeys: ['roof_waterproofing'] },
  { key: 'blueprint_demolition_v1', categoryKeys: ['demolition_cleanup'] },
  { key: 'blueprint_full_renovation_v1', categoryKeys: ['full_renovation'] },
  { key: 'blueprint_handyman_v1', categoryKeys: ['small_repairs'] },
]);

export const WORKER_BANNER_POLICY_BY_KEY = Object.freeze(
  WORKER_BANNER_POLICIES.reduce(
    (acc, policy) => {
      acc[policy.key] = policy;
      return acc;
    },
    {} as Record<string, WorkerBannerPolicy>,
  ),
);

export function resolveWorkerBannerKey(key: any): string {
  const raw = String(key || '').trim();
  return WORKER_BANNER_POLICY_BY_KEY[raw] ? raw : DEFAULT_WORKER_BANNER_KEY;
}

export function isWorkerBannerAllowed(key: string, categoryKeys: string[] = []): boolean {
  const policy = WORKER_BANNER_POLICY_BY_KEY[key];
  if (!policy) return false;
  if (!policy.categoryKeys.length) return true;

  const offered = new Set(categoryKeys.map((categoryKey) => String(categoryKey || '').trim()));
  return policy.categoryKeys.some((categoryKey) => offered.has(categoryKey));
}
