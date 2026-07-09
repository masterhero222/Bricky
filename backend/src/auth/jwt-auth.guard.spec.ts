import { UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard account status', () => {
  const secret = process.env.JWT_SECRET || 'supersecretkey';
  const token = jwt.sign({ id: 7, role: 'worker' }, secret);
  const context = (request: any) => ({ switchToHttp: () => ({ getRequest: () => request }) }) as any;

  it('uses the current database role for active accounts', async () => {
    const repo = { findOne: jest.fn().mockResolvedValue({ id: 7, role: 'admin', accountStatus: 'active', tokenVersion: 0 }) };
    const guard = new JwtAuthGuard({ getRepository: () => repo } as any);
    const request = { headers: { authorization: `Bearer ${token}` } };
    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(request).toHaveProperty('user.role', 'admin');
  });

  it('invalidates an already-issued token after suspension', async () => {
    const repo = { findOne: jest.fn().mockResolvedValue({ id: 7, role: 'worker', accountStatus: 'suspended', tokenVersion: 0 }) };
    const guard = new JwtAuthGuard({ getRepository: () => repo } as any);
    await expect(guard.canActivate(context({ headers: { authorization: `Bearer ${token}` } }))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('invalidates an already-issued token after token version changes', async () => {
    const versionedToken = jwt.sign({ id: 7, role: 'worker', tokenVersion: 2 }, secret);
    const repo = { findOne: jest.fn().mockResolvedValue({ id: 7, role: 'worker', accountStatus: 'active', tokenVersion: 3 }) };
    const guard = new JwtAuthGuard({ getRepository: () => repo } as any);
    await expect(guard.canActivate(context({ headers: { authorization: `Bearer ${versionedToken}` } }))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
