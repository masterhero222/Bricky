export const REQUEST_STATUSES = {
  OPEN: 'approved',
  ASSIGNED: 'assigned',
  WORKER_ARRIVED: 'worker_arrived',
  IN_PROGRESS: 'in_progress',
  WAITING_CLIENT_CONFIRMATION: 'waiting_client_confirmation',
  CLIENT_CONFIRMED: 'client_confirmed',
  COMPLETED: 'completed',
  DISPUTED: 'disputed',
  CANCELED: 'canceled',
} as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[keyof typeof REQUEST_STATUSES];

export const LEGACY_STATUS_BY_KEY: Record<RequestStatus, string> = {
  approved: 'нова',
  assigned: 'назначена',
  worker_arrived: 'в процес',
  in_progress: 'в процес',
  waiting_client_confirmation: 'в процес',
  client_confirmed: 'в процес',
  completed: 'завършена',
  disputed: 'в процес',
  canceled: 'отказана',
};

export function normalizeRequestStatus(statusKey?: string | null, legacyStatus?: string | null): RequestStatus {
  if (Object.values(REQUEST_STATUSES).includes(statusKey as RequestStatus)) return statusKey as RequestStatus;
  const legacy = String(legacyStatus || '').trim().toLowerCase();
  if (Object.values(REQUEST_STATUSES).includes(legacy as RequestStatus)) return legacy as RequestStatus;
  if (legacy === 'назначена') return REQUEST_STATUSES.ASSIGNED;
  if (legacy === 'в процес') return REQUEST_STATUSES.IN_PROGRESS;
  if (legacy === 'завършена') return REQUEST_STATUSES.COMPLETED;
  if (legacy === 'отказана') return REQUEST_STATUSES.CANCELED;
  return REQUEST_STATUSES.OPEN;
}

export const CLOSED_REQUEST_STATUSES = new Set<RequestStatus>([
  REQUEST_STATUSES.COMPLETED,
  REQUEST_STATUSES.CANCELED,
]);
