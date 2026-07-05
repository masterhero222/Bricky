import { AdminService } from './admin.service';

describe('AdminService', () => {
  const requests: any = { findOne: jest.fn(), save: jest.fn(), count: jest.fn(), find: jest.fn() };
  const media: any = { findOne: jest.fn(), save: jest.fn(), count: jest.fn(), find: jest.fn() };
  const audit: any = { create: jest.fn((value) => value), save: jest.fn(), find: jest.fn() };
  const service = new AdminService(requests, media, audit);

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

  it('keeps media approval compatibility in sync', async () => {
    const image: any = { id: 12, moderationStatus: 'pending_review', isApproved: false };
    media.findOne.mockResolvedValue(image);
    media.save.mockImplementation((value) => value);
    audit.save.mockImplementation((value) => value);

    await service.moderateMedia(12, 'approved', 99);

    expect(image.isApproved).toBe(true);
    expect(audit.save).toHaveBeenCalled();
  });
});
