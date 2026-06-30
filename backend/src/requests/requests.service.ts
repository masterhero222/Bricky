import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { RequestEntity } from './entities/request.entity';
import { RequestApplicationEntity } from './entities/request-application.entity';
import { RequestImageEntity, RequestImageKind } from './entities/request-image.entity';
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
const MAX_REQUEST_PHOTO_URL_CHARS = 35_000;
const MAX_REQUEST_PHOTOS_JSON_CHARS = 58_000;

function normalizePhotos(arr: any): any[] {
  if (!Array.isArray(arr)) return [];
  const normalized = arr
    .filter((photo) => photo && typeof photo.url === 'string' && photo.url)
    .map((photo, index) => ({
      id: photo.id || `${Date.now()}-${index}`,
      name: photo.name || 'Снимка',
      url: photo.url,
      created_at: photo.created_at || new Date().toISOString(),
    }));

  const safePhotos: any[] = [];
  for (const photo of normalized) {
    if (String(photo.url || '').length > MAX_REQUEST_PHOTO_URL_CHARS) continue;

    const nextPhotos = [...safePhotos, photo];
    if (JSON.stringify(nextPhotos).length > MAX_REQUEST_PHOTOS_JSON_CHARS) break;

    safePhotos.push(photo);
  }

  return safePhotos;
}

