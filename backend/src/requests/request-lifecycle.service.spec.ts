import { BadRequestException } from '@nestjs/common';
import { REQUEST_LIFECYCLE_ACTIONS, REQUEST_LIFECYCLE_STATES } from './request-lifecycle';
import { RequestLifecycleService } from './request-lifecycle.service';

describe('RequestLifecycleService', () => {
  const service = new RequestLifecycleService();

  it.each([
    ['pending_admin', 'pending_review'],
    ['published', 'approved'],
    ['applied', 'approved'],
    ['worker_selected', 'assigned'],
    ['worker_confirmed', 'assigned'],
    ['worker_on_site', 'worker_arrived'],
    ['inspected', 'worker_arrived'],
    ['work_finished', 'waiting_client_confirmation'],
    ['ready_for_client_confirmation', 'waiting_client_confirmation'],
    ['client_confirmed', 'client_confirmed'],
    ['reviewed', 'reviewed'],
    ['archived', 'hidden'],
    ['завършена', 'completed'],
  ])('normalizes %s to %s', (current, expected) => {
    expect(service.normalize(current)).toBe(expected);
  });

  it('allows the happy path transitions', () => {
    expect(service.transition(REQUEST_LIFECYCLE_STATES.PENDING_REVIEW, REQUEST_LIFECYCLE_ACTIONS.APPROVE)).toBe('approved');
    expect(service.transition(REQUEST_LIFECYCLE_STATES.APPROVED, REQUEST_LIFECYCLE_ACTIONS.APPLY)).toBe('approved');
    expect(service.transition(REQUEST_LIFECYCLE_STATES.APPROVED, REQUEST_LIFECYCLE_ACTIONS.WITHDRAW_APPLICATION)).toBe('approved');
    expect(service.transition(REQUEST_LIFECYCLE_STATES.APPROVED, REQUEST_LIFECYCLE_ACTIONS.ASSIGN)).toBe('assigned');
    expect(service.transition(REQUEST_LIFECYCLE_STATES.ASSIGNED, REQUEST_LIFECYCLE_ACTIONS.UNASSIGN)).toBe('approved');
    expect(service.transition(REQUEST_LIFECYCLE_STATES.ASSIGNED, REQUEST_LIFECYCLE_ACTIONS.MARK_ARRIVED)).toBe('worker_arrived');
    expect(service.transition(REQUEST_LIFECYCLE_STATES.WORKER_ARRIVED, REQUEST_LIFECYCLE_ACTIONS.UNASSIGN)).toBe('approved');
    expect(service.transition(REQUEST_LIFECYCLE_STATES.WORKER_ARRIVED, REQUEST_LIFECYCLE_ACTIONS.START_WORK)).toBe('in_progress');
    expect(service.transition(REQUEST_LIFECYCLE_STATES.IN_PROGRESS, REQUEST_LIFECYCLE_ACTIONS.MARK_READY)).toBe('waiting_client_confirmation');
    expect(service.transition(REQUEST_LIFECYCLE_STATES.WAITING_CLIENT_CONFIRMATION, REQUEST_LIFECYCLE_ACTIONS.CONFIRM_COMPLETION)).toBe('client_confirmed');
    expect(service.transition(REQUEST_LIFECYCLE_STATES.CLIENT_CONFIRMED, REQUEST_LIFECYCLE_ACTIONS.LEAVE_REVIEW)).toBe('reviewed');
    expect(service.transition(REQUEST_LIFECYCLE_STATES.REVIEWED, REQUEST_LIFECYCLE_ACTIONS.CLOSE)).toBe('completed');
  });

  it('blocks invalid jumps', () => {
    expect(() => service.transition(REQUEST_LIFECYCLE_STATES.APPROVED, REQUEST_LIFECYCLE_ACTIONS.CONFIRM_COMPLETION)).toThrow(
      BadRequestException,
    );
  });

  it('marks completed and hidden as terminal', () => {
    expect(service.isTerminal('completed')).toBe(true);
    expect(service.isTerminal('hidden')).toBe(true);
    expect(service.isTerminal('approved')).toBe(false);
  });

  it('exposes next actor and allowed actions for frontend DTOs', () => {
    expect(service.nextActor('waiting_client_confirmation')).toBe('client');
    expect(service.allowedActions('waiting_client_confirmation')).toEqual(['confirm_completion', 'dispute', 'hide']);
    expect(service.label('waiting_client_confirmation')).toBe('Чака потвърждение от клиента');
    expect(service.nextActor('client_confirmed')).toBe('client');
    expect(service.allowedActions('client_confirmed')).toEqual(['leave_review', 'dispute', 'hide']);
    expect(service.nextActor('reviewed')).toBe('worker');
    expect(service.allowedActions('reviewed')).toEqual(['close', 'hide']);
  });
});
