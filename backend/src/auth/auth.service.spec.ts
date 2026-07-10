import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

describe('AuthService email verification gate', () => {
  const baseUser = {
    id: 1008,
    role: 'client',
    name: 'Client Test',
    email: 'client@example.com',
    password: '',
    accountStatus: 'active' as const,
    emailVerificationRequired: true,
    emailVerifiedAt: null,
    tokenVersion: 0,
  };

  const createService = (user: any) => {
    const users = {
      findByEmail: jest.fn().mockResolvedValue(user),
    };
    const workers = {};
    const accountSecurity = {};
    const mail = {};
    const jwt = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
    };

    return {
      service: new AuthService(users as any, workers as any, accountSecurity as any, mail as any, jwt as any),
      jwt,
    };
  };

  it('rejects login before email confirmation', async () => {
    const password = await bcrypt.hash('secret123', 10);
    const { service } = createService({ ...baseUser, password });

    await expect(service.login({ email: baseUser.email, password: 'secret123' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('issues a JWT after email confirmation', async () => {
    const password = await bcrypt.hash('secret123', 10);
    const { service, jwt } = createService({
      ...baseUser,
      password,
      emailVerifiedAt: new Date('2026-07-10T10:00:00.000Z'),
    });

    const result = await service.login({ email: baseUser.email, password: 'secret123' });

    expect(result.token).toBe('signed-token');
    expect(jwt.signAsync).toHaveBeenCalledWith({ id: baseUser.id, role: baseUser.role, tokenVersion: 0 });
  });
});
