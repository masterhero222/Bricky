import {
  normalizeWorkerPhone,
  WorkerProfileCompletionService,
} from './worker-profile-completion.service';

describe('WorkerProfileCompletionService', () => {
  const service = new WorkerProfileCompletionService();

  it('normalizes common Bulgarian and international phone formats', () => {
    expect(normalizeWorkerPhone('0888 123 456')).toBe('+359888123456');
    expect(normalizeWorkerPhone('+44 7700 900123')).toBe('+447700900123');
    expect(normalizeWorkerPhone('abc')).toBeNull();
  });

  it('returns zero and actionable missing items for an empty legacy profile', () => {
    const result = service.calculate(
      {
        userId: 22,
        publicName: 'Майстор #22',
        phonePrivate: null,
        city: null,
        bio: '   ',
        workType: null,
        availabilityStatus: null,
        acquisitionSourceSelfReported: null,
        onboardingStep: 1,
        onboardingCompletedAt: null,
      } as any,
      [],
      [],
    );

    expect(result.percentage).toBe(0);
    expect(result.missingItems.map((item) => item.key)).toContain('phone');
    expect(result.onboardingStatus).toBe('not_started');
  });

  it('awards only the name points for a minimal identifiable profile', () => {
    const result = service.calculate(
      {
        publicName: 'Иван Петров',
        onboardingStep: 1,
        onboardingCompletedAt: null,
      } as any,
      [],
      [],
    );

    expect(result.percentage).toBe(10);
    expect(result.nextRecommendedAction?.key).toBe('phone');
  });

  it('calculates partial completion deterministically', () => {
    const result = service.calculate(
      {
        publicName: 'Иван Петров',
        phonePrivate: '+359888123456',
        city: 'София',
        bio: 'Кратко професионално представяне.',
        onboardingStep: 2,
        onboardingCompletedAt: null,
      } as any,
      [],
      [],
    );

    expect(result.percentage).toBe(40);
    expect(result.onboardingStatus).toBe('in_progress');
  });

  it('reaches 100 only from canonical profile data and approved media', () => {
    const result = service.calculate(
      {
        publicName: 'Иван Петров',
        phonePrivate: '+359888123456',
        city: 'София',
        bio: 'Работя професионално с вътрешни ремонти.',
        workType: 'solo',
        availabilityStatus: 'yes',
        acquisitionSourceSelfReported: 'google_search',
        onboardingStep: 4,
        onboardingCompletedAt: new Date(),
      } as any,
      [{ categoryKey: 'vik' } as any],
      [
        { kind: 'worker_avatar', moderationStatus: 'approved' },
        { kind: 'worker_gallery', moderationStatus: 'approved' },
        { kind: 'worker_gallery', moderationStatus: 'approved' },
        { kind: 'worker_gallery', moderationStatus: 'approved' },
      ],
    );

    expect(result.percentage).toBe(100);
    expect(result.missingItems).toEqual([]);
    expect(result.onboardingStatus).toBe('completed');
  });

  it('does not count pending media as public profile completion', () => {
    const result = service.calculate(
      {
        publicName: 'Иван Петров',
        onboardingStep: 1,
        onboardingCompletedAt: null,
      } as any,
      [],
      [
        { kind: 'worker_avatar', moderationStatus: 'pending' },
        { kind: 'worker_gallery', moderationStatus: 'pending' },
      ],
    );

    expect(result.missingItems.map((item) => item.key)).toEqual(
      expect.arrayContaining(['avatar', 'gallery_one', 'gallery_three']),
    );
    expect(result.pendingModerationItems).toEqual(
      expect.arrayContaining(['worker_avatar', 'worker_gallery']),
    );
  });
});
