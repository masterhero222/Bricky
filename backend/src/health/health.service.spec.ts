import { ServiceUnavailableException } from '@nestjs/common';
import { access } from 'fs/promises';
import { HealthService } from './health.service';

jest.mock('fs/promises', () => ({ access: jest.fn() }));

describe('HealthService', () => {
  const mockedAccess = access as jest.MockedFunction<typeof access>;

  afterEach(() => {
    jest.resetAllMocks();
    delete process.env.APP_COMMIT_SHA;
  });

  it('reports ready only after database and storage checks pass', async () => {
    process.env.APP_COMMIT_SHA = 'test-commit';
    const dataSource = { query: jest.fn().mockResolvedValue([{ 1: 1 }]), isInitialized: true };
    mockedAccess.mockResolvedValue(undefined);
    const service = new HealthService(dataSource as any);

    await expect(service.readiness()).resolves.toEqual(
      expect.objectContaining({
        status: 'ok',
        database: 'ok',
        storage: 'ok',
        commit: 'test-commit',
      }),
    );
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
    expect(mockedAccess).toHaveBeenCalledTimes(1);
  });

  it('returns service unavailable when a dependency check fails', async () => {
    const dataSource = { query: jest.fn().mockRejectedValue(new Error('offline')), isInitialized: false };
    const service = new HealthService(dataSource as any);

    await expect(service.readiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('identifies a storage failure after the database check passes', async () => {
    const dataSource = { query: jest.fn().mockResolvedValue([{ 1: 1 }]), isInitialized: true };
    mockedAccess.mockRejectedValue(new Error('read only'));
    const service = new HealthService(dataSource as any);

    await expect(service.readiness()).rejects.toMatchObject({
      response: expect.objectContaining({ database: 'ok', storage: 'unavailable' }),
    });
  });
});