function completionDurationDays(createdAt: any, completedAt: Date): number {
  const start = new Date(createdAt || completedAt).getTime();
  const end = completedAt.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 1;
  return Math.max(1, Math.ceil((end - start) / (24 * 60 * 60 * 1000)));
}
function normalizeNumberArray(arr: any): number[] {
  const a = Array.isArray(arr) ? arr : [];
  const out = a.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0);
  return Array.from(new Set(out));
}

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(RequestEntity)
    private readonly repo: Repository<RequestEntity>,
    @InjectRepository(RequestApplicationEntity)
    private readonly applicationsRepo: Repository<RequestApplicationEntity>,
    @InjectRepository(RequestImageEntity)
    private readonly imagesRepo: Repository<RequestImageEntity>,
    private readonly mailService: MailService,
    private readonly notifications: NotificationsService,
  ) {}

  private async saveRequestImages(
    requestId: number,
    uploaderUserId: number | null,
    kind: RequestImageKind,
    photos: any[],
  ) {
    const normalized = normalizePhotos(photos);
    if (!requestId || normalized.length === 0) return [];

    const rows = normalized.map((photo, index) =>
      this.imagesRepo.create({
        requestId,
        uploaderUserId,
        kind,
        name: photo.name || null,
        url: photo.url,
        storageKey: photo.storageKey || null,
        mimeType: photo.mimeType || null,
        sizeBytes: Number.isFinite(Number(photo.sizeBytes)) ? Number(photo.sizeBytes) : null,
        sortOrder: index,
        isApproved: true,
      }),
    );

    return this.imagesRepo.save(rows);
  }

  private imageRowsToPhotos(rows: RequestImageEntity[]) {
    return rows.map((row) => ({
      id: row.id,
      name: row.name || 'Снимка',
      url: row.url,
      storageKey: row.storageKey,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      kind: row.kind,
      created_at: row.created_at,
    }));
  }

  private async hydrateRequestImages(request: RequestEntity) {
    if (!request?.id) return request;

    const rows = await this.imagesRepo.find({
      where: { requestId: request.id },
      order: { kind: 'ASC', sortOrder: 'ASC', created_at: 'ASC' },
    });

    if (!rows.length) return request;

    const beforePhotos = this.imageRowsToPhotos(rows.filter((row) => row.kind === 'before'));
    const afterPhotos = this.imageRowsToPhotos(rows.filter((row) => row.kind === 'after'));
    const generalPhotos = this.imageRowsToPhotos(rows.filter((row) => row.kind === 'general'));

    request.beforePhotos = beforePhotos.length ? beforePhotos : request.beforePhotos;
    request.afterPhotos = afterPhotos.length ? afterPhotos : request.afterPhotos;
    request.photos = [...generalPhotos, ...beforePhotos];

    return request;
  }

  private async hydrateManyRequestImages(requests: RequestEntity[]) {
    return Promise.all(requests.map((request) => this.hydrateRequestImages(request)));
  }

  private async ensureApplication(requestId: number, workerUserId: number, status: 'applied' | 'assigned') {
    const existing = await this.applicationsRepo.findOne({ where: { requestId, workerUserId } });
    if (existing) {
      existing.status = existing.status === 'assigned' ? 'assigned' : status;
      return this.applicationsRepo.save(existing);
    }

    return this.applicationsRepo.save(
      this.applicationsRepo.create({
        requestId,
        workerUserId,
        status,
        offerMin: null,
        offerMax: null,
        message: null,
      }),
    );
  }

  private async hasActiveApplication(requestId: number, workerUserId: number) {
    const existing = await this.applicationsRepo.findOne({ where: { requestId, workerUserId } });
    return !!existing && !['withdrawn', 'rejected'].includes(existing.status);
  }

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
      address ? `?????: ${address.trim()}` : '',
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
      const text = extractResponseText(data);
      const parsed = JSON.parse(text);
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

    const photos = normalizePhotos(dto.photos);
    const request = this.repo.create({
      client: { id: clientUserId } as any,
      clientName: dto.clientName,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
      category: REPAIR_CATEGORY_BY_KEY[categoryKey],
      categoryKey,
      description: dto.description,
      latitude: dto.latitude == null ? null : String(dto.latitude),
      longitude: dto.longitude == null ? null : String(dto.longitude),
      locationSource: dto.locationSource || 'manual',
      estimateMin: dto.estimateMin == null ? null : String(dto.estimateMin),
      estimateMax: dto.estimateMax == null ? null : String(dto.estimateMax),
      estimateCurrency: dto.estimateCurrency || 'BGN',
      photos,
      beforePhotos: photos,
      afterPhotos: [],
      status: 'нова',
      appliedWorkers: [],
      assignedWorkerId: null,
      completedAt: null,
      completedByWorkerId: null,
      durationDays: null,
    });

    const saved = await this.repo.save(request);
    await this.saveRequestImages(saved.id, clientUserId, 'before', photos);

    // completion info
    // this.mailService.sendRequestConfirmation(...).catch(() => null);

    return this.hydrateRequestImages(saved);
  }

  async getByClientUserId(clientUserId: number) {
    if (!clientUserId) throw new BadRequestException('Missing client id');
    const requests = await this.repo.find({
      where: { client: { id: clientUserId } },
      relations: ['client'],
      order: { created_at: 'DESC' },
    });
    return this.hydrateManyRequestImages(requests);
  }

  async getMapRequests(user: any) {
    const role = String(user?.role || '');
    const userId = Number(user?.id);
    if (!userId) throw new BadRequestException('Missing user id');

    if (role === 'client') {
      return this.getByClientUserId(userId);
    }

    if (role === 'worker') {
      return this.getForWorkersFeed(userId);
    }

    throw new BadRequestException('Unsupported role');
  }

  /**
   * Worker feed:
   * - ???????? (assignedWorkerId IS NULL) + ???????????
   * - ???? assigned ?? ???? worker + ???????????
   */
  async getForWorkersFeed(workerUserId: number) {
    if (!workerUserId) throw new BadRequestException('Missing worker id');

    const requests = await this.repo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.client', 'client')
      .where(
        new Brackets((qb) => {
          qb.where('r.assignedWorkerId IS NULL')
            .andWhere('r.status != :done', { done: 'завършена' })
            .andWhere('r.status != :canceled', { canceled: 'отказана' });
        }),
      )
      .orWhere(
        new Brackets((qb) => {
          qb.where('r.assignedWorkerId = :wid', { wid: workerUserId })
            .andWhere('r.status != :done', { done: 'завършена' })
            .andWhere('r.status != :canceled', { canceled: 'отказана' });
        }),
      )
      .orderBy('r.created_at', 'DESC')
      .getMany();

    return this.hydrateManyRequestImages(requests);
  }

  async getCompletedForWorker(workerUserId: number) {
    if (!workerUserId) throw new BadRequestException('Missing worker id');
    const requests = await this.repo.find({
      where: { assignedWorkerId: workerUserId, status: 'завършена' },
      relations: ['client'],
      order: { created_at: 'DESC' },
    });

    return this.hydrateManyRequestImages(requests);
  }

  async applyToRequest(requestId: number, workerUserId: number) {
    const req = await this.repo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!req) throw new NotFoundException('Request not found');

    if (req.assignedWorkerId) throw new BadRequestException('Request already has assigned worker');
    if (req.status === 'завършена' || req.status === 'отказана') throw new BadRequestException('Request is closed');

    const applied = normalizeNumberArray(req.appliedWorkers);

    if (!applied.includes(workerUserId)) {
      applied.push(workerUserId);
      req.appliedWorkers = applied;
    }

    if ((req.status || '').toLowerCase() === 'нова') req.status = 'кандидатствана';

    const saved = await this.repo.save(req);
    await this.ensureApplication(requestId, workerUserId, 'applied');

    return this.hydrateRequestImages(saved);
  }

  async assignWorker(requestId: number, clientUserId: number, workerUserId: number) {
    const req = await this.repo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!req) throw new NotFoundException('Request not found');

    if (Number(req.client?.id) !== Number(clientUserId)) {
      throw new ForbiddenException('Not your request');
    }

    if (req.status === 'завършена' || req.status === 'отказана') {
      throw new BadRequestException('Request is closed');
    }

    const applied = normalizeNumberArray(req.appliedWorkers);
    const hasApplication = await this.hasActiveApplication(requestId, workerUserId);
    if (!applied.includes(workerUserId) && !hasApplication) {
      throw new BadRequestException('This worker has not applied to this request');
    }

    if (!applied.includes(workerUserId)) {
      applied.push(workerUserId);
      req.appliedWorkers = applied;
    }

    req.assignedWorkerId = workerUserId;
    req.status = 'в процес';
    req.completedAt = null;
    req.completedByWorkerId = null;

    // completion info
    // await this.notifications.notifyWorkerAssigned(workerUserId, req.id).catch(() => null);

    const saved = await this.repo.save(req);
    await this.ensureApplication(requestId, workerUserId, 'assigned');

    return this.hydrateRequestImages(saved);
  }

  async unassignWorker(requestId: number, clientUserId: number) {
    const req = await this.repo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!req) throw new NotFoundException('Request not found');

    if (Number(req.client?.id) !== Number(clientUserId)) {
      throw new ForbiddenException('Not your request');
    }

    if (req.status === 'завършена') throw new BadRequestException('Already completed');

    const assignedWorkerId = Number(req.assignedWorkerId);
    req.assignedWorkerId = null;

    const applied = normalizeNumberArray(req.appliedWorkers);
    req.status = applied.length > 0 ? 'кандидатствана' : 'нова';

    const saved = await this.repo.save(req);

    if (assignedWorkerId) {
      const application = await this.applicationsRepo.findOne({
        where: { requestId, workerUserId: assignedWorkerId },
      });
      if (application && application.status === 'assigned') {
        application.status = 'applied';
        await this.applicationsRepo.save(application);
      }
    }

    return this.hydrateRequestImages(saved);
  }

  // completion info
  async completeRequest(requestId: number, workerUserId: number, afterPhotos: any[] = []) {
    if (!requestId) throw new BadRequestException('Missing request id');
    if (!workerUserId) throw new BadRequestException('Missing worker id');

    const req = await this.repo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!req) throw new NotFoundException('Request not found');

    if (Number(req.assignedWorkerId) !== Number(workerUserId)) {
      throw new ForbiddenException('Not your job');
    }

    if (req.status === 'завършена') return req;
    if (req.status === 'отказана') throw new BadRequestException('Request canceled');

    const completedAt = new Date();
    const normalizedAfterPhotos = normalizePhotos(afterPhotos);
    req.status = 'завършена';
    req.completedAt = completedAt;
    req.completedByWorkerId = workerUserId;
    req.afterPhotos = normalizedAfterPhotos;
    req.durationDays = completionDurationDays(req.created_at, completedAt);

    const saved = await this.repo.save(req);
    await this.saveRequestImages(requestId, workerUserId, 'after', normalizedAfterPhotos);

    return this.hydrateRequestImages(saved);
  }
  private buildLocalDraft(prompt: string, address?: string) {
    const categoryKey = this.guessCategoryKey(prompt);
    const details = [
      prompt.trim(),
      address ? `?????: ${address.trim()}` : '',
    ].filter(Boolean);

    return {
      category: REPAIR_CATEGORY_BY_KEY[categoryKey],
      categoryKey,
      description: details.join('\n'),
      questions: [
        '???? ? ?????? ??????? ?? ????? ?? ??????',
        '??? ?? ?????? ??? ??????? ?? ?????????',
      ],
      confidence: categoryKey === 'small_repairs' ? 0.45 : 0.55,
      source: 'local',
    };
  }

  private guessCategoryKey(prompt: string): RepairCategoryKey {
    const text = prompt.toLowerCase();

    if (/(vik|plumb|water|leak|pipe|sink|boiler|сифон|теч|тръб|мивк|бойлер|смесител)/i.test(text)) return 'vik';
    if (/(electro|electric|power|cable|switch|lamp|fuse|ток|контакт|кабел|табло|ламп|ключ)/i.test(text)) return 'electro';
    if (/(install|installation|инсталац)/i.test(text) && /(electro|electric|ток|електро|кабел)/i.test(text)) return 'electro';
    if (/(bathroom|bath|баня|бани|санитар)/i.test(text)) return 'bathroom_renovation';
    if (/(tile|tiles|ceramic|плочк|фаянс|теракот|гранитогрес)/i.test(text)) return 'tiles';
    if (/(roof|покрив|керемид|улук)/i.test(text)) return 'roof_waterproofing';
    if (/(drywall|гипсокартон|окачен таван|преградна стена)/i.test(text)) return 'drywall';
    if (/(floor|ламинат|паркет|настилк|под)/i.test(text)) return 'flooring';
    if (/(masonry|зидар|мазилк|тухл)/i.test(text)) return 'plaster';
    if (/(insulation|изолац|хидроизолац|топлоизолац)/i.test(text)) return 'roof_waterproofing';
    if (/(window|door|дограма|врат|обков)/i.test(text)) return 'windows_doors';
    if (/(heating|cooling|климатик|радиатор|отоплен)/i.test(text)) return 'heating_cooling';
    if (/(demolition|кърт|извоз|демонтаж|отпад)/i.test(text)) return 'demolition_cleanup';
    if (/(major|основен|цялостен)/i.test(text)) return 'full_renovation';
    if (/(refresh|освежител|лек ремонт)/i.test(text)) return 'painting';
    if (/(repaint|пребоядис)/i.test(text)) return 'painting';
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
