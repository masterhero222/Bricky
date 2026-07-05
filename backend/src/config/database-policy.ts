export type DatabasePolicyEnvironment = {
  NODE_ENV?: string;
  TYPEORM_SYNCHRONIZE?: string;
};

export function resolveTypeOrmSynchronize(
  environment: DatabasePolicyEnvironment = {
    NODE_ENV: process.env.NODE_ENV,
    TYPEORM_SYNCHRONIZE: process.env.TYPEORM_SYNCHRONIZE,
  },
): boolean {
  const synchronize = String(environment.TYPEORM_SYNCHRONIZE || '').toLowerCase() === 'true';
  const production = String(environment.NODE_ENV || '').toLowerCase() === 'production';

  if (production && synchronize) {
    throw new Error(
      'TYPEORM_SYNCHRONIZE=true is forbidden in production. Apply reviewed versioned migrations instead.',
    );
  }

  return synchronize;
}
