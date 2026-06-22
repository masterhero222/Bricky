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
import { CreateRequestDto } from './dto/create-request.dto';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
const REQUEST_CATEGORIES = {
  vik: 'ВиК',
  electro: 'Електро',
  paint: 'Шпакловка и боя',
  tiles: 'Плочки',
} as const;

type RequestCategoryKey = keyof typeof REQUEST_CATEGORIES;


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
function normalizePhotos(arr: any): any[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((photo) => photo && typeof photo.url === 'string' && photo.url)
    .map((photo, index) => ({
      id: photo.id || `${Date.now()}-${index}`,
      name: photo.name || 'Снимка',
      url: photo.url,
      created_at: photo.created_at || new Date().toISOString(),
    }));
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
    private readonly mailService: MailService,
    private readonly notifications: NotificationsService,
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
            'Choose categoryKey from: vik for plumbing, electro for electrical, paint for plaster/paint, tiles for tile work.',
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
                  categoryKey: { type: 'string', enum: ['vik', 'electro', 'paint', 'tiles'] },
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
        category: REQUEST_CATEGORIES[categoryKey],
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

    const request = this.repo.create({
      client: { id: clientUserId } as any,
      clientName: dto.clientName,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
      category: dto.category,
      description: dto.description,
      photos: normalizePhotos(dto.photos),
      beforePhotos: normalizePhotos(dto.photos),
      afterPhotos: [],
      status: 'нова',
      appliedWorkers: [],
      assignedWorkerId: null,
      completedAt: null,
      completedByWorkerId: null,
      durationDays: null,
    });

    const saved = await this.repo.save(request);

    // completion info
    // this.mailService.sendRequestConfirmation(...).catch(() => null);

    return saved;
  }

  async getByClientUserId(clientUserId: number) {
    if (!clientUserId) throw new BadRequestException('Missing client id');
    return this.repo.find({
      where: { client: { id: clientUserId } },
      relations: ['client'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Worker feed:
   * - ???????? (assignedWorkerId IS NULL) + ???????????
   * - ???? assigned ?? ???? worker + ???????????
   */
  async getForWorkersFeed(workerUserId: number) {
    if (!workerUserId) throw new BadRequestException('Missing worker id');

    return this.repo
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
  }

  async getCompletedForWorker(workerUserId: number) {
    if (!workerUserId) throw new BadRequestException('Missing worker id');
    return this.repo.find({
      where: { assignedWorkerId: workerUserId, status: 'завършена' },
      relations: ['client'],
      order: { created_at: 'DESC' },
    });
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

    return this.repo.save(req);
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
    if (!applied.includes(workerUserId)) {
      throw new BadRequestException('This worker has not applied to this request');
    }

    req.assignedWorkerId = workerUserId;
    req.status = 'в процес';
    req.completedAt = null;
    req.completedByWorkerId = null;

    // completion info
    // await this.notifications.notifyWorkerAssigned(workerUserId, req.id).catch(() => null);

    return this.repo.save(req);
  }

  async unassignWorker(requestId: number, clientUserId: number) {
    const req = await this.repo.findOne({ where: { id: requestId }, relations: ['client'] });
    if (!req) throw new NotFoundException('Request not found');

    if (Number(req.client?.id) !== Number(clientUserId)) {
      throw new ForbiddenException('Not your request');
    }

    if (req.status === 'завършена') throw new BadRequestException('Already completed');

    req.assignedWorkerId = null;

    const applied = normalizeNumberArray(req.appliedWorkers);
    req.status = applied.length > 0 ? 'кандидатствана' : 'нова';

    return this.repo.save(req);
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
    req.status = 'завършена';
    req.completedAt = completedAt;
    req.completedByWorkerId = workerUserId;
    req.afterPhotos = normalizePhotos(afterPhotos);
    req.durationDays = completionDurationDays(req.created_at, completedAt);

    return this.repo.save(req);
  }
  private buildLocalDraft(prompt: string, address?: string) {
    const categoryKey = this.guessCategoryKey(prompt);
    const details = [
      prompt.trim(),
      address ? `?????: ${address.trim()}` : '',
    ].filter(Boolean);

    return {
      category: REQUEST_CATEGORIES[categoryKey],
      categoryKey,
      description: details.join('\n'),
      questions: [
        '???? ? ?????? ??????? ?? ????? ?? ??????',
        '??? ?? ?????? ??? ??????? ?? ?????????',
      ],
      confidence: categoryKey === 'paint' ? 0.45 : 0.55,
      source: 'local',
    };
  }

  private guessCategoryKey(prompt: string): RequestCategoryKey {
    const text = prompt.toLowerCase();

    if (/(vik|plumb|water|leak|pipe|sink|bath|boiler)/i.test(text)) return 'vik';
    if (/(electro|electric|power|cable|switch|lamp|fuse)/i.test(text)) return 'electro';
    if (/(tile|tiles|bathroom|ceramic)/i.test(text)) return 'tiles';
    if (/(paint|plaster|wall|ceiling)/i.test(text)) return 'paint';

    return 'paint';
  }

  private normalizeCategoryKey(value: any): RequestCategoryKey {
    return value && value in REQUEST_CATEGORIES ? value : 'paint';
  }

  private cleanDescription(value: any, fallback: string) {
    const text = typeof value === 'string' ? value.trim() : '';
    return text || fallback;
  }
}
