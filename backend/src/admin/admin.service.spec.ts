import { AdminService } from './admin.service';

describe('AdminService', () => {
  const requests: any = { findOne: jest.fn(), save: jest.fn(), count: jest.fn(), find: jest.fn() };
  const media: any = { findOne: jest.fn(), save: jest.fn(), count: jest.fn(), find: jest.fn() };
  const workers: any = { findOne: jest.fn(), save: jest.fn(), count: jest.fn(), find: jest.fn() };
  const gallery: any = { findOne: jest.fn(), save: jest.fn(), count: jest.fn(), find: jest.fn() };
  const reviews: any = { findOne: jest.fn(), save: jest.fn(), count: jest.fn(), find: jest.fn() };
  const users: any = { findOne: jest.fn(), save: jest.fn(), find: jest.fn() };
  const audit: any = { create: jest.fn((value) => value), save: jest.fn(), find: jest.fn() };
  const notifications: any = { create: jest.fn().mockResolvedValue({ id: 1 }) };
  const mediaModeration: any = { moderateRequestImage: jest.fn(), moderateGalleryImage: jest.fn(), moderateAvatar: jest.fn() };
  const service = new AdminService(requests, media, workers, gallery, reviews, users, audit, notifications, mediaModeration);

  beforeEach(() => jest.clearAllMocks());

  it('approves a request and writes an audit record', async () => {
    const request: any = { id: 7, moderationStatus: 'pending_review' };
    requests.findOne.mockResolvedValue(request);
    requests.save.mockImplementation((value) => value);
    audit.save.mockImplementation((value) => value);

    await service.moderateRequest(7, 'approved', 99);

    expect(request.moderationStatus).toBe('approved');
    expect(request.moderatedByUserId).toBe(99);
    expect(audit.save).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'request', entityId: 7, action: 'approved' }));
  });

  it('approves worker profiles and keeps the legacy flag aligned', async () => {
    const worker: any = { id: 4, moderationStatus: 'pending_review', isApproved: false };
    workers.findOne.mockResolvedValue(worker);
    workers.save.mockImplementation((value) => value);
    audit.save.mockImplementation((value) => value);
    await service.moderateWorker(4, 'profile', 'approved', 99);
    expect(worker.isApproved).toBe(true);
    expect(audit.save).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'worker_profile' }));
  });

  it('never returns password hashes from the user queue', async () => {
    users.find.mockResolvedValue([{ id: 1, email: 'user@example.test', password: 'secret', role: 'client' }]);
    await expect(service.listUsers()).resolves.toEqual([{ id: 1, email: 'user@example.test', role: 'client' }]);
  });

  it('keeps media approval compatibility in sync', async () => {
    const image: any = { id: 12, moderationStatus: 'pending_review', isApproved: false };
    mediaModeration.moderateRequestImage.mockResolvedValue(image);

    await service.moderateMedia(12, 'approved', 99);

    expect(mediaModeration.moderateRequestImage).toHaveBeenCalledWith(12, 'approved', 99, undefined, undefined);
  });

  it('requires a reason for non-approval moderation actions', async () => {
    await expect(service.moderateRequest(7, 'rejected', 99)).rejects.toThrow('Reason is required');
    expect(requests.findOne).not.toHaveBeenCalled();
  });

  it('filters and paginates audit records', async () => {
    audit.find.mockResolvedValue([
      { id: 3, adminUserId: 99, entityType: 'request', entityId: 7, action: 'approved', reason: null },
      { id: 2, adminUserId: 99, entityType: 'user', entityId: 8, action: 'suspend', reason: 'spam' },
      { id: 1, adminUserId: 42, entityType: 'request', entityId: 9, action: 'rejected', reason: 'missing details' },
    ]);

    await expect(service.listAudit('spam', 'suspend', 'user', 1, 25)).resolves.toEqual([
      expect.objectContaining({ id: 2, action: 'suspend', entityType: 'user' }),
    ]);
  });
});
