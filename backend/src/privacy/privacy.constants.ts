export const TERMS_VERSION = '2026-09-01';
export const PRIVACY_VERSION = '2026-09-01';

export const PRIVACY_REQUEST_TYPES = [
  'access',
  'rectification',
  'erasure',
  'restriction',
  'objection',
] as const;

export const PRIVACY_REQUEST_STATUSES = [
  'submitted',
  'in_review',
  'completed',
  'rejected',
] as const;

export type PrivacyRequestType = (typeof PRIVACY_REQUEST_TYPES)[number];
export type PrivacyRequestStatus = (typeof PRIVACY_REQUEST_STATUSES)[number];
