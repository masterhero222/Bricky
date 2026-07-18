ALTER TABLE repair_requests
  MODIFY status enum(
    'draft',
    'pending_admin',
    'published',
    'applied',
    'assigned',
    'worker_selected',
    'worker_confirmed',
    'worker_on_site',
    'inspected',
    'in_progress',
    'work_finished',
    'ready_for_client_confirmation',
    'client_confirmed',
    'reviewed',
    'completed',
    'canceled',
    'archived'
  ) NOT NULL DEFAULT 'pending_admin';
