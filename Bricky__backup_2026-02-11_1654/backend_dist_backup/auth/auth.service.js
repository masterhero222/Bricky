"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("../users/users.service");
const workers_service_1 = require("../workers/workers.service");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcryptjs"));
let AuthService = class AuthService {
    constructor(users, workers, jwt) {
        this.users = users;
        this.workers = workers;
        this.jwt = jwt;
    }
    async registerClient(dto) {
        const email = dto.email.toLowerCase();
        const exists = await this.users.findByEmail(email);
        if (exists)
            throw new common_1.ConflictException('Email already exists');
        const hashed = await bcrypt.hash(dto.password, 10);
        const user = await this.users.create({
            name: dto.name,
            email,
            password: hashed,
            role: 'client',
        });
        const { password, ...clean } = user;
        return clean;
    }
    async registerWorker(dto) {
        const email = dto.email.toLowerCase();
        const exists = await this.workers.findByEmail(email);
        if (exists) {
            throw new common_1.ConflictException("Worker email already exists");
        }
        const hashed = await bcrypt.hash(dto.password, 10);
        const saved = await this.workers.create({
            fullName: dto.fullName,
            email,
            password: hashed,
            phone: dto.phone,
            city: dto.city,
            skills: dto.skills,
            isApproved: false,
        });
        const { password, ...clean } = saved;
        return clean;
    }
    async login(dto) {
        const email = dto.email.toLowerCase();
        const user = await this.users.findByEmail(email);
        if (user) {
            const valid = await bcrypt.compare(dto.password, user.password);
            if (!valid)
                throw new common_1.UnauthorizedException('Invalid credentials');
            const payload = {
                id: user.id,
                email: user.email,
                role: 'client',
            };
            return {
                message: 'Login successful',
                token: this.jwt.sign(payload),
                user: payload,
            };
        }
        const worker = await this.workers.findByEmail(email);
        if (!worker)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const valid = await bcrypt.compare(dto.password, worker.password);
        if (!valid)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const payload = {
            id: worker.id,
            email: worker.email,
            role: 'worker',
        };
        return {
            message: 'Login successful',
            token: this.jwt.sign(payload),
            user: payload,
        };
    }
    logout() {
        return { message: 'Logged out successfully' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        workers_service_1.WorkersService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map