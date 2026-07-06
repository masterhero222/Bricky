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

export const CLOSED_REQUEST_STATUSES = new Set<RequestStatus>([
  REQUEST_STATUSES.COMPLETED,
  REQUEST_STATUSES.CANCELED,
]);
