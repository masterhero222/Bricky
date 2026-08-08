import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { RepairRequestEntity, RepairRequestStatus } from './entities/repair-request.entity';
import { RequestApplicationEntity } from './entities/request-application.entity';
import { RequestEventEntity } from './entities/request-event.entity';
import { RequestPricingSnapshotEntity } from './entities/request-pricing-snapshot.entity';
import { CreateRequestDto } from './dto/create-request.dto';
import {
  REPAIR_CATEGORY_BY_KEY,
  REPAIR_CATEGORY_KEYS,
  RepairCategoryKey,
  getRepairCategoryByLabel,
  normalizeRepairCategoryKey,
} from './repair-catalog';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MediaService } from '../media/media.service';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { UserEntity } from '../users/user.entity';
import { WorkerProfileEntity } from '../workers/worker-profile.entity';
import { ClientProfileEntity } from '../users/client-profile.entity';
import {
  REQUEST_LIFECYCLE_ACTIONS,
  REQUEST_LIFECYCLE_STATES,
  RequestLifecycleAction,
  RequestLifecycleState,
} from './request-lifecycle';
import { RequestLifecycleService } from './request-lifecycle.service';
import { ReferralsService } from '../referrals/referrals.service';

type RequestDtoOptions = {
  includeUnapprovedMedia?: boolean;
  viewerRole?: 'client' | 'worker' | 'admin' | 'super_admin';
  viewerUserId?: number;
};

function extractResponseText(data: any): string {
  if (typeof data?.output_text === 'string') return data.output_text;

  const chunks = Array.isArray(data?.output) ? data.output : [];
  for (const item of chunks) {
    const content = Array.isArray(item?.content) ? item.content : [];
    const text = content.find((part: any) => typeof part?.text === 'string')?.text;
    if (text) return text;
  }

  return '';
}

function completionDurationDays(createdAt: any, completedAt: Date): number {
  const start = new Date(createdAt || completedAt).getTime();
  const end = completedAt.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 1;
  return Math.max(1, Math.ceil((end - start) / (24 * 60 * 60 * 1000)));
}

