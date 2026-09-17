import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

export type GoogleIdentity = {
  subject: string;
  email: string;
  name: string;
};

@Injectable()
export class GoogleIdentityService {
  private readonly client = new OAuth2Client();

  async verifyCredential(credential: string): Promise<GoogleIdentity> {
    const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
    if (!clientId) {
      throw new ServiceUnavailableException(
        'Google регистрацията временно не е налична',
      );
    }

    try {
      const ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      const payload = ticket.getPayload();
      const email = String(payload?.email || '')
        .trim()
        .toLowerCase();
      const subject = String(payload?.sub || '').trim();

      if (!email || !subject || payload?.email_verified !== true) {
        throw new UnauthorizedException('Невалиден Google профил');
      }

      return {
        subject,
        email,
        name: String(payload?.name || email.split('@')[0]).trim(),
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Невалиден или изтекъл Google token');
    }
  }
}
