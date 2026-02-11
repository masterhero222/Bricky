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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestEntity = exports.RequestStatus = exports.RequestCategory = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/user.entity");
var RequestCategory;
(function (RequestCategory) {
    RequestCategory["VIK"] = "\u0412\u0438\u041A";
    RequestCategory["ELECTRO"] = "\u0415\u043B\u0435\u043A\u0442\u0440\u043E";
    RequestCategory["SHPAKLOVKA"] = "\u0428\u043F\u0430\u043A\u043B\u043E\u0432\u043A\u0430 \u0438 \u0431\u043E\u044F";
    RequestCategory["PLOCKI"] = "\u041F\u043B\u043E\u0447\u043A\u0438";
})(RequestCategory || (exports.RequestCategory = RequestCategory = {}));
var RequestStatus;
(function (RequestStatus) {
    RequestStatus["NEW"] = "\u043D\u043E\u0432\u0430";
    RequestStatus["APPLIED"] = "\u043A\u0430\u043D\u0434\u0438\u0434\u0430\u0442\u0441\u0442\u0432\u0430\u043D\u0430";
    RequestStatus["IN_PROGRESS"] = "\u0432 \u043F\u0440\u043E\u0446\u0435\u0441";
    RequestStatus["COMPLETED"] = "\u0437\u0430\u0432\u044A\u0440\u0448\u0435\u043D\u0430";
    RequestStatus["CANCELED"] = "\u043E\u0442\u043A\u0430\u0437\u0430\u043D\u0430";
})(RequestStatus || (exports.RequestStatus = RequestStatus = {}));
let RequestEntity = class RequestEntity {
};
exports.RequestEntity = RequestEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], RequestEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, (client) => client.requests, {
        nullable: true,
        onDelete: 'SET NULL',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'clientId' }),
    __metadata("design:type", user_entity_1.UserEntity)
], RequestEntity.prototype, "client", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], RequestEntity.prototype, "clientName", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 120 }),
    __metadata("design:type", String)
], RequestEntity.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20 }),
    __metadata("design:type", String)
], RequestEntity.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255, nullable: true }),
    __metadata("design:type", String)
], RequestEntity.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: RequestCategory,
        nullable: true,
    }),
    __metadata("design:type", String)
], RequestEntity.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], RequestEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: RequestStatus,
        default: RequestStatus.NEW,
    }),
    __metadata("design:type", String)
], RequestEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-array', { nullable: true }),
    __metadata("design:type", Array)
], RequestEntity.prototype, "appliedWorkers", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], RequestEntity.prototype, "assignedWorkerId", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-array', { nullable: true }),
    __metadata("design:type", Array)
], RequestEntity.prototype, "images", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], RequestEntity.prototype, "created_at", void 0);
exports.RequestEntity = RequestEntity = __decorate([
    (0, typeorm_1.Entity)('requests')
], RequestEntity);
//# sourceMappingURL=request.entity.js.map