function normalizePhotos(arr: any): any[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((photo) => photo && typeof photo.url === 'string' && photo.url)
    .map((photo, index) => ({
      id: photo.id || `${Date.now()}-${index}`,
      name: photo.name || 'Снимка',
      url: photo.url,
      storageKey: photo.storageKey || photo.url,
      mimeType: photo.mimeType || null,
      sizeBytes: Number.isFinite(Number(photo.sizeBytes)) ? Number(photo.sizeBytes) : null,
      created_at: photo.created_at || new Date().toISOString(),
    }))
    .filter((photo) => !/^data:/i.test(String(photo.url || '').trim()));
}

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(RepairRequestEntity)
    private readonly repairRequestsRepo: Repository<RepairRequestEntity>,
    @InjectRepository(RequestApplicationEntity)
    private readonly applicationsRepo: Repository<RequestApplicationEntity>,
    @InjectRepository(RequestPricingSnapshotEntity)
    private readonly pricingSnapshotsRepo: Repository<RequestPricingSnapshotEntity>,
    @InjectRepository(RequestEventEntity)
    private readonly eventsRepo: Repository<RequestEventEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    @InjectRepository(WorkerProfileEntity)
    private readonly workerProfilesRepo: Repository<WorkerProfileEntity>,
    @InjectRepository(ClientProfileEntity)
    private readonly clientProfilesRepo: Repository<ClientProfileEntity>,
    private readonly mailService: MailService,
    private readonly notifications: NotificationsService,
    private readonly media: MediaService,
    private readonly lifecycle: RequestLifecycleService,
    private readonly referrals: ReferralsService,
  ) {}

  async draftRequest(prompt: string, address?: string) {
    const trimmedPrompt = (prompt || '').trim();
    if (!trimmedPrompt) throw new BadRequestException('Missing prompt');

    const fallback = this.buildLocalDraft(trimmedPrompt, address);
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) return fallback;

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-5.2',
          instructions:
            'You are Bricky AI, a Bulgarian home-repair intake assistant. Return only valid JSON that matches the schema. Do not invent personal data or prices.',
          input: [
            'Convert the customer text into a short repair request draft in Bulgarian.',
            `Choose categoryKey from: ${REPAIR_CATEGORY_KEYS.join(', ')}.`,
            'Ask up to 3 practical follow-up questions only if useful.',
            address ? `Address: ${address.trim()}` : '',
            `Customer text: ${trimmedPrompt}`,
          ]
            .filter(Boolean)
            .join('\n'),
          text: {
            format: {
              type: 'json_schema',
              name: 'bricky_request_draft',
              strict: true,
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  categoryKey: { type: 'string', enum: [...REPAIR_CATEGORY_KEYS] },
                  description: { type: 'string', maxLength: 800 },
                  questions: {
                    type: 'array',
                    maxItems: 3,
                    items: { type: 'string', maxLength: 160 },
                  },
                  confidence: { type: 'number', minimum: 0, maximum: 1 },
                },
                required: ['categoryKey', 'description', 'questions', 'confidence'],
              },
            },
          },
          max_output_tokens: 500,
        }),
      });

      if (!response.ok) return fallback;

      const data = await response.json();
      const parsed = JSON.parse(extractResponseText(data));
      const categoryKey = this.normalizeCategoryKey(parsed?.categoryKey);

      return {
        category: REPAIR_CATEGORY_BY_KEY[categoryKey],
        categoryKey,
        description: this.cleanDescription(parsed?.description, trimmedPrompt),
        questions: Array.isArray(parsed?.questions) ? parsed.questions.slice(0, 3) : [],
        confidence: typeof parsed?.confidence === 'number' ? parsed.confidence : fallback.confidence,
        source: 'openai',
      };
    } catch {
      return fallback;
    }
  }

  async create(dto: CreateRequestDto, clientUserId: number) {
    if (!clientUserId) throw new UnauthorizedException('Not logged in');

    const categoryKey = dto.categoryKey
      ? normalizeRepairCategoryKey(dto.categoryKey)
      : getRepairCategoryByLabel(dto.category).key;

    const request = await this.repairRequestsRepo.save(
      this.repairRequestsRepo.create({
        clientUserId,
        categoryKey,
        title: REPAIR_CATEGORY_BY_KEY[categoryKey],
        description: dto.description || null,
        addressText: dto.address || null,
        latitude: dto.latitude == null ? null : String(dto.latitude),
        longitude: dto.longitude == null ? null : String(dto.longitude),
        locationSource: dto.locationSource || 'manual',
        addressVisibility: 'exact_after_assignment',
        status: 'pending_admin',
        estimateMin: dto.estimateMin == null ? null : String(dto.estimateMin),
        estimateMax: dto.estimateMax == null ? null : String(dto.estimateMax),
        estimateCurrency: dto.estimateCurrency || 'EUR',
        pricingSnapshotId: null,
        assignedWorkerUserId: null,
        completedAt: null,
        clientConfirmedAt: null,
        archivedAt: null,
        archiveReason: null,
        archiveSource: null,
        archivedByUserId: null,
      }),
    );

    const snapshot = await this.pricingSnapshotsRepo.save(
      this.pricingSnapshotsRepo.create({
        requestId: request.id,
        pricingVersion: 'v2-manual',
        currency: request.estimateCurrency,
        categoryKey,
        activityKeysJson: [],
        inputJson: {
          estimateMin: dto.estimateMin ?? null,
          estimateMax: dto.estimateMax ?? null,
        },
        resultJson: {
          estimateMin: dto.estimateMin ?? null,
          estimateMax: dto.estimateMax ?? null,
          currency: request.estimateCurrency,
        },
      }),
    );
    request.pricingSnapshotId = snapshot.id;
    await this.repairRequestsRepo.save(request);

    await this.saveMedia(request.id, clientUserId, 'request_before', dto.photos || [], 'pending');
    await this.addEvent(request.id, clientUserId, 'request.created', { categoryKey });

    return this.toDto(request, {
      includeUnapprovedMedia: true,
      viewerRole: 'client',
      viewerUserId: clientUserId,
    });
  }

  async addBeforeMedia(
    requestId: number,
    clientUserId: number,
    photos: any[],
  ) {
    const request = await this.repairRequestsRepo.findOne({
      where: { id: requestId },
      relations: ['client'],
    });
    if (!request) throw new NotFoundException('Request not found');
    if (Number(request.clientUserId) !== Number(clientUserId)) {
      throw new ForbiddenException('Not your request');
    }
    if (!['draft', 'pending_admin'].includes(request.status)) {
      throw new BadRequestException(
        'Request photos can only be added before admin moderation',
      );
    }

    const normalized = normalizePhotos(photos);
    if (!normalized.length) throw new BadRequestException('No valid images');

    await this.saveMedia(
      requestId,
      clientUserId,
      'request_before',
      normalized,
      'pending',
    );
    await this.addEvent(requestId, clientUserId, 'request.media_uploaded', {
      kind: 'request_before',
      count: normalized.length,
    });

    return this.toDto(request, {
      includeUnapprovedMedia: true,
      viewerRole: 'client',
      viewerUserId: clientUserId,
    });
  }

  async addAfterMedia(
    requestId: number,
    workerUserId: number,
    photos: any[],
  ) {
    const request = await this.repairRequestsRepo.findOne({
      where: { id: requestId },
      relations: ['client'],
    });
    if (!request) throw new NotFoundException('Request not found');
    if (Number(request.assignedWorkerUserId) !== Number(workerUserId)) {
      throw new ForbiddenException('Not your job');
    }
    if (!['in_progress', 'work_finished'].includes(request.status)) {
      throw new BadRequestException(
        'After photos can only be added while finishing the work',
      );
    }

    const normalized = normalizePhotos(photos);
    if (!normalized.length) throw new BadRequestException('No valid images');

    await this.saveMedia(
      requestId,
      workerUserId,
      'request_after',
      normalized,
      'pending',
    );
    await this.addEvent(requestId, workerUserId, 'request.media_uploaded', {
      kind: 'request_after',
      count: normalized.length,
    });

    return this.toDto(request, {
      includeUnapprovedMedia: true,
      viewerRole: 'worker',
      viewerUserId: workerUserId,
    });
  }

  async getByClientUserId(clientUserId: number) {
    if (!clientUserId) throw new BadRequestException('Missing client id');
    const requests = await this.repairRequestsRepo.find({
      where: { clientUserId, archivedAt: IsNull() },
      relations: ['client'],
      order: { createdAt: 'DESC' },
    });
    return Promise.all(
      requests.map((request) =>
        this.toDto(request, {
          includeUnapprovedMedia: true,
          viewerRole: 'client',
          viewerUserId: clientUserId,
        }),
      ),
    );
  }

  async getHistoryByClientUserId(clientUserId: number) {
    if (!clientUserId) throw new BadRequestException('Missing client id');
    const requests = await this.repairRequestsRepo.find({
      where: { clientUserId, archivedAt: Not(IsNull()) },
      relations: ['client'],
      order: { completedAt: 'DESC', id: 'DESC' },
    });
    return Promise.all(
      requests.map((request) =>
        this.toDto(request, {
          includeUnapprovedMedia: true,
          viewerRole: 'client',
          viewerUserId: clientUserId,
        }),
      ),
    );
  }

  async getMapRequests(user: any) {
    const role = String(user?.role || '');
    const userId = Number(user?.id);
    if (!userId) throw new BadRequestException('Missing user id');

    if (role === 'client') return this.getByClientUserId(userId);
    if (role === 'worker') return this.getForWorkersFeed(userId);
    throw new BadRequestException('Unsupported role');
  }

  async getForWorkersFeed(workerUserId: number) {
    if (!workerUserId) throw new BadRequestException('Missing worker id');
    await this.assertWorkerCanTakeJobs(workerUserId);

    const requests = await this.repairRequestsRepo.find({
      where: [
        { assignedWorkerUserId: IsNull(), status: Not('pending_admin'), archivedAt: IsNull() },
        { assignedWorkerUserId: workerUserId, status: Not('completed'), archivedAt: IsNull() },
        { assignedWorkerUserId: workerUserId, status: 'reviewed' },
      ],
      relations: ['client'],
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      requests
        .filter((request) => {
          if (request.archivedAt && request.status !== 'reviewed') return false;
          if (['canceled', 'archived', 'draft', 'pending_admin'].includes(request.status)) return false;
          if (!request.assignedWorkerUserId) return ['published', 'applied'].includes(request.status);
          return Number(request.assignedWorkerUserId) === Number(workerUserId);
        })
        .map((request) =>
          this.toDto(request, {
            includeUnapprovedMedia:
              Number(request.assignedWorkerUserId) === Number(workerUserId),
            viewerRole: 'worker',
            viewerUserId: workerUserId,
          }),
        ),
    );
  }

  async getCompletedForWorker(workerUserId: number) {
    if (!workerUserId) throw new BadRequestException('Missing worker id');
    await this.assertWorkerCanTakeJobs(workerUserId);
    const requests = await this.repairRequestsRepo.find({
      where: { assignedWorkerUserId: workerUserId, status: 'completed', archivedAt: Not(IsNull()) },
      relations: ['client'],
      order: { completedAt: 'DESC', id: 'DESC' },
    });
    return Promise.all(
      requests.map((request) =>
        this.toDto(request, {
          includeUnapprovedMedia: true,
          viewerRole: 'worker',
          viewerUserId: workerUserId,
        }),
      ),
    );
  }

  async applyToRequest(requestId: number, workerUserId: number) {
    await this.assertWorkerCanTakeJobs(workerUserId);

    const req = await this.repairRequestsRepo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!req) throw new NotFoundException('Request not found');
    if (req.assignedWorkerUserId) throw new BadRequestException('Request already has assigned worker');
    this.lifecycle.assertTransition(req.status, REQUEST_LIFECYCLE_ACTIONS.APPLY);

    let application = await this.applicationsRepo.findOne({ where: { requestId, workerUserId } });
    if (application && !['withdrawn', 'rejected'].includes(application.status)) {
      return this.toDto(req, {
        viewerRole: 'worker',
        viewerUserId: workerUserId,
      });
    }

    if (application) {
      application.status = 'applied';
    } else {
      application = this.applicationsRepo.create({
        requestId,
        workerUserId,
        status: 'applied',
        offerMin: null,
        offerMax: null,
        message: null,
      });
    }

    if (req.status === 'published') {
      req.status = 'applied';
    }

    const applicationEvent = this.eventsRepo.create({
      requestId,
      actorUserId: workerUserId,
      eventType: 'application.created',
      metadataJson: {},
    });
    await this.repairRequestsRepo.manager.transaction(async (manager) => {
      await manager.save(application);
      await manager.save(req);
      await manager.save(applicationEvent);
    });

    return this.toDto(req, {
      viewerRole: 'worker',
      viewerUserId: workerUserId,
    });
  }

  async withdrawApplication(requestId: number, workerUserId: number) {
    await this.assertWorkerCanTakeJobs(workerUserId);

    const req = await this.repairRequestsRepo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!req) throw new NotFoundException('Request not found');
    if (['completed', 'canceled', 'archived'].includes(req.status) || req.archivedAt) {
      throw new BadRequestException('Request is closed');
    }
    const isSelectedWorker =
      Number(req.assignedWorkerUserId) === Number(workerUserId) &&
      ['worker_selected', 'assigned'].includes(req.status);
    if (Number(req.assignedWorkerUserId) === Number(workerUserId) && !isSelectedWorker) {
      throw new BadRequestException('Cannot withdraw after confirming the request');
    }
    if (!isSelectedWorker) {
      this.lifecycle.assertTransition(req.status, REQUEST_LIFECYCLE_ACTIONS.WITHDRAW_APPLICATION);
    }

    const application = await this.applicationsRepo.findOne({ where: { requestId, workerUserId } });
    if (!application) throw new NotFoundException('Application not found');
    if (application.status === 'assigned' && !isSelectedWorker) {
      throw new BadRequestException('Cannot withdraw after confirming the request');
    }
    if (['withdrawn', 'rejected'].includes(application.status)) {
      return this.toDto(req, {
        viewerRole: 'worker',
        viewerUserId: workerUserId,
      });
    }

    application.status = 'withdrawn';
    if (isSelectedWorker) req.assignedWorkerUserId = null;

    const allApplications = await this.applicationsRepo.find({ where: { requestId } });
    const nextApplications = allApplications.map((candidate) =>
      Number(candidate.workerUserId) === Number(workerUserId) ? application : candidate,
    );
    req.status = nextApplications.some((app) => !['withdrawn', 'rejected'].includes(app.status))
      ? 'applied'
      : 'published';
    const withdrawalEvent = this.eventsRepo.create({
      requestId,
      actorUserId: workerUserId,
      eventType: isSelectedWorker ? 'worker.declined_selection' : 'application.withdrawn',
      metadataJson: {},
    });
    await this.repairRequestsRepo.manager.transaction(async (manager) => {
      await manager.save(application);
      await manager.save(req);
      await manager.save(withdrawalEvent);
    });
    if (isSelectedWorker) {
      await this.notifySafely(req.clientUserId, {
        type: 'worker_declined_request',
        message: `The selected worker declined request #${requestId}.`,
        requestId,
      });
    }
    return this.toDto(req, {
      viewerRole: 'worker',
      viewerUserId: workerUserId,
    });
  }

  async assignWorker(requestId: number, clientUserId: number, workerUserId: number) {
    const req = await this.repairRequestsRepo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!req) throw new NotFoundException('Request not found');
    if (Number(req.clientUserId) !== Number(clientUserId)) throw new ForbiddenException('Not your request');
    if (['completed', 'canceled', 'archived'].includes(req.status)) throw new BadRequestException('Request is closed');
    await this.assertWorkerCanTakeJobs(workerUserId);
    this.lifecycle.assertTransition(req.status, REQUEST_LIFECYCLE_ACTIONS.ASSIGN);

    const application = await this.applicationsRepo.findOne({ where: { requestId, workerUserId } });
    if (!application || ['withdrawn', 'rejected'].includes(application.status)) {
      throw new BadRequestException('This worker has not applied to this request');
    }

    req.assignedWorkerUserId = workerUserId;
    req.status = 'worker_selected';
    req.completedAt = null;

    const allApplications = await this.applicationsRepo.find({ where: { requestId } });
    allApplications.forEach((candidate) => {
      if (Number(candidate.workerUserId) === Number(workerUserId)) {
        candidate.status = 'assigned';
      }
    });
    const assignmentEvent = this.eventsRepo.create({
      requestId,
      actorUserId: clientUserId,
      eventType: 'request.assigned',
      metadataJson: { workerUserId },
    });

    await this.repairRequestsRepo.manager.transaction(async (manager) => {
      await manager.save(req);
      await manager.save(allApplications);
      await manager.save(assignmentEvent);
    });
    await this.notifySafely(workerUserId, {
      type: 'request_worker_selected',
      message: `You were selected for request #${requestId}. Confirm or decline the request.`,
      requestId,
    });

    return this.toDto(req, {
      viewerRole: 'client',
      viewerUserId: clientUserId,
    });
  }

  async workerConfirm(requestId: number, workerUserId: number) {
    await this.assertWorkerCanTakeJobs(workerUserId);
    const req = await this.repairRequestsRepo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!req) throw new NotFoundException('Request not found');
    if (Number(req.assignedWorkerUserId) !== Number(workerUserId)) throw new ForbiddenException('Not your job');
    if (!['worker_selected', 'assigned'].includes(req.status)) {
      throw new BadRequestException(`Invalid request status transition from ${req.status} to worker_confirmed`);
    }

    const from = req.status;
    req.status = 'worker_confirmed';
    const applications = await this.applicationsRepo.find({ where: { requestId } });
    applications.forEach((candidate) => {
      if (Number(candidate.workerUserId) === Number(workerUserId)) {
        candidate.status = 'assigned';
      } else if (candidate.status !== 'withdrawn') {
        candidate.status = 'rejected';
      }
    });
    const confirmationEvent = this.eventsRepo.create({
      requestId,
      actorUserId: workerUserId,
      eventType: 'worker.confirmed',
      metadataJson: { from, to: 'worker_confirmed' },
    });
    await this.repairRequestsRepo.manager.transaction(async (manager) => {
      await manager.save(req);
      await manager.save(applications);
      await manager.save(confirmationEvent);
    });
    await this.notifySafely(req.clientUserId, {
      type: 'worker_confirmed_request',
      message: `The worker confirmed request #${requestId}.`,
      requestId,
    });
    return this.toDto(req, { viewerRole: 'worker', viewerUserId: workerUserId });
  }

  async markWorkerOnSite(requestId: number, workerUserId: number) {
    return this.workerTransition(
      requestId,
      workerUserId,
      ['worker_confirmed'],
      'worker_on_site',
      'worker.on_site',
      REQUEST_LIFECYCLE_ACTIONS.MARK_ARRIVED,
    );
  }

  async markInspected(requestId: number, workerUserId: number) {
    return this.workerTransition(
      requestId,
      workerUserId,
      ['worker_on_site'],
      'inspected',
      'worker.inspected',
      null,
      REQUEST_LIFECYCLE_STATES.WORKER_ARRIVED,
    );
  }

  async startWork(requestId: number, workerUserId: number) {
    return this.workerTransition(
      requestId,
      workerUserId,
      ['inspected'],
      'in_progress',
      'worker.started_work',
      REQUEST_LIFECYCLE_ACTIONS.START_WORK,
    );
  }

  async finishWork(requestId: number, workerUserId: number, afterPhotos: any[] = []) {
    await this.workerTransition(
      requestId,
      workerUserId,
      ['in_progress'],
      'work_finished',
      'worker.finished_work',
      REQUEST_LIFECYCLE_ACTIONS.MARK_READY,
    );
    await this.saveMedia(requestId, workerUserId, 'request_after', afterPhotos, 'pending');

    const updated = await this.repairRequestsRepo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!updated) throw new NotFoundException('Request not found');
    return this.toDto(updated, {
      includeUnapprovedMedia: true,
      viewerRole: 'worker',
      viewerUserId: workerUserId,
    });
  }

  async readyForClientConfirmation(requestId: number, workerUserId: number) {
    return this.workerTransition(
      requestId,
      workerUserId,
      ['work_finished'],
      'ready_for_client_confirmation',
      'worker.ready_for_client_confirmation',
      null,
      REQUEST_LIFECYCLE_STATES.WAITING_CLIENT_CONFIRMATION,
    );
  }

  async clientConfirmWork(requestId: number, clientUserId: number) {
    const req = await this.repairRequestsRepo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!req) throw new NotFoundException('Request not found');
    if (Number(req.clientUserId) !== Number(clientUserId)) throw new ForbiddenException('Not your request');
    if (['client_confirmed', 'reviewed', 'completed'].includes(req.status) && req.archivedAt) {
      return this.toDto(req, {
        includeUnapprovedMedia: true,
        viewerRole: 'client',
        viewerUserId: clientUserId,
      });
    }
    this.lifecycle.assertTransition(req.status, REQUEST_LIFECYCLE_ACTIONS.CONFIRM_COMPLETION);

    const completedAt = new Date();
    req.status = 'client_confirmed';
    req.clientConfirmedAt = req.clientConfirmedAt || completedAt;
    req.completedAt = req.completedAt || completedAt;
    req.archivedAt = req.archivedAt || completedAt;
    req.archiveReason = req.archiveReason || 'completed';
    req.archiveSource = req.archiveSource || 'system';
    req.archivedByUserId = req.archivedByUserId || clientUserId;
    const completionEvent = this.eventsRepo.create({
      requestId,
      actorUserId: clientUserId,
      eventType: 'client.confirmed_work',
      metadataJson: { archivedAt: req.archivedAt },
    });
    await this.repairRequestsRepo.manager.transaction(async (manager) => {
      await manager.save(req);
      await manager.save(completionEvent);
    });
    return this.toDto(req, {
      includeUnapprovedMedia: true,
      viewerRole: 'client',
      viewerUserId: clientUserId,
    });
  }

  async unassignWorker(requestId: number, clientUserId: number) {
    const req = await this.repairRequestsRepo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!req) throw new NotFoundException('Request not found');
    if (Number(req.clientUserId) !== Number(clientUserId)) throw new ForbiddenException('Not your request');
    if (!['worker_selected', 'assigned'].includes(req.status)) {
      throw new BadRequestException('The request is locked after worker confirmation');
    }
    if (!req.assignedWorkerUserId) throw new BadRequestException('No assigned worker');

    const assignedWorkerUserId = Number(req.assignedWorkerUserId);
    req.assignedWorkerUserId = null;

    const activeApplications = await this.applicationsRepo.find({ where: { requestId } });
    req.status = activeApplications.some((app) => !['withdrawn', 'rejected'].includes(app.status)) ? 'applied' : 'published';
    const application = activeApplications.find(
      (candidate) => Number(candidate.workerUserId) === assignedWorkerUserId,
    );
    if (application?.status === 'assigned') application.status = 'applied';
    const unassignmentEvent = this.eventsRepo.create({
      requestId,
      actorUserId: clientUserId,
      eventType: 'request.unassigned',
      metadataJson: { assignedWorkerUserId },
    });
    await this.repairRequestsRepo.manager.transaction(async (manager) => {
      if (application) await manager.save(application);
      await manager.save(req);
      await manager.save(unassignmentEvent);
    });
    await this.notifySafely(assignedWorkerUserId, {
      type: 'request_selection_canceled',
      message: `The client canceled your selection for request #${requestId}.`,
      requestId,
    });
    return this.toDto(req, {
      viewerRole: 'client',
      viewerUserId: clientUserId,
    });
  }

  async completeRequest(requestId: number, workerUserId: number, afterPhotos: any[] = []) {
    const req = await this.repairRequestsRepo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!req) throw new NotFoundException('Request not found');
    if (Number(req.assignedWorkerUserId) !== Number(workerUserId)) throw new ForbiddenException('Not your job');
    if (req.status === 'completed') {
      await this.referrals.processCompletedRequest(requestId);
      return this.toDto(req, {
        viewerRole: 'worker',
        viewerUserId: workerUserId,
      });
    }
    this.lifecycle.assertTransition(req.status, REQUEST_LIFECYCLE_ACTIONS.CLOSE);

    const completedAt = new Date();
    req.status = 'completed';
    req.completedAt = req.completedAt || completedAt;
    req.archivedAt = req.archivedAt || completedAt;
    req.archiveReason = 'closed_by_worker';
    req.archiveSource = 'worker';
    req.archivedByUserId = workerUserId;
    await this.repairRequestsRepo.save(req);

    if (Array.isArray(afterPhotos) && afterPhotos.length) {
      await this.saveMedia(requestId, workerUserId, 'request_after', afterPhotos, 'pending');
    }
    await this.addEvent(requestId, workerUserId, 'request.closed_by_worker', {});
    await this.referrals.processCompletedRequest(requestId);

    return this.toDto(req, {
      includeUnapprovedMedia: true,
      viewerRole: 'worker',
      viewerUserId: workerUserId,
    });
  }

  async adminListRequests(queue?: string) {
    const where =
      queue === 'moderation'
        ? { status: 'pending_admin' as RepairRequestStatus, archivedAt: IsNull() }
        : queue === 'active'
          ? { archivedAt: IsNull() }
          : queue === 'completed'
            ? { status: 'completed' as RepairRequestStatus, archivedAt: Not(IsNull()) }
            : {};
    const requests = await this.repairRequestsRepo.find({ where, relations: ['client'], order: { createdAt: 'DESC' }, take: 200 });
    const filtered = queue === 'active'
      ? requests.filter((request) => !['draft', 'pending_admin', 'completed', 'canceled', 'archived'].includes(request.status))
      : requests;
    return Promise.all(
      filtered.map((request) =>
        this.toDto(request, {
          includeUnapprovedMedia: true,
          viewerRole: 'admin',
        }),
      ),
    );
  }

  async adminGetTimeline(requestId: number) {
    const request = await this.repairRequestsRepo.findOne({
      where: { id: requestId },
      relations: ['client'],
    });
    if (!request) throw new NotFoundException('Request not found');
    const events = await this.eventsRepo.find({
      where: { requestId },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    return {
      request: await this.toDto(request, {
        includeUnapprovedMedia: true,
        viewerRole: 'admin',
      }),
      events,
    };
  }

  async adminSetStatus(requestId: number, status: RepairRequestStatus, actorUserId: number, reason?: string) {
    const request = await this.repairRequestsRepo.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Request not found');

    if (status === 'published') {
      const requestMedia = await this.media.findByRequest(requestId);
      const unresolvedPhotos = requestMedia.filter(
        (row) =>
          row.kind === 'request_before' &&
          !['approved', 'rejected'].includes(String(row.moderationStatus || '').toLowerCase()),
      );
      if (unresolvedPhotos.length) {
        throw new BadRequestException('Review every request photo before publishing the request');
      }
    }

    request.status = status;
    if (status !== 'completed') {
      request.completedAt = null;
      request.clientConfirmedAt = null;
      request.archivedAt = null;
      request.archiveReason = null;
      request.archiveSource = null;
      request.archivedByUserId = null;
    }
    if (status === 'completed' && !request.completedAt) {
      const completedAt = new Date();
      request.completedAt = completedAt;
      request.clientConfirmedAt = request.clientConfirmedAt || completedAt;
      request.archivedAt = request.archivedAt || completedAt;
      request.archiveReason = request.archiveReason || 'completed';
      request.archiveSource = request.archiveSource || 'admin';
      request.archivedByUserId = request.archivedByUserId || actorUserId;
    }
    await this.repairRequestsRepo.save(request);
    await this.addEvent(requestId, actorUserId, 'admin.status_changed', { status, reason: reason || null });
    return this.toDto(request, {
      includeUnapprovedMedia: true,
      viewerRole: 'admin',
    });
  }

  async adminIntervene(
    requestId: number,
    actorUserId: number,
    action: 'cancel' | 'reopen',
    reason: string,
  ) {
    const req = await this.repairRequestsRepo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!req) throw new NotFoundException('Request not found');
    if (!reason?.trim()) throw new BadRequestException('Reason is required');

    const lockedStatuses: RepairRequestStatus[] = [
      'worker_confirmed',
      'worker_on_site',
      'inspected',
      'in_progress',
      'work_finished',
      'ready_for_client_confirmation',
      'client_confirmed',
      'reviewed',
    ];
    if (!req.assignedWorkerUserId || !lockedStatuses.includes(req.status)) {
      throw new BadRequestException('Administrative intervention is only available for confirmed active requests');
    }

    const assignedWorkerUserId = Number(req.assignedWorkerUserId);
    const previousStatus = req.status;
    const applications = await this.applicationsRepo.find({ where: { requestId } });
    if (action === 'cancel') {
      req.status = 'canceled';
      applications.forEach((candidate) => {
        if (Number(candidate.workerUserId) === assignedWorkerUserId) candidate.status = 'withdrawn';
      });
    } else {
      applications.forEach((candidate) => {
        if (Number(candidate.workerUserId) === assignedWorkerUserId) {
          candidate.status = 'withdrawn';
        } else if (candidate.status === 'rejected') {
          candidate.status = 'applied';
        }
      });
      req.status = applications.some((candidate) =>
        ['applied', 'shortlisted'].includes(candidate.status),
      ) ? 'applied' : 'published';
    }
    req.assignedWorkerUserId = null;
    req.completedAt = null;
    req.clientConfirmedAt = null;
    req.archivedAt = null;
    req.archiveReason = null;
    req.archiveSource = null;
    req.archivedByUserId = null;

    const interventionEvent = this.eventsRepo.create({
      requestId,
      actorUserId,
      eventType: action === 'cancel' ? 'admin.request_canceled' : 'admin.request_reopened',
      metadataJson: { reason: reason.trim(), previousStatus, assignedWorkerUserId },
    });
    await this.repairRequestsRepo.manager.transaction(async (manager) => {
      await manager.save(req);
      await manager.save(applications);
      await manager.save(interventionEvent);
    });

    await Promise.all([
      this.notifySafely(req.clientUserId, {
        type: `request_admin_${action}`,
        message: `Administrator ${action === 'cancel' ? 'canceled' : 'reopened'} request #${requestId}.`,
        requestId,
      }),
      this.notifySafely(assignedWorkerUserId, {
        type: `request_admin_${action}`,
        message: `Administrator ${action === 'cancel' ? 'canceled' : 'reopened'} request #${requestId}.`,
        requestId,
      }),
    ]);

    return this.toDto(req, {
      includeUnapprovedMedia: true,
      viewerRole: 'admin',
      viewerUserId: actorUserId,
    });
  }

  private async saveMedia(requestId: number, ownerUserId: number, kind: string, photos: any[], moderationStatus = 'approved') {
    const normalized = normalizePhotos(photos);
    await Promise.all(
      normalized.map((photo) =>
        this.media.createAsset({
          ownerUserId,
          requestId,
          kind,
          storageKey: photo.storageKey || photo.url,
          publicUrl: photo.url,
          mimeType: photo.mimeType,
          sizeBytes: photo.sizeBytes,
          moderationStatus,
        }),
      ),
    );
  }

  private async addEvent(requestId: number, actorUserId: number, eventType: string, metadata: Record<string, any>) {
    return this.eventsRepo.save(
      this.eventsRepo.create({
        requestId,
        actorUserId,
        eventType,
        metadataJson: metadata || {},
      }),
    );
  }

  private async workerTransition(
    requestId: number,
    workerUserId: number,
    allowedStatuses: RepairRequestStatus[],
    nextStatus: RepairRequestStatus,
    eventType: string,
    action: RequestLifecycleAction | null,
    expectedState?: RequestLifecycleState,
  ) {
    await this.assertWorkerCanTakeJobs(workerUserId);

    const req = await this.repairRequestsRepo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!req) throw new NotFoundException('Request not found');
    if (Number(req.assignedWorkerUserId) !== Number(workerUserId)) throw new ForbiddenException('Not your job');
    if (!allowedStatuses.includes(req.status)) {
      throw new BadRequestException(`Invalid request status transition from ${req.status} to ${nextStatus}`);
    }

    const currentLifecycleStatus = this.lifecycle.normalize(req.status);
    if (action) {
      const nextLifecycleStatus = this.lifecycle.assertTransition(currentLifecycleStatus, action);
      const persistedLifecycleStatus = this.lifecycle.normalize(nextStatus);
      if (nextLifecycleStatus !== persistedLifecycleStatus) {
        throw new BadRequestException(
          `Lifecycle mismatch: ${currentLifecycleStatus} -> ${nextLifecycleStatus}, cannot persist ${nextStatus}`,
        );
      }
    } else if (expectedState && currentLifecycleStatus !== expectedState) {
      throw new BadRequestException(`Invalid lifecycle state ${currentLifecycleStatus}; expected ${expectedState}`);
    }

    const from = req.status;
    req.status = nextStatus;
    await this.repairRequestsRepo.save(req);
    await this.addEvent(requestId, workerUserId, eventType, { from, to: nextStatus });
    return this.toDto(req, {
      viewerRole: 'worker',
      viewerUserId: workerUserId,
    });
  }

  private async assertWorkerCanTakeJobs(workerUserId: number) {
    const uid = Number(workerUserId);
    if (!uid) throw new BadRequestException('Missing worker id');

    const user = await this.usersRepo.findOne({ where: { id: uid } });
    if (!user || user.role !== 'worker') throw new ForbiddenException('Worker account not found');
    if (user.status !== 'active') throw new ForbiddenException('Worker account is not active');

    const profile = await this.workerProfilesRepo.findOne({ where: { userId: uid } });
    if (!profile) throw new ForbiddenException('Worker profile is not approved');
    if (profile.approvalStatus !== 'approved') {
      throw new ForbiddenException('Worker profile is not approved');
    }
    if (['hidden', 'suspended'].includes(String(profile.visibilityStatus || '').toLowerCase())) {
      throw new ForbiddenException('Worker profile is not visible');
    }
  }

  private async toDto(
    request: RepairRequestEntity,
    options: RequestDtoOptions = {},
  ) {
    const [mediaRows, applications] = await Promise.all([
      this.media.findByRequest(request.id).catch(() => [] as MediaAssetEntity[]),
      this.applicationsRepo.find({ where: { requestId: request.id } }).catch(() => [] as RequestApplicationEntity[]),
    ]);

    const visibleMediaRows = mediaRows.filter((row) => {
      if (row.moderationStatus === 'approved') return true;
      if (!options.includeUnapprovedMedia) return false;

      if (options.viewerRole === 'worker') {
        return (
          row.kind === 'request_after' &&
          Number(row.ownerUserId) === Number(options.viewerUserId)
        );
      }

      return true;
    });
    const beforePhotos = this.mediaToPhotos(
      visibleMediaRows.filter((row) => row.kind === 'request_before'),
    );
    const afterPhotos = this.mediaToPhotos(
      visibleMediaRows.filter((row) => row.kind === 'request_after'),
    );
    const lifecycleStatusKey = this.lifecycle.normalize(request.status);
    const viewerUserId = Number(options.viewerUserId);
    const viewerRole = options.viewerRole;
    const isAdmin = viewerRole === 'admin' || viewerRole === 'super_admin';
    const isClientOwner =
      viewerRole === 'client' &&
      viewerUserId > 0 &&
      Number(request.clientUserId) === viewerUserId;
    const isAssignedWorker =
      viewerRole === 'worker' &&
      viewerUserId > 0 &&
      Number(request.assignedWorkerUserId) === viewerUserId;
    const contactUnlockedStatuses: RepairRequestStatus[] = [
      'worker_confirmed',
      'worker_on_site',
      'inspected',
      'in_progress',
      'work_finished',
      'ready_for_client_confirmation',
      'client_confirmed',
      'reviewed',
      'completed',
    ];
    const isConfirmedAssignedWorker =
      isAssignedWorker && contactUnlockedStatuses.includes(request.status);
    const canViewExactAddress = isAdmin || isClientOwner || isConfirmedAssignedWorker;
    const canViewClientName = isAdmin || isClientOwner || isAssignedWorker;
    const canViewClientPhone = isAdmin || isClientOwner || isConfirmedAssignedWorker;
    const clientProfile =
      canViewClientPhone && typeof this.clientProfilesRepo?.findOne === 'function'
        ? await Promise.resolve(
            this.clientProfilesRepo.findOne({ where: { userId: request.clientUserId } }),
          ).catch(() => null)
        : null;
    const address = canViewExactAddress
      ? request.addressText
      : this.toRoughArea(request.addressText);

    return {
      id: request.id,
      clientName: canViewClientName ? request.client?.name || '' : 'Клиент',
      email: isAdmin ? request.client?.email || null : null,
      phone: canViewClientPhone ? clientProfile?.phonePrivate || null : null,
      address,
      addressText: address,
      addressVisibility: request.addressVisibility,
      addressPrecision: canViewExactAddress ? 'exact' : 'rough',
      category: REPAIR_CATEGORY_BY_KEY[this.normalizeCategoryKey(request.categoryKey)],
      categoryKey: request.categoryKey,
      title: request.title,
      description: request.description,
      latitude: canViewExactAddress
        ? request.latitude
        : this.toRoughCoordinate(request.latitude),
      longitude: canViewExactAddress
        ? request.longitude
        : this.toRoughCoordinate(request.longitude),
      locationSource: request.locationSource,
      estimateMin: request.estimateMin,
      estimateMax: request.estimateMax,
      estimateCurrency: request.estimateCurrency,
      photos: beforePhotos,
      beforePhotos,
      afterPhotos,
      statusKey: request.status,
      lifecycleStatusKey,
      statusLabel: this.lifecycle.label(lifecycleStatusKey),
      nextActor: this.lifecycle.nextActor(lifecycleStatusKey),
      allowedActions: this.allowedActionsFor(request, applications, options),
      applications: applications.map((application) => ({
        id: application.id,
        workerUserId: application.workerUserId,
        status: application.status,
        offerMin: application.offerMin,
        offerMax: application.offerMax,
        message: application.message,
        createdAt: application.created_at,
        updatedAt: application.updated_at,
      })),
      assignedWorkerUserId: request.assignedWorkerUserId,
      completedAt: request.completedAt,
      clientConfirmedAt: request.clientConfirmedAt,
      archivedAt: request.archivedAt,
      archiveReason: request.archiveReason,
      archiveSource: request.archiveSource,
      archivedByUserId: request.archivedByUserId,
      isArchived: Boolean(request.archivedAt),
      durationDays: request.completedAt ? completionDurationDays(request.createdAt, request.completedAt) : null,
      created_at: request.createdAt,
      updated_at: request.updatedAt,
    };
  }

  private toRoughArea(address: string | null) {
    const value = String(address || '').trim();
    if (!value) return null;

    const [area] = value.split(',');
    return area?.trim() || null;
  }

  private allowedActionsFor(
    request: RepairRequestEntity,
    applications: RequestApplicationEntity[],
    options: RequestDtoOptions,
  ) {
    const base = this.lifecycle.allowedActions(request.status);
    const viewerUserId = Number(options.viewerUserId);
    const isAdmin = options.viewerRole === 'admin' || options.viewerRole === 'super_admin';
    if (isAdmin) return base;

    if (options.viewerRole === 'client' && Number(request.clientUserId) === viewerUserId) {
      if (['worker_selected', 'assigned'].includes(request.status)) return ['unassign'];
      if ([
        'worker_confirmed',
        'worker_on_site',
        'inspected',
        'in_progress',
        'work_finished',
      ].includes(request.status)) return [];
      return base.filter((action) =>
        ['assign', 'confirm_completion', 'leave_review', 'cancel'].includes(action),
      );
    }

    if (options.viewerRole === 'worker') {
      const assignedToViewer = Number(request.assignedWorkerUserId) === viewerUserId;
      if (assignedToViewer && ['worker_selected', 'assigned'].includes(request.status)) {
        return ['withdraw_application', 'mark_arrived'];
      }
      if (assignedToViewer) {
        return base.filter((action) =>
          ['mark_arrived', 'start_work', 'mark_ready', 'close'].includes(action),
        );
      }
      const application = applications.find(
        (candidate) => Number(candidate.workerUserId) === viewerUserId,
      );
      return base.filter((action) =>
        action === 'apply' ||
        (action === 'withdraw_application' &&
          Boolean(application) &&
          !['withdrawn', 'rejected'].includes(application!.status)),
      );
    }

    return [];
  }

  private async notifySafely(
    userId: number,
    payload: { type: string; message: string; requestId: number },
  ) {
    if (!Number(userId)) return;
    if (typeof this.notifications?.create !== 'function') return;
    await Promise.resolve(this.notifications.create(Number(userId), payload)).catch(() => null);
  }

  private toRoughCoordinate(value: string | number | null) {
    const coordinate = Number(value);
    if (!Number.isFinite(coordinate)) return null;
    return Number(coordinate.toFixed(2));
  }

  private mediaToPhotos(rows: MediaAssetEntity[]) {
    return rows.map((row) => ({
      id: row.id,
      name: 'Снимка',
      url: row.publicUrl,
      storageKey: row.storageKey,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      moderationStatus: row.moderationStatus,
      kind: row.kind,
      created_at: row.createdAt,
    }));
  }

  private buildLocalDraft(prompt: string, address?: string) {
    const categoryKey = this.guessCategoryKey(prompt);
    const details = [prompt.trim(), address ? `Адрес: ${address.trim()}` : ''].filter(Boolean);

    return {
      category: REPAIR_CATEGORY_BY_KEY[categoryKey],
      categoryKey,
      description: details.join('\n'),
      questions: [
        'Има ли спешност и краен срок?',
        'Има ли снимки или допълнителни размери?',
      ],
      confidence: categoryKey === 'small_repairs' ? 0.45 : 0.55,
      source: 'local',
    };
  }

  private guessCategoryKey(prompt: string): RepairCategoryKey {
    const text = prompt.toLowerCase();
    if (/(vik|plumb|water|leak|pipe|sink|boiler|сифон|теч|тръб|мивк|бойлер|смесител)/i.test(text)) return 'vik';
    if (/(electro|electric|power|cable|switch|lamp|fuse|ток|контакт|кабел|табло|ламп|ключ)/i.test(text)) return 'electro';
    if (/(bathroom|bath|баня|бани|санитар)/i.test(text)) return 'bathroom_renovation';
    if (/(tile|tiles|ceramic|плочк|фаянс|теракот|гранитогрес)/i.test(text)) return 'tiles';
    if (/(roof|покрив|керемид|улук)/i.test(text)) return 'roof_waterproofing';
    if (/(drywall|гипсокартон|окачен таван|преградна стена)/i.test(text)) return 'drywall';
    if (/(floor|ламинат|паркет|настилк|под)/i.test(text)) return 'flooring';
    if (/(window|door|дограма|врат|обков)/i.test(text)) return 'windows_doors';
    if (/(heating|cooling|климатик|радиатор|отоплен)/i.test(text)) return 'heating_cooling';
    if (/(demolition|кърт|извоз|демонтаж|отпад)/i.test(text)) return 'demolition_cleanup';
    if (/(major|основен|цялостен)/i.test(text)) return 'full_renovation';
    if (/(paint|plaster|wall|ceiling|боя|шпаклов|стена|таван)/i.test(text)) return 'plaster';
    return 'small_repairs';
  }

  private normalizeCategoryKey(value: any): RepairCategoryKey {
    return normalizeRepairCategoryKey(value);
  }

  private cleanDescription(value: any, fallback: string) {
    const text = typeof value === 'string' ? value.trim() : '';
    return text || fallback;
  }
}
