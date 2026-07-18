export const REQUEST_LIFECYCLE_STATES = {
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  ASSIGNED: 'assigned',
  WORKER_ARRIVED: 'worker_arrived',
  IN_PROGRESS: 'in_progress',
  WAITING_CLIENT_CONFIRMATION: 'waiting_client_confirmation',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  DISPUTED: 'disputed',
  CANCELED: 'canceled',
  HIDDEN: 'hidden',
} as const;

export type RequestLifecycleState = (typeof REQUEST_LIFECYCLE_STATES)[keyof typeof REQUEST_LIFECYCLE_STATES];

export const REQUEST_LIFECYCLE_ACTIONS = {
  APPROVE: 'approve',
  REJECT: 'reject',
  RESUBMIT: 'resubmit',
  ASSIGN: 'assign',
  MARK_ARRIVED: 'mark_arrived',
  START_WORK: 'start_work',
  MARK_READY: 'mark_ready',
  CONFIRM_COMPLETION: 'confirm_completion',
  DISPUTE: 'dispute',
  CANCEL: 'cancel',
  HIDE: 'hide',
} as const;

export type RequestLifecycleAction = (typeof REQUEST_LIFECYCLE_ACTIONS)[keyof typeof REQUEST_LIFECYCLE_ACTIONS];

export const REQUEST_LIFECYCLE_LABELS: Record<RequestLifecycleState, string> = {
  pending_review: 'Чака одобрение',
  approved: 'Одобрена',
  assigned: 'Избран майстор',
  worker_arrived: 'Майсторът е на адреса',
  in_progress: 'В процес',
  waiting_client_confirmation: 'Чака потвърждение от клиента',
  completed: 'Завършена',
  rejected: 'Отхвърлена',
  disputed: 'Оспорена',
  canceled: 'Отказана',
  hidden: 'Скрита',
};

export const REQUEST_LIFECYCLE_NEXT_ACTOR: Record<RequestLifecycleState, 'admin' | 'client' | 'worker' | null> = {
  pending_review: 'admin',
  approved: 'worker',
  assigned: 'worker',
  worker_arrived: 'worker',
  in_progress: 'worker',
  waiting_client_confirmation: 'client',
  completed: null,
  rejected: 'client',
  disputed: 'admin',
  canceled: null,
  hidden: null,
};

export const REQUEST_LIFECYCLE_COMPAT_STATUS: Record<string, RequestLifecycleState> = {
  draft: REQUEST_LIFECYCLE_STATES.PENDING_REVIEW,
  pending_admin: REQUEST_LIFECYCLE_STATES.PENDING_REVIEW,
  pending_review: REQUEST_LIFECYCLE_STATES.PENDING_REVIEW,
  published: REQUEST_LIFECYCLE_STATES.APPROVED,
  approved: REQUEST_LIFECYCLE_STATES.APPROVED,
  applied: REQUEST_LIFECYCLE_STATES.APPROVED,
  worker_selected: REQUEST_LIFECYCLE_STATES.ASSIGNED,
  assigned: REQUEST_LIFECYCLE_STATES.ASSIGNED,
  worker_confirmed: REQUEST_LIFECYCLE_STATES.ASSIGNED,
  worker_on_site: REQUEST_LIFECYCLE_STATES.WORKER_ARRIVED,
  inspected: REQUEST_LIFECYCLE_STATES.WORKER_ARRIVED,
  worker_arrived: REQUEST_LIFECYCLE_STATES.WORKER_ARRIVED,
  in_progress: REQUEST_LIFECYCLE_STATES.IN_PROGRESS,
  work_finished: REQUEST_LIFECYCLE_STATES.WAITING_CLIENT_CONFIRMATION,
  ready_for_client_confirmation: REQUEST_LIFECYCLE_STATES.WAITING_CLIENT_CONFIRMATION,
  waiting_client_confirmation: REQUEST_LIFECYCLE_STATES.WAITING_CLIENT_CONFIRMATION,
  client_confirmed: REQUEST_LIFECYCLE_STATES.COMPLETED,
  reviewed: REQUEST_LIFECYCLE_STATES.COMPLETED,
  completed: REQUEST_LIFECYCLE_STATES.COMPLETED,
  rejected: REQUEST_LIFECYCLE_STATES.REJECTED,
  disputed: REQUEST_LIFECYCLE_STATES.DISPUTED,
  canceled: REQUEST_LIFECYCLE_STATES.CANCELED,
  archived: REQUEST_LIFECYCLE_STATES.HIDDEN,
  hidden: REQUEST_LIFECYCLE_STATES.HIDDEN,
  нова: REQUEST_LIFECYCLE_STATES.APPROVED,
  кандидатствана: REQUEST_LIFECYCLE_STATES.APPROVED,
  назначена: REQUEST_LIFECYCLE_STATES.ASSIGNED,
  'в процес': REQUEST_LIFECYCLE_STATES.IN_PROGRESS,
  завършена: REQUEST_LIFECYCLE_STATES.COMPLETED,
  отказана: REQUEST_LIFECYCLE_STATES.CANCELED,
};

export const REQUEST_LIFECYCLE_TRANSITIONS: Record<RequestLifecycleState, Partial<Record<RequestLifecycleAction, RequestLifecycleState>>> = {
  pending_review: {
    approve: REQUEST_LIFECYCLE_STATES.APPROVED,
    reject: REQUEST_LIFECYCLE_STATES.REJECTED,
    hide: REQUEST_LIFECYCLE_STATES.HIDDEN,
  },
  approved: {
    assign: REQUEST_LIFECYCLE_STATES.ASSIGNED,
    cancel: REQUEST_LIFECYCLE_STATES.CANCELED,
    hide: REQUEST_LIFECYCLE_STATES.HIDDEN,
  },
  assigned: {
    mark_arrived: REQUEST_LIFECYCLE_STATES.WORKER_ARRIVED,
    cancel: REQUEST_LIFECYCLE_STATES.CANCELED,
    hide: REQUEST_LIFECYCLE_STATES.HIDDEN,
  },
  worker_arrived: {
    start_work: REQUEST_LIFECYCLE_STATES.IN_PROGRESS,
    cancel: REQUEST_LIFECYCLE_STATES.CANCELED,
    hide: REQUEST_LIFECYCLE_STATES.HIDDEN,
  },
  in_progress: {
    mark_ready: REQUEST_LIFECYCLE_STATES.WAITING_CLIENT_CONFIRMATION,
    cancel: REQUEST_LIFECYCLE_STATES.CANCELED,
    hide: REQUEST_LIFECYCLE_STATES.HIDDEN,
  },
  waiting_client_confirmation: {
    confirm_completion: REQUEST_LIFECYCLE_STATES.COMPLETED,
    dispute: REQUEST_LIFECYCLE_STATES.DISPUTED,
    hide: REQUEST_LIFECYCLE_STATES.HIDDEN,
  },
  completed: {},
  rejected: {
    resubmit: REQUEST_LIFECYCLE_STATES.PENDING_REVIEW,
    hide: REQUEST_LIFECYCLE_STATES.HIDDEN,
  },
  disputed: {
    hide: REQUEST_LIFECYCLE_STATES.HIDDEN,
  },
  canceled: {},
  hidden: {},
};

export const REQUEST_LIFECYCLE_TERMINAL_STATES = new Set<RequestLifecycleState>([
  REQUEST_LIFECYCLE_STATES.COMPLETED,
  REQUEST_LIFECYCLE_STATES.CANCELED,
  REQUEST_LIFECYCLE_STATES.HIDDEN,
]);
