import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy session invalidation', () => {
  const config = new ConfigService({ NODE_ENV: 'test' });

  it('accepts current and legacy version-zero sessions for active users', async () => {
    const users = {
      findOne: jest.fn().mockResolvedValue({ id: 12, status: 'active', authVersion: 0 }),
    };
    const strategy = new JwtStrategy(config, users as any);

    await expect(strategy.validate({ id: 12, role: 'client' })).resolves.toEqual({
      id: 12,
      role: 'client',
      authVersion: 0,
    });
  });

  it('rejects old sessions after a password reset increments the version', async () => {
    const users = {
      findOne: jest.fn().mockResolvedValue({ id: 12, status: 'active', authVersion: 1 }),
    };
    const strategy = new JwtStrategy(config, users as any);

    await expect(
      strategy.validate({ id: 12, role: 'client', authVersion: 0 }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
