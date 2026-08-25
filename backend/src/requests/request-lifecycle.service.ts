import { BadRequestException, Injectable } from '@nestjs/common';
import {
  REQUEST_LIFECYCLE_ACTIONS,
  REQUEST_LIFECYCLE_COMPAT_STATUS,
  REQUEST_LIFECYCLE_LABELS,
  REQUEST_LIFECYCLE_NEXT_ACTOR,
  REQUEST_LIFECYCLE_STATES,
  REQUEST_LIFECYCLE_TERMINAL_STATES,
  REQUEST_LIFECYCLE_TRANSITIONS,
  RequestLifecycleAction,
  RequestLifecycleState,
} from './request-lifecycle';

export type RequestLifecycleSnapshot = {
  status?: string | null;
  statusKey?: string | null;
};

@Injectable()
export class RequestLifecycleService {
  normalize(input: string | RequestLifecycleSnapshot | null | undefined): RequestLifecycleState {
    const raw =
      typeof input === 'string'
        ? input
        : input?.statusKey || input?.status || REQUEST_LIFECYCLE_STATES.PENDING_REVIEW;
    const key = String(raw || '').trim().toLowerCase();
    return REQUEST_LIFECYCLE_COMPAT_STATUS[key] || REQUEST_LIFECYCLE_STATES.PENDING_REVIEW;
  }

  label(input: string | RequestLifecycleSnapshot | null | undefined) {
    return REQUEST_LIFECYCLE_LABELS[this.normalize(input)];
  }

  nextActor(input: string | RequestLifecycleSnapshot | null | undefined) {
    return REQUEST_LIFECYCLE_NEXT_ACTOR[this.normalize(input)];
  }

  allowedActions(input: string | RequestLifecycleSnapshot | null | undefined): RequestLifecycleAction[] {
    const state = this.normalize(input);
    return Object.keys(REQUEST_LIFECYCLE_TRANSITIONS[state]) as RequestLifecycleAction[];
  }

  can(input: string | RequestLifecycleSnapshot | null | undefined, action: RequestLifecycleAction) {
    const state = this.normalize(input);
    return Boolean(REQUEST_LIFECYCLE_TRANSITIONS[state][action]);
  }

  transition(input: string | RequestLifecycleSnapshot | null | undefined, action: RequestLifecycleAction) {
    const state = this.normalize(input);
    const next = REQUEST_LIFECYCLE_TRANSITIONS[state][action];
    if (!next) throw new BadRequestException(`Invalid request transition: ${state} -> ${action}`);
    return next;
  }

  assertTransition(input: string | RequestLifecycleSnapshot | null | undefined, action: RequestLifecycleAction) {
    return this.transition(input, action);
  }

  isTerminal(input: string | RequestLifecycleSnapshot | null | undefined) {
    return REQUEST_LIFECYCLE_TERMINAL_STATES.has(this.normalize(input));
  }

  isVisibleToWorkers(input: string | RequestLifecycleSnapshot | null | undefined) {
    return this.normalize(input) === REQUEST_LIFECYCLE_STATES.APPROVED;
  }

  actionForCompatibilityEndpoint(endpoint: string): RequestLifecycleAction | null {
    const map: Record<string, RequestLifecycleAction> = {
      'worker-confirm': REQUEST_LIFECYCLE_ACTIONS.MARK_ARRIVED,
      'on-site': REQUEST_LIFECYCLE_ACTIONS.MARK_ARRIVED,
      inspect: REQUEST_LIFECYCLE_ACTIONS.START_WORK,
      start: REQUEST_LIFECYCLE_ACTIONS.START_WORK,
      finish: REQUEST_LIFECYCLE_ACTIONS.MARK_READY,
      ready: REQUEST_LIFECYCLE_ACTIONS.MARK_READY,
      'client-confirm': REQUEST_LIFECYCLE_ACTIONS.CONFIRM_COMPLETION,
      complete: REQUEST_LIFECYCLE_ACTIONS.CLOSE,
    };
    return map[endpoint] || null;
  }
}
