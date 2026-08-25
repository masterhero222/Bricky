import { Injectable } from '@nestjs/common';
import { WorkerProfileEntity } from './worker-profile.entity';
import { WorkerSkillEntity } from './worker-skill.entity';

type CompletionMedia = {
  kind?: string;
  moderationStatus?: string;
};

export function normalizeWorkerPhone(value: unknown): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const compact = raw.replace(/[\s().-]/g, '');
  if (compact.startsWith('+')) {
    const international = `+${compact.slice(1).replace(/\D/g, '')}`;
    return /^\+[1-9]\d{7,14}$/.test(international) ? international : null;
  }

  const digits = compact.replace(/\D/g, '');
  if (/^00359\d{8,9}$/.test(digits)) return `+${digits.slice(2)}`;
  if (/^359\d{8,9}$/.test(digits)) return `+${digits}`;
  if (/^0\d{9}$/.test(digits)) return `+359${digits.slice(1)}`;
  return null;
}

export type WorkerProfileMissingItem = {
  key: string;
  label: string;
  points: number;
  target: string;
};

export type WorkerProfileCompletion = {
  percentage: number;
  score: number;
  missingItems: WorkerProfileMissingItem[];
  pendingModerationItems: string[];
  nextRecommendedAction: WorkerProfileMissingItem | null;
  onboardingStatus: 'not_started' | 'in_progress' | 'completed';
};

@Injectable()
export class WorkerProfileCompletionService {
  calculate(
    profile: WorkerProfileEntity,
    skills: WorkerSkillEntity[],
    media: CompletionMedia[],
  ): WorkerProfileCompletion {
    const missingItems: WorkerProfileMissingItem[] = [];
    let score = 0;

    const add = (
      complete: boolean,
      points: number,
      key: string,
      label: string,
      target: string,
    ) => {
      if (complete) score += points;
      else missingItems.push({ key, label, points, target });
    };

    const name = this.clean(profile.publicName);
    const hasRealName = Boolean(name && !/^Майстор #\d+$/i.test(name));
    const approvedAvatar = media.some(
      (item) =>
        item.kind === 'worker_avatar' && item.moderationStatus === 'approved',
    );
    const approvedGalleryCount = media.filter(
      (item) =>
        item.kind === 'worker_gallery' && item.moderationStatus === 'approved',
    ).length;
    const pendingModerationItems = Array.from(
      new Set(
        media
          .filter((item) => item.moderationStatus === 'pending')
          .map((item) => String(item.kind || 'media')),
      ),
    );

    add(hasRealName, 10, 'public_name', 'Добави име', 'profile:basic');
    add(
      this.isValidPhone(profile.phonePrivate),
      10,
      'phone',
      'Добави телефон за връзка',
      'onboarding:contact',
    );
    add(
      Boolean(this.clean(profile.city)),
      10,
      'service_area',
      'Добави град или район на работа',
      'onboarding:activity',
    );
    add(
      skills.length > 0,
      15,
      'skills',
      'Добави основна категория и специалности',
      'onboarding:activity',
    );
    add(
      Boolean(this.clean(profile.bio)),
      10,
      'bio',
      'Напиши кратко професионално представяне',
      'profile:about',
    );
    add(
      approvedAvatar,
      10,
      'avatar',
      pendingModerationItems.includes('worker_avatar')
        ? 'Профилната снимка чака одобрение'
        : 'Добави профилна снимка',
      'profile:avatar',
    );
    add(
      approvedGalleryCount >= 1,
      10,
      'gallery_one',
      pendingModerationItems.includes('worker_gallery')
        ? 'Снимките от обекти чакат одобрение'
        : 'Качи снимка от реален обект',
      'profile:gallery',
    );
    add(
      approvedGalleryCount >= 3,
      15,
      'gallery_three',
      'Качи поне 3 одобрени снимки от реални обекти',
      'profile:gallery',
    );
    add(
      Boolean(profile.workType && profile.availabilityStatus),
      5,
      'work_readiness',
      'Добави работен тип и текуща заетост',
      'onboarding:activity',
    );
    add(
      Boolean(
        profile.acquisitionSourceSelfReported &&
          profile.onboardingCompletedAt,
      ),
      5,
      'onboarding',
      'Завърши краткия onboarding',
      'onboarding:acquisition',
    );

    const percentage = Math.min(100, Math.max(0, Math.round(score)));
    const onboardingStatus = profile.onboardingCompletedAt
      ? 'completed'
      : Number(profile.onboardingStep || 1) > 1
        ? 'in_progress'
        : 'not_started';

    return {
      percentage,
      score: percentage,
      missingItems,
      pendingModerationItems,
      nextRecommendedAction: missingItems[0] || null,
      onboardingStatus,
    };
  }

  normalizePhone(value: unknown): string | null {
    return normalizeWorkerPhone(value);
  }

  isValidPhone(value: unknown): boolean {
    return Boolean(this.normalizePhone(value));
  }

  private clean(value: unknown): string {
    return String(value || '').trim();
  }
}
