import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  constructor() {}

  async sendRequestConfirmation(_request: any) {
    // Disabled - no email sending for MVP
    return;
  }
}
