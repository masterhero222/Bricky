import { resolveTypeOrmSynchronize } from './database-policy';

describe('database policy', () => {
  it('defaults synchronization to false', () => {
    expect(resolveTypeOrmSynchronize({ NODE_ENV: undefined, TYPEORM_SYNCHRONIZE: undefined })).toBe(false);
  });

  it('allows synchronization in an isolated test environment', () => {
    expect(resolveTypeOrmSynchronize({ NODE_ENV: 'test', TYPEORM_SYNCHRONIZE: 'true' })).toBe(true);
  });

  it('keeps synchronization disabled in production', () => {
    expect(resolveTypeOrmSynchronize({ NODE_ENV: 'production', TYPEORM_SYNCHRONIZE: 'false' })).toBe(false);
  });

  it('refuses to start production with automatic synchronization enabled', () => {
    expect(() =>
      resolveTypeOrmSynchronize({ NODE_ENV: 'production', TYPEORM_SYNCHRONIZE: 'true' }),
    ).toThrow('TYPEORM_SYNCHRONIZE=true is forbidden in production');
  });
});
