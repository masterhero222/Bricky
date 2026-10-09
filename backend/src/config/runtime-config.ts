const DEVELOPMENT_JWT_SECRET =
  'bricky-development-only-secret-change-before-production';

const FORBIDDEN_PRODUCTION_SECRETS = new Set([
  'supersecretkey',
  'secret',
  'changeme',
  DEVELOPMENT_JWT_SECRET,
]);

export type RuntimeEnvironment = NodeJS.ProcessEnv;

export function getJwtSecret(env: RuntimeEnvironment = process.env): string {
  const secret = env.JWT_SECRET?.trim();
  const isProduction = env.NODE_ENV === 'production';

  if (!secret) {
    if (isProduction) {
      throw new Error('JWT_SECRET is required in production.');
    }

    return DEVELOPMENT_JWT_SECRET;
  }

  if (
    isProduction &&
    (secret.length < 32 ||
      FORBIDDEN_PRODUCTION_SECRETS.has(secret.toLowerCase()))
  ) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters and must not use a known default in production.',
    );
  }

  return secret;
}

export function getCorsOrigins(
  env: RuntimeEnvironment = process.env,
): string[] {
  const configured = env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured?.length) {
    return [...new Set(configured)];
  }

  if (env.NODE_ENV === 'production') {
    return ['https://bricky.bg', 'https://www.bricky.bg'];
  }

  return [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
  ];
}

export function validateRuntimeConfig(
  env: RuntimeEnvironment = process.env,
): void {
  getJwtSecret(env);

  if (env.NODE_ENV !== 'production') {
    return;
  }

  if (
    env.EMAIL_VERIFICATION_MODE &&
    !['transitional', 'required'].includes(env.EMAIL_VERIFICATION_MODE)
  ) {
    throw new Error(
      'EMAIL_VERIFICATION_MODE must be transitional or required.',
    );
  }

  const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASS', 'DB_NAME'];
  const missing = required.filter((key) => !env[key]?.trim());

  if (missing.length) {
    throw new Error(
      `Missing required production environment variables: ${missing.join(', ')}`,
    );
  }

  if (env.TYPEORM_SYNCHRONIZE !== 'false') {
    throw new Error(
      'TYPEORM_SYNCHRONIZE must be explicitly set to false in production.',
    );
  }

  const port = Number(env.DB_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be a valid TCP port.');
  }
}
