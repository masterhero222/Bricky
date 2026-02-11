"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const request_entity_1 = require("./entities/request.entity");
const mail_service_1 = require("../mail/mail.service");
const workers_service_1 = require("../workers/workers.service");
let RequestsService = class RequestsService {
    constructor(requestsRepository, workersService, mailService) {
        this.requestsRepository = requestsRepository;
        this.workersService = workersService;
        this.mailService = mailService;
    }
    async create(dto, clientId) {
        if (!clientId)
            throw new common_1.UnauthorizedException('Not logged in');
        const request = this.requestsRepository.create({
            client: { id: clientId },
            clientName: dto.clientName,
            email: dto.email,
            phone: dto.phone,
            address: dto.address,
            category: dto.category,
            description: dto.description,
            appliedWorkers: [],
            assignedWorkerId: null,
            status: request_entity_1.RequestStatus.NEW,
            images: [],
        });
        const saved = await this.requestsRepository.save(request);
        this.mailService
            .sendRequestConfirmation({
            email: saved.email,
            clientName: saved.clientName,
        })
            .catch(() => null);
        return saved;
    }
    async findAllForClient(userId) {
        const all = await this.requestsRepository.find({
            relations: ['client'],
            order: { created_at: 'DESC' },
        });
        return all.filter((req) => req.client?.id === userId);
    }
    async findAllForWorker(workerId) {
        const worker = await this.workersService.findById(workerId);
        const skills = Array.isArray(worker.skills) ? worker.skills : [];
        if (skills.length === 0)
            return [];
        return this.requestsRepository.find({
            where: { category: (0, typeorm_2.In)(skills) },
            relations: ['client'],
            order: { created_at: 'DESC' },
        });
    }
    async findOne(id) {
        const req = await this.requestsRepository.findOne({ where: { id } });
        if (!req)
            throw new common_1.NotFoundException('Заявката не е намерена');
        return req;
    }
    async remove(id) {
        return this.requestsRepository.delete(id);
    }
    async applyForRequest(requestId, workerId) {
        const req = await this.requestsRepository.findOne({ where: { id: requestId } });
        if (!req)
            throw new common_1.NotFoundException('Заявката не съществува');
        const current = Array.isArray(req.appliedWorkers)
            ? req.appliedWorkers
            : [];
        if (!current.includes(workerId)) {
            current.push(workerId);
        }
        req.appliedWorkers = current;
        if (req.status === request_entity_1.RequestStatus.NEW) {
            req.status = request_entity_1.RequestStatus.APPLIED;
        }
        return this.requestsRepository.save(req);
    }
    async assignWorker(requestId, workerId, clientId) {
        const req = await this.requestsRepository.findOne({
            where: { id: requestId },
            relations: ['client'],
        });
        if (!req)
            throw new common_1.NotFoundException('Заявката не съществува');
        if (req.client?.id !== clientId) {
            throw new common_1.UnauthorizedException('Тази заявка не е ваша');
        }
        req.assignedWorkerId = workerId;
        req.status = request_entity_1.RequestStatus.IN_PROGRESS;
        return this.requestsRepository.save(req);
    }
    async complete(requestId, clientId) {
        const req = await this.requestsRepository.findOne({
            where: { id: requestId },
            relations: ['client'],
        });
        if (!req)
            throw new common_1.NotFoundException('Заявката не съществува');
        if (req.client?.id !== clientId) {
            throw new common_1.UnauthorizedException('Тази заявка не е ваша');
        }
        req.status = request_entity_1.RequestStatus.COMPLETED;
        return this.requestsRepository.save(req);
    }
    async cancelByClient(requestId, clientId) {
        const req = await this.requestsRepository.findOne({
            where: { id: requestId },
            relations: ['client'],
        });
        if (!req)
            throw new common_1.NotFoundException('Заявката не съществува');
        if (req.client?.id !== clientId) {
            throw new common_1.UnauthorizedException('Тази заявка не е ваша');
        }
        req.status = request_entity_1.RequestStatus.CANCELED;
        return this.requestsRepository.save(req);
    }
    async cancelByWorker(requestId, workerId) {
        const req = await this.requestsRepository.findOne({ where: { id: requestId } });
        if (!req)
            throw new common_1.NotFoundException('Заявката не съществува');
        if (req.assignedWorkerId !== workerId) {
            throw new common_1.UnauthorizedException('Тази заявка не е назначена на вас');
        }
        req.assignedWorkerId = null;
        req.status = request_entity_1.RequestStatus.NEW;
        return this.requestsRepository.save(req);
    }
};
exports.RequestsService = RequestsService;
exports.RequestsService = RequestsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(request_entity_1.RequestEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        workers_service_1.WorkersService,
        mail_service_1.MailService])
], RequestsService);
//# sourceMappingURL=requests.service.js.map