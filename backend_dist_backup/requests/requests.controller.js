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
exports.RequestsController = void 0;
const common_1 = require("@nestjs/common");
const requests_service_1 = require("./requests.service");
const create_request_dto_1 = require("./dto/create-request.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let RequestsController = class RequestsController {
    constructor(requestsService) {
        this.requestsService = requestsService;
    }
    create(dto, req) {
        if (req.user.role !== 'client') {
            throw new common_1.UnauthorizedException('Само клиенти могат да създават заявки');
        }
        return this.requestsService.create(dto, req.user.id);
    }
    async getClientRequests(req) {
        if (req.user.role !== 'client') {
            return [];
        }
        return this.requestsService.findAllForClient(req.user.id);
    }
    getRequestsForWorker(req) {
        if (req.user.role !== 'worker') {
            return [];
        }
        return this.requestsService.findAllForWorker(req.user.id);
    }
    async findOne(id, req) {
        const numericId = Number(id);
        if (!numericId || isNaN(numericId)) {
            throw new common_1.BadRequestException('Invalid request ID');
        }
        return this.requestsService.findOne(numericId);
    }
    remove(id) {
        const numericId = Number(id);
        if (isNaN(numericId)) {
            throw new common_1.BadRequestException('Invalid request ID');
        }
        return this.requestsService.remove(numericId);
    }
    apply(id, req) {
        const numericId = Number(id);
        if (isNaN(numericId)) {
            throw new common_1.BadRequestException('Invalid request ID');
        }
        if (req.user.role !== 'worker') {
            throw new common_1.UnauthorizedException('Само майстори могат да кандидатстват');
        }
        return this.requestsService.applyForRequest(numericId, req.user.id);
    }
    assign(id, workerId, req) {
        const numericId = Number(id);
        const numericWorkerId = Number(workerId);
        if (isNaN(numericId) || isNaN(numericWorkerId)) {
            throw new common_1.BadRequestException('Invalid IDs');
        }
        if (req.user.role !== 'client') {
            throw new common_1.UnauthorizedException('Само клиенти могат да назначават майстор');
        }
        return this.requestsService.assignWorker(numericId, numericWorkerId, req.user.id);
    }
    complete(id, req) {
        const numericId = Number(id);
        if (isNaN(numericId)) {
            throw new common_1.BadRequestException('Invalid request ID');
        }
        if (req.user.role !== 'client') {
            throw new common_1.UnauthorizedException('Само клиенти могат да завършват заявка');
        }
        return this.requestsService.complete(numericId, req.user.id);
    }
    cancelByClient(id, req) {
        const numericId = Number(id);
        if (isNaN(numericId)) {
            throw new common_1.BadRequestException('Invalid request ID');
        }
        if (req.user.role !== 'client') {
            throw new common_1.UnauthorizedException('Само клиенти могат да отказват заявка');
        }
        return this.requestsService.cancelByClient(numericId, req.user.id);
    }
    cancelByWorker(id, req) {
        const numericId = Number(id);
        if (isNaN(numericId)) {
            throw new common_1.BadRequestException('Invalid request ID');
        }
        if (req.user.role !== 'worker') {
            throw new common_1.UnauthorizedException('Само майстори могат да отказват заявка');
        }
        return this.requestsService.cancelByWorker(numericId, req.user.id);
    }
};
exports.RequestsController = RequestsController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_request_dto_1.CreateRequestDto, Object]),
    __metadata("design:returntype", void 0)
], RequestsController.prototype, "create", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('client'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "getClientRequests", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('worker'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RequestsController.prototype, "getRequestsForWorker", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "findOne", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RequestsController.prototype, "remove", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':id/apply'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RequestsController.prototype, "apply", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':id/assign'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('workerId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Object]),
    __metadata("design:returntype", void 0)
], RequestsController.prototype, "assign", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':id/complete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RequestsController.prototype, "complete", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':id/cancel-client'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RequestsController.prototype, "cancelByClient", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':id/cancel-worker'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RequestsController.prototype, "cancelByWorker", null);
exports.RequestsController = RequestsController = __decorate([
    (0, common_1.Controller)('requests'),
    __metadata("design:paramtypes", [requests_service_1.RequestsService])
], RequestsController);
//# sourceMappingURL=requests.controller.js.map