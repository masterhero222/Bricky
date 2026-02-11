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
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const mailer_1 = require("@nestjs-modules/mailer");
let MailService = MailService_1 = class MailService {
    constructor(mailer) {
        this.mailer = mailer;
        this.logger = new common_1.Logger(MailService_1.name);
    }
    async sendRequestConfirmation(request) {
        if (!request?.email) {
            this.logger.warn('❗ Прескачам имейл – липсва email в заявката');
            return;
        }
        try {
            await this.mailer.sendMail({
                to: request.email,
                subject: 'Приета заявка – Bricky',
                template: 'request-confirmation',
                context: {
                    name: request.clientName || 'клиент',
                },
            });
            this.logger.log(`📧 Изпратено писмо до ${request.email}`);
        }
        catch (error) {
            this.logger.error(`Грешка при изпращане на имейл до ${request.email}: ${error.message}`, error.stack);
        }
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [mailer_1.MailerService])
], MailService);
//# sourceMappingURL=mail.service.js.map