import { UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard account status', () => {
  const secret = 'jwt-auth-guard-test-secret';
  const token = jwt.sign({ id: 7, role: 'worker' }, secret);
  const context = (request: any) => ({ switchToHttp: () => ({ getRequest: () => request }) }) as any;
  const config = { get: (key: string) => (key === 'JWT_SECRET' ? secret : 'test') };

  it('uses the current database role for active accounts', async () => {
    const repo = { findOne: jest.fn().mockResolvedValue({ id: 7, role: 'admin', status: 'active' }) };
    const guard = new JwtAuthGuard(config as any, { getRepository: () => repo } as any);
    const request = { headers: { authorization: `Bearer ${token}` } };
    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(request).toHaveProperty('user.role', 'admin');
  });

  it('invalidates an already-issued token after suspension', async () => {
    const repo = { findOne: jest.fn().mockResolvedValue({ id: 7, role: 'worker', status: 'suspended' }) };
    const guard = new JwtAuthGuard(config as any, { getRepository: () => repo } as any);
    await expect(guard.canActivate(context({ headers: { authorization: `Bearer ${token}` } }))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
