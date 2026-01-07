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
exports.Worker = void 0;
const typeorm_1 = require("typeorm");
let Worker = class Worker {
};
exports.Worker = Worker;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Worker.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'worker' }),
    __metadata("design:type", String)
], Worker.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Worker.prototype, "fullName", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Worker.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Worker.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Worker.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Worker.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-array'),
    __metadata("design:type", Array)
], Worker.prototype, "skills", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Worker.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Worker.prototype, "avatar", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Worker.prototype, "isApproved", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], Worker.prototype, "createdAt", void 0);
exports.Worker = Worker = __decorate([
    (0, typeorm_1.Entity)('workers')
], Worker);
//# sourceMappingURL=worker.entity.js.map