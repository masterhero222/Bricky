import { HttpException, HttpStatus } from '@nestjs/common';
import { AuthRateLimitService } from './auth-rate-limit.service';

describe('AuthRateLimitService', () => {
  afterEach(() => jest.useRealTimers());

  it('blocks requests after the configured limit', () => {
    const service = new AuthRateLimitService();
    service.consume('login', '127.0.0.1', 2, 60_000);
    service.consume('login', '127.0.0.1', 2, 60_000);

    expect(() => service.consume('login', '127.0.0.1', 2, 60_000)).toThrow(
      HttpException,
    );

    try {
      service.consume('login', '127.0.0.1', 2, 60_000);
    } catch (error) {
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  });

  it('starts a fresh window after the previous one expires', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-08T10:00:00Z'));
    const service = new AuthRateLimitService();
    service.consume('reset', '127.0.0.1', 1, 60_000);
    jest.setSystemTime(new Date('2026-08-08T10:01:01Z'));

    expect(() =>
      service.consume('reset', '127.0.0.1', 1, 60_000),
    ).not.toThrow();
  });

  it('keeps scopes and trackers independent', () => {
    const service = new AuthRateLimitService();
    service.consume('login', 'first', 1, 60_000);

    expect(() => service.consume('login', 'second', 1, 60_000)).not.toThrow();
    expect(() => service.consume('reset', 'first', 1, 60_000)).not.toThrow();
  });
});
