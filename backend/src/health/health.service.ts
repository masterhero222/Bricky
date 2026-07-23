import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { access } from 'fs/promises';
import { constants } from 'fs';
import { DataSource } from 'typeorm';
import { getUploadsRoot } from '../common/storage-paths';

@Injectable()
export class HealthService {
  constructor(private readonly dataSource: DataSource) {}

  async readiness() {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw this.unavailable('unavailable', 'unknown');
    }

    try {
      await access(getUploadsRoot(), constants.R_OK | constants.W_OK);
    } catch {
      throw this.unavailable('ok', 'unavailable');
    }

    return {
      status: 'ok',
      database: 'ok',
      storage: 'ok',
      commit: process.env.APP_COMMIT_SHA || null,
      timestamp: new Date().toISOString(),
    };
  }

  private unavailable(database: 'ok' | 'unavailable', storage: 'unknown' | 'unavailable') {
    return new ServiceUnavailableException({
      status: 'unavailable',
      database,
      storage,
      timestamp: new Date().toISOString(),
    });
  }
}
