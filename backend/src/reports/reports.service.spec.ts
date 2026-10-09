import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  function setup(
    options: { target?: object | null; duplicate?: object | null } = {},
  ) {
    const reports = {
      findOne: jest.fn().mockResolvedValue(options.duplicate ?? null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 9, ...value })),
      find: jest.fn(),
    };
    const target = Object.prototype.hasOwnProperty.call(options, 'target')
      ? options.target
      : { id: 10 };
    const targetRepo = { findOne: jest.fn().mockResolvedValue(target) };
    const service = new ReportsService(
      reports as never,
      targetRepo as never,
      targetRepo as never,
      targetRepo as never,
    );
    return { service, reports };
  }

  it('creates a validated open report', async () => {
    const { service, reports } = setup();
    const result = await service.create(3, {
      targetType: 'request',
      targetId: 10,
      category: 'misleading',
      details: 'Описанието не отговаря на снимките.',
    });

    expect(result).toEqual({ ok: true, reportId: 9, duplicate: false });
    expect(reports.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'open' }),
    );
  });

  it('is idempotent for an existing open report', async () => {
    const { service, reports } = setup({ duplicate: { id: 7 } });
    await expect(
      service.create(3, {
        targetType: 'media',
        targetId: 10,
        category: 'inappropriate',
      }),
    ).resolves.toEqual({ ok: true, reportId: 7, duplicate: true });
    expect(reports.save).not.toHaveBeenCalled();
  });

  it('rejects missing targets and self-reporting', async () => {
    const missing = setup({ target: null });
    await expect(
      missing.service.create(3, {
        targetType: 'request',
        targetId: 10,
        category: 'other',
        details: 'Достатъчно подробно описание.',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    const self = setup();
    await expect(
      self.service.create(3, {
        targetType: 'worker_profile',
        targetId: 3,
        category: 'other',
        details: 'Достатъчно подробно описание.',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
