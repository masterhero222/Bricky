import { ForbiddenException } from '@nestjs/common';
import { VerifiedAccountGuard } from './verified-account.guard';

describe('VerifiedAccountGuard', () => {
  const context = (request: any) => ({ switchToHttp: () => ({ getRequest: () => request }) }) as any;

  const createGuard = (user: any) => {
    const repo = { findOne: jest.fn().mockResolvedValue(user) };
    return {
      guard: new VerifiedAccountGuard({ getRepository: () => repo } as any),
      repo,
    };
  };

  it('allows verified active users', async () => {
    const { guard } = createGuard({
      id: 7,
      role: 'client',
      accountStatus: 'active',
      emailVerificationRequired: true,
      emailVerifiedAt: new Date(),
    });

    await expect(guard.canActivate(context({ user: { id: 7 } }))).resolves.toBe(true);
  });

  it('blocks unverified users when verification is required', async () => {
    const { guard } = createGuard({
      id: 7,
      role: 'worker',
      accountStatus: 'active',
      emailVerificationRequired: true,
      emailVerifiedAt: null,
    });

    await expect(guard.canActivate(context({ user: { id: 7 } }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows admin accounts', async () => {
    const { guard } = createGuard({
      id: 1,
      role: 'admin',
      accountStatus: 'active',
      emailVerificationRequired: true,
      emailVerifiedAt: null,
    });

    await expect(guard.canActivate(context({ user: { id: 1 } }))).resolves.toBe(true);
  });

  it('blocks suspended accounts', async () => {
    const { guard } = createGuard({
      id: 7,
      role: 'client',
      accountStatus: 'suspended',
      emailVerificationRequired: false,
      emailVerifiedAt: null,
    });

    await expect(guard.canActivate(context({ user: { id: 7 } }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
