import { MailService } from './mail.service';

describe('MailService account email delivery results', () => {
  const originalEnv = process.env.FRONTEND_URL;

  afterEach(() => {
    process.env.FRONTEND_URL = originalEnv;
    jest.restoreAllMocks();
  });

  const createService = () => {
    const mailer = {
      sendMail: jest.fn(),
    };

    return {
      service: new MailService(mailer as any),
      mailer,
    };
  };

  it('returns sent status and provider message id for verification emails', async () => {
    process.env.FRONTEND_URL = 'https://bricky.test';
    const { service, mailer } = createService();
    mailer.sendMail.mockResolvedValue({ messageId: 'provider-123' });

    const result = await service.sendEmailVerification({
      email: 'client@example.com',
      name: 'Client Test',
      token: 'raw token with spaces',
    });

    expect(result).toEqual({ status: 'sent', providerMessageId: 'provider-123' });
    expect(mailer.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'client@example.com',
        subject: 'Потвърди имейла си в Bricky',
        text: expect.stringContaining('https://bricky.test/auth/verify-email?token=raw%20token%20with%20spaces'),
      }),
    );
  });

  it('includes a short verification code when one is provided', async () => {
    process.env.FRONTEND_URL = 'https://bricky.test';
    const { service, mailer } = createService();
    mailer.sendMail.mockResolvedValue({ messageId: 'provider-456' });

    await service.sendEmailVerification({
      email: 'client@example.com',
      name: 'Client Test',
      token: 'raw-token',
      code: '123456',
    });

    expect(mailer.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('Код за потвърждение: 123456'),
        html: expect.stringContaining('123456'),
      }),
    );
  });

  it('returns failed status with provider error details', async () => {
    const { service, mailer } = createService();
    const error = Object.assign(new Error('SMTP rejected recipient'), { code: 'EENVELOPE' });
    mailer.sendMail.mockRejectedValue(error);

    const result = await service.sendPasswordReset({
      email: 'client@example.com',
      token: 'reset-token',
    });

    expect(result).toEqual({
      status: 'failed',
      errorCode: 'EENVELOPE',
      errorMessage: 'SMTP rejected recipient',
    });
  });

  it('skips account email when recipient is missing', async () => {
    const { service, mailer } = createService();

    const result = await service.sendPasswordChanged({ email: '' });

    expect(result).toEqual({
      status: 'skipped',
      errorCode: 'missing_recipient',
      errorMessage: 'Missing recipient email',
    });
    expect(mailer.sendMail).not.toHaveBeenCalled();
  });
});
