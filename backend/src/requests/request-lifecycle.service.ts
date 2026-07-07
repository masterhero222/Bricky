import { BadRequestException, Injectable } from '@nestjs/common';
import { RequestEntity } from './entities/request.entity';
import {
  CLOSED_REQUEST_STATUSES,
  LEGACY_STATUS_BY_KEY,
  normalizeRequestStatus,
  REQUEST_STATUSES,
  RequestStatus,
} from './request-lifecycle';

const ALLOWED_TRANSITIONS: Record<RequestStatus, ReadonlySet<RequestStatus>> = {
  approved: new Set([REQUEST_STATUSES.ASSIGNED]),
  assigned: new Set([REQUEST_STATUSES.OPEN, REQUEST_STATUSES.WORKER_ARRIVED]),
  worker_arrived: new Set([REQUEST_STATUSES.IN_PROGRESS]),
  in_progress: new Set([REQUEST_STATUSES.WAITING_CLIENT_CONFIRMATION]),
  waiting_client_confirmation: new Set([REQUEST_STATUSES.CLIENT_CONFIRMED, REQUEST_STATUSES.DISPUTED]),
  client_confirmed: new Set([REQUEST_STATUSES.COMPLETED]),
  completed: new Set(),
  disputed: new Set(),
  canceled: new Set(),
};

@Injectable()
export class RequestLifecycleService {
  current(request: Pick<RequestEntity, 'statusKey' | 'status'>): RequestStatus {
    return normalizeRequestStatus(request.statusKey, request.status);
  }

  transition(request: RequestEntity, next: RequestStatus) {
    const current = this.current(request);
    if (!ALLOWED_TRANSITIONS[current].has(next)) {
      throw new BadRequestException(`Invalid request transition from ${current} to ${next}`);
    }
    request.statusKey = next;
    request.status = LEGACY_STATUS_BY_KEY[next];
  }

  assertCurrent(request: RequestEntity, expected: RequestStatus) {
    const current = this.current(request);
    if (current !== expected) throw new BadRequestException(`Invalid request transition from ${current} (expected ${expected})`);
  }

  isClosed(request: RequestEntity) {
    return CLOSED_REQUEST_STATUSES.has(this.current(request));
  }
}
