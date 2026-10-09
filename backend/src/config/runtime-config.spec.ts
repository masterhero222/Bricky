import {
  getCorsOrigins,
  getJwtSecret,
  validateRuntimeConfig,
} from './runtime-config';

const productionEnv = {
  NODE_ENV: 'production',
  DB_HOST: '127.0.0.1',
  DB_PORT: '3306',
  DB_USER: 'bricky_app',
  DB_PASS: 'database-password',
  DB_NAME: 'bricky',
  JWT_SECRET: 'a-production-secret-with-more-than-32-characters',
  TYPEORM_SYNCHRONIZE: 'false',
};

describe('runtime configuration', () => {
  it('refuses to start production without a JWT secret', () => {
    expect(() =>
      validateRuntimeConfig({ ...productionEnv, JWT_SECRET: '' }),
    ).toThrow('JWT_SECRET is required');
  });

  it.each(['supersecretkey', 'short-secret'])(
    'rejects unsafe production JWT secret %s',
    (secret) => {
      expect(() =>
        validateRuntimeConfig({ ...productionEnv, JWT_SECRET: secret }),
      ).toThrow('JWT_SECRET must be at least 32 characters');
    },
  );

  it('requires synchronize to be explicitly disabled in production', () => {
    expect(() =>
      validateRuntimeConfig({
        ...productionEnv,
        TYPEORM_SYNCHRONIZE: 'true',
      }),
    ).toThrow('TYPEORM_SYNCHRONIZE must be explicitly set to false');
  });

  it('requires all production database settings', () => {
    expect(() =>
      validateRuntimeConfig({ ...productionEnv, DB_PASS: '' }),
    ).toThrow('DB_PASS');
  });

  it('accepts the complete production configuration', () => {
    expect(() => validateRuntimeConfig(productionEnv)).not.toThrow();
  });

  it('uses a development-only secret outside production', () => {
    expect(getJwtSecret({ NODE_ENV: 'test' })).toContain('development-only');
  });

  it('parses and de-duplicates configured CORS origins', () => {
    expect(
      getCorsOrigins({
        CORS_ORIGINS:
          'https://bricky.bg, https://www.bricky.bg,https://bricky.bg',
      }),
    ).toEqual(['https://bricky.bg', 'https://www.bricky.bg']);
  });

  it('does not allow HTTP or IP origins by default in production', () => {
    expect(getCorsOrigins({ NODE_ENV: 'production' })).toEqual([
      'https://bricky.bg',
      'https://www.bricky.bg',
    ]);
  });
});
