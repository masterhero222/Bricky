import { ForbiddenException } from '@nestjs/common';
import { AdminRoleGuard } from './admin-role.guard';

describe('AdminRoleGuard', () => {
  const context = (role: string) => ({
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  }) as any;

  it('allows admins', () => expect(new AdminRoleGuard().canActivate(context('admin'))).toBe(true));
  it('rejects non-admin users', () => expect(() => new AdminRoleGuard().canActivate(context('worker'))).toThrow(ForbiddenException));
});

