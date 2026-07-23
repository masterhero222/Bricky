import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { MailService } from './mail.service';

type TestMail = {
  from: string;
  to: string;
  subject: string;
  html: string;
};

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));

describe('MailService', () => {
  let deliveredMessage: TestMail | undefined;
  const sendMail = jest.fn((message: TestMail) => {
    deliveredMessage = message;
    return Promise.resolve({ messageId: 'test-message' });
  });
  let service: MailService;

  beforeEach(() => {
    deliveredMessage = undefined;
    sendMail.mockClear();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });

    const config = new ConfigService({
      MAIL_HOST: 'smtp.bricky.test',
      MAIL_PORT: 587,
      MAIL_USER: 'mailer',
      MAIL_PASS: 'password',
      MAIL_FROM: 'Bricky <no-reply@bricky.test>',
    });
    service = new MailService(config);
  });

  it('creates a transport that cannot read local files or remote URLs', () => {
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.bricky.test',
        port: 587,
        secure: false,
        disableFileAccess: true,
        disableUrlAccess: true,
      }),
    );
  });

  it('does not send when the request has no email address', async () => {
    await service.sendRequestConfirmation({ email: '' });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('renders escaped client data into the fixed confirmation template', async () => {
    await service.sendRequestConfirmation({
      email: 'client@bricky.test',
      clientName: '<script>alert(1)</script>',
    });

    expect(deliveredMessage).toMatchObject({
      from: 'Bricky <no-reply@bricky.test>',
      to: 'client@bricky.test',
      subject: 'Приета заявка – Bricky',
    });
    expect(deliveredMessage?.html).toContain(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    );
  });
});
