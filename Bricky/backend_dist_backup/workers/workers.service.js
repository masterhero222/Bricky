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
var WorkersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const worker_entity_1 = require("./worker.entity");
let WorkersService = WorkersService_1 = class WorkersService {
    constructor(workerRepository) {
        this.workerRepository = workerRepository;
        this.logger = new common_1.Logger(WorkersService_1.name);
    }
    async findByEmail(email) {
        return this.workerRepository.findOne({ where: { email } });
    }
    async findById(id) {
        const worker = await this.workerRepository.findOne({ where: { id } });
        if (!worker)
            throw new common_1.NotFoundException('Worker not found');
        return worker;
    }
    async findAll() {
        return this.workerRepository.find();
    }
    async create(dto) {
        const worker = this.workerRepository.create({
            fullName: dto.fullName,
            email: dto.email,
            password: dto.password,
            phone: dto.phone,
            city: dto.city,
            skills: dto.skills,
            description: null,
            avatar: null,
            isApproved: dto.isApproved ?? false,
            role: 'worker',
        });
        const saved = await this.workerRepository.save(worker);
        this.logger.log(`Нов майстор: ${saved.fullName} (${saved.email})`);
        return saved;
    }
    async updateProfile(id, data) {
        const worker = await this.findById(id);
        worker.fullName = data.fullName ?? worker.fullName;
        worker.city = data.city ?? worker.city;
        worker.phone = data.phone ?? worker.phone;
        worker.description = data.description ?? worker.description;
        worker.avatar = data.avatar ?? worker.avatar;
        worker.skills = data.skills ?? worker.skills;
        return this.workerRepository.save(worker);
    }
};
exports.WorkersService = WorkersService;
exports.WorkersService = WorkersService = WorkersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(worker_entity_1.Worker)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], WorkersService);
//# sourceMappingURL=workers.service.js.map