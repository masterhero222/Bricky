import { MediaModerationService } from './media-moderation.service';

describe('MediaModerationService', () => {
  const requestMedia: any = { findOne: jest.fn(), save: jest.fn() };
  const galleryMedia: any = { findOne: jest.fn(), save: jest.fn() };
  const workers: any = { findOne: jest.fn(), save: jest.fn() };
  const audit: any = { create: jest.fn((value) => value), save: jest.fn() };
  const notifications: any = { create: jest.fn() };
  const service = new MediaModerationService(requestMedia, galleryMedia, workers, audit, notifications);

  beforeEach(() => jest.clearAllMocks());

  it('uses the shared rejection policy and notifies a request-image uploader', async () => {
    const image = { id: 7, requestId: 5, uploaderUserId: 101, moderationStatus: 'pending_review', moderationReason: null, isApproved: false };
    requestMedia.findOne.mockResolvedValue(image);
    requestMedia.save.mockImplementation((value) => value);
    await service.moderateRequestImage(7, 'rejected', 999, 'Лични данни', '127.0.0.1');
    expect(image.moderationStatus).toBe('rejected');
    expect(notifications.create).toHaveBeenCalledWith(101, expect.objectContaining({ type: 'request_media_rejected', requestId: 5 }));
    expect(audit.save).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'request_media', action: 'rejected' }));
  });

  it('requires a reason for every non-approval media decision', async () => {
    requestMedia.findOne.mockResolvedValue({ id: 7, moderationStatus: 'pending_review' });
    await expect(service.moderateRequestImage(7, 'hidden', 999)).rejects.toThrow('Reason is required');
    expect(requestMedia.save).not.toHaveBeenCalled();
  });
});
