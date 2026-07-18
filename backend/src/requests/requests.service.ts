import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { RequestEntity } from './entities/request.entity';
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
    @InjectRepository(RequestEntity)
    private readonly legacyRepo: Repository<RequestEntity>,
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
    private readonly mailService: MailService,
    private readonly notifications: NotificationsService,
    private readonly media: MediaService,
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

    return this.toDto(request);
  }

  async getByClientUserId(clientUserId: number) {
    if (!clientUserId) throw new BadRequestException('Missing client id');
    const requests = await this.repairRequestsRepo.find({
      where: { clientUserId, archivedAt: IsNull() },
      relations: ['client'],
      order: { createdAt: 'DESC' },
    });
    return Promise.all(requests.map((request) => this.toDto(request)));
  }

  async getHistoryByClientUserId(clientUserId: number) {
    if (!clientUserId) throw new BadRequestException('Missing client id');
    const requests = await this.repairRequestsRepo.find({
      where: { clientUserId, archivedAt: Not(IsNull()) },
      relations: ['client'],
      order: { completedAt: 'DESC', id: 'DESC' },
    });
    return Promise.all(requests.map((request) => this.toDto(request)));
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
      ],
      relations: ['client'],
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      requests
        .filter((request) => {
          if (request.archivedAt) return false;
          if (['canceled', 'archived', 'draft', 'pending_admin'].includes(request.status)) return false;
          if (!request.assignedWorkerUserId) return ['published', 'applied'].includes(request.status);
          return Number(request.assignedWorkerUserId) === Number(workerUserId);
        })
        .map((request) => this.toDto(request)),
    );
  }

  async getCompletedForWorker(workerUserId: number) {
    if (!workerUserId) throw new BadRequestException('Missing worker id');
    const requests = await this.repairRequestsRepo.find({
      where: { assignedWorkerUserId: workerUserId, status: 'completed', archivedAt: Not(IsNull()) },
      relations: ['client'],
      order: { completedAt: 'DESC', id: 'DESC' },
    });
    return Promise.all(requests.map((request) => this.toDto(request)));
  }

  async applyToRequest(requestId: number, workerUserId: number) {
    await this.assertWorkerCanTakeJobs(workerUserId);

    const req = await this.repairRequestsRepo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!req) throw new NotFoundException('Request not found');
    if (req.assignedWorkerUserId) throw new BadRequestException('Request already has assigned worker');
    if (!['published', 'applied'].includes(req.status)) throw new BadRequestException('Request is not open for applications');

    const existing = await this.applicationsRepo.findOne({ where: { requestId, workerUserId } });
    if (existing) {
      if (['withdrawn', 'rejected'].includes(existing.status)) {
        existing.status = 'applied';
        await this.applicationsRepo.save(existing);
      }
    } else {
      await this.applicationsRepo.save(
        this.applicationsRepo.create({
          requestId,
          workerUserId,
          status: 'applied',
          offerMin: null,
          offerMax: null,
          message: null,
        }),
      );
    }

    if (req.status === 'published') {
      req.status = 'applied';
      await this.repairRequestsRepo.save(req);
    }

    await this.addEvent(requestId, workerUserId, 'application.created', {});
    return this.toDto(req);
  }

  async assignWorker(requestId: number, clientUserId: number, workerUserId: number) {
    const req = await this.repairRequestsRepo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!req) throw new NotFoundException('Request not found');
    if (Number(req.clientUserId) !== Number(clientUserId)) throw new ForbiddenException('Not your request');
    if (['completed', 'canceled', 'archived'].includes(req.status)) throw new BadRequestException('Request is closed');
    await this.assertWorkerCanTakeJobs(workerUserId);

    const application = await this.applicationsRepo.findOne({ where: { requestId, workerUserId } });
    if (!application || ['withdrawn', 'rejected'].includes(application.status)) {
      throw new BadRequestException('This worker has not applied to this request');
    }

    req.assignedWorkerUserId = workerUserId;
    req.status = 'worker_selected';
    req.completedAt = null;
    await this.repairRequestsRepo.save(req);

    application.status = 'assigned';
    await this.applicationsRepo.save(application);
    await this.addEvent(requestId, clientUserId, 'request.assigned', { workerUserId });

    return this.toDto(req);
  }

  async workerConfirm(requestId: number, workerUserId: number) {
    return this.workerTransition(requestId, workerUserId, ['worker_selected', 'assigned'], 'worker_confirmed', 'worker.confirmed');
  }

  async markWorkerOnSite(requestId: number, workerUserId: number) {
    return this.workerTransition(requestId, workerUserId, ['worker_confirmed'], 'worker_on_site', 'worker.on_site');
  }

  async markInspected(requestId: number, workerUserId: number) {
    return this.workerTransition(requestId, workerUserId, ['worker_on_site'], 'inspected', 'worker.inspected');
  }

  async startWork(requestId: number, workerUserId: number) {
    return this.workerTransition(requestId, workerUserId, ['inspected'], 'in_progress', 'worker.started_work');
  }

  async finishWork(requestId: number, workerUserId: number, afterPhotos: any[] = []) {
    await this.workerTransition(requestId, workerUserId, ['in_progress'], 'work_finished', 'worker.finished_work');
    await this.saveMedia(requestId, workerUserId, 'request_after', afterPhotos);

    const updated = await this.repairRequestsRepo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!updated) throw new NotFoundException('Request not found');
    return this.toDto(updated);
  }

  async readyForClientConfirmation(requestId: number, workerUserId: number) {
    return this.workerTransition(
      requestId,
      workerUserId,
      ['work_finished'],
      'ready_for_client_confirmation',
      'worker.ready_for_client_confirmation',
    );
  }

  async clientConfirmWork(requestId: number, clientUserId: number) {
    const req = await this.repairRequestsRepo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!req) throw new NotFoundException('Request not found');
    if (Number(req.clientUserId) !== Number(clientUserId)) throw new ForbiddenException('Not your request');
    if (req.status === 'completed' && req.archivedAt) return this.toDto(req);
    if (req.status !== 'ready_for_client_confirmation') {
      throw new BadRequestException('Request is not ready for client confirmation');
    }

    const completedAt = new Date();
    req.status = 'completed';
    req.clientConfirmedAt = req.clientConfirmedAt || completedAt;
    req.completedAt = req.completedAt || completedAt;
    req.archivedAt = req.archivedAt || completedAt;
    req.archiveReason = req.archiveReason || 'completed';
    req.archiveSource = req.archiveSource || 'system';
    req.archivedByUserId = req.archivedByUserId || clientUserId;
    await this.repairRequestsRepo.save(req);
    await this.addEvent(requestId, clientUserId, 'client.confirmed_work', { archivedAt: req.archivedAt });
    return this.toDto(req);
  }

  async unassignWorker(requestId: number, clientUserId: number) {
    const req = await this.repairRequestsRepo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!req) throw new NotFoundException('Request not found');
    if (Number(req.clientUserId) !== Number(clientUserId)) throw new ForbiddenException('Not your request');
    if (req.status === 'completed') throw new BadRequestException('Already completed');

    const assignedWorkerId = Number(req.assignedWorkerUserId);
    req.assignedWorkerUserId = null;

    const activeApplications = await this.applicationsRepo.find({ where: { requestId } });
    req.status = activeApplications.some((app) => !['withdrawn', 'rejected'].includes(app.status)) ? 'applied' : 'published';
    await this.repairRequestsRepo.save(req);

    if (assignedWorkerId) {
      const application = await this.applicationsRepo.findOne({
        where: { requestId, workerUserId: assignedWorkerId },
      });
      if (application && application.status === 'assigned') {
        application.status = 'applied';
        await this.applicationsRepo.save(application);
      }
    }

    await this.addEvent(requestId, clientUserId, 'request.unassigned', { assignedWorkerId });
    return this.toDto(req);
  }

  async completeRequest(requestId: number, workerUserId: number, afterPhotos: any[] = []) {
    const req = await this.repairRequestsRepo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!req) throw new NotFoundException('Request not found');
    if (Number(req.assignedWorkerUserId) !== Number(workerUserId)) throw new ForbiddenException('Not your job');
    if (req.status === 'completed') {
      if (!req.archivedAt) {
        req.archivedAt = req.completedAt || new Date();
        req.archiveReason = req.archiveReason || 'completed';
        req.archiveSource = req.archiveSource || 'legacy_worker_close';
        req.archivedByUserId = req.archivedByUserId || workerUserId;
        await this.repairRequestsRepo.save(req);
      }
      return this.toDto(req);
    }
    if (req.status !== 'reviewed') throw new BadRequestException('Request must be reviewed before closing');

    const completedAt = new Date();
    req.status = 'completed';
    req.completedAt = completedAt;
    req.archivedAt = req.archivedAt || completedAt;
    req.archiveReason = req.archiveReason || 'completed';
    req.archiveSource = req.archiveSource || 'legacy_worker_close';
    req.archivedByUserId = req.archivedByUserId || workerUserId;
    await this.repairRequestsRepo.save(req);

    if (Array.isArray(afterPhotos) && afterPhotos.length) {
      await this.saveMedia(requestId, workerUserId, 'request_after', afterPhotos);
    }
    await this.addEvent(requestId, workerUserId, 'request.closed_by_worker', {});

    return this.toDto(req);
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
    return Promise.all(filtered.map((request) => this.toDto(request)));
  }

  async adminSetStatus(requestId: number, status: RepairRequestStatus, actorUserId: number, reason?: string) {
    const request = await this.repairRequestsRepo.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Request not found');
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
    if (status === 'published') {
      await this.media.setRequestMediaModeration(requestId, 'request_before', 'approved');
    } else if (status === 'archived') {
      await this.media.setRequestMediaModeration(requestId, 'request_before', 'rejected');
    }
    await this.addEvent(requestId, actorUserId, 'admin.status_changed', { status, reason: reason || null });
    return this.toDto(request);
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
  ) {
    await this.assertWorkerCanTakeJobs(workerUserId);

    const req = await this.repairRequestsRepo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!req) throw new NotFoundException('Request not found');
    if (Number(req.assignedWorkerUserId) !== Number(workerUserId)) throw new ForbiddenException('Not your job');
    if (!allowedStatuses.includes(req.status)) {
      throw new BadRequestException(`Invalid request status transition from ${req.status} to ${nextStatus}`);
    }

    const from = req.status;
    req.status = nextStatus;
    await this.repairRequestsRepo.save(req);
    await this.addEvent(requestId, workerUserId, eventType, { from, to: nextStatus });
    return this.toDto(req);
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

  private async toDto(request: RepairRequestEntity) {
    const [mediaRows, applications] = await Promise.all([
      this.media.findByRequest(request.id).catch(() => [] as MediaAssetEntity[]),
      this.applicationsRepo.find({ where: { requestId: request.id } }).catch(() => [] as RequestApplicationEntity[]),
    ]);

    const beforePhotos = this.mediaToPhotos(mediaRows.filter((row) => row.kind === 'request_before'));
    const afterPhotos = this.mediaToPhotos(mediaRows.filter((row) => row.kind === 'request_after'));

    return {
      id: request.id,
      clientName: request.client?.name || '',
      email: request.client?.email || '',
      phone: null,
      address: request.addressText,
      addressText: request.addressText,
      addressVisibility: request.addressVisibility,
      category: REPAIR_CATEGORY_BY_KEY[this.normalizeCategoryKey(request.categoryKey)],
      categoryKey: request.categoryKey,
      title: request.title,
      description: request.description,
      latitude: request.latitude,
      longitude: request.longitude,
      locationSource: request.locationSource,
      estimateMin: request.estimateMin,
      estimateMax: request.estimateMax,
      estimateCurrency: request.estimateCurrency,
      photos: beforePhotos,
      beforePhotos,
      afterPhotos,
      status: this.legacyStatus(request.status),
      statusKey: request.status,
      appliedWorkers: applications
        .filter((application) => !['withdrawn', 'rejected'].includes(application.status))
        .map((application) => application.workerUserId),
      assignedWorkerId: request.assignedWorkerUserId,
      assignedWorkerUserId: request.assignedWorkerUserId,
      completedAt: request.completedAt,
      clientConfirmedAt: request.clientConfirmedAt,
      archivedAt: request.archivedAt,
      archiveReason: request.archiveReason,
      archiveSource: request.archiveSource,
      archivedByUserId: request.archivedByUserId,
      isArchived: Boolean(request.archivedAt),
      completedByWorkerId: request.status === 'completed' ? request.assignedWorkerUserId : null,
      durationDays: request.completedAt ? completionDurationDays(request.createdAt, request.completedAt) : null,
      created_at: request.createdAt,
      updated_at: request.updatedAt,
    };
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

  private legacyStatus(status: RepairRequestStatus) {
    const map: Record<RepairRequestStatus, string> = {
      draft: 'чернова',
      pending_admin: 'чака одобрение',
      published: 'нова',
      applied: 'кандидатствана',
      assigned: 'избран майстор',
      worker_selected: 'избран майстор',
      worker_confirmed: 'майсторът потвърди',
      worker_on_site: 'майсторът е на адреса',
      inspected: 'огледана',
      in_progress: 'в процес',
      work_finished: 'работата е свършена',
      ready_for_client_confirmation: 'чака потвърждение от клиента',
      client_confirmed: 'клиентът потвърди',
      reviewed: 'оставен отзив',
      completed: 'завършена',
      canceled: 'отказана',
      archived: 'архивирана',
    };
    return map[status] || status;
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
