import { BadRequestException } from '@nestjs/common';
import { WorkersController } from './workers.controller';

describe('WorkersController permissions', () => {
  let controller: WorkersController;
  let service: any;

  beforeEach(() => {
    service = {
      findByUserId: jest.fn(),
      createWorkerProfile: jest.fn(),
      updateProfileByUserId: jest.fn(),
      getGalleryByUserId: jest.fn(),
      addGalleryImages: jest.fn(),
      deleteGalleryImage: jest.fn(),
      getHistoryByUserId: jest.fn(),
    };
    controller = new WorkersController(service);
  });

  it.each([
    ['profile read', () => controller.me({ user: { id: 101, role: 'client' } })],
    ['profile update', () => controller.updateMe({ user: { id: 101, role: 'client' } }, {})],
    ['avatar upload', () => controller.uploadAvatar({ user: { id: 101, role: 'client' } }, null)],
    ['gallery read', () => controller.myGallery({ user: { id: 101, role: 'client' } })],
    ['gallery upload', () => controller.uploadGallery({ user: { id: 101, role: 'client' } }, [])],
    ['gallery delete', () => controller.deleteGallery({ user: { id: 101, role: 'client' } }, '1')],
    ['history read', () => controller.myHistory({ user: { id: 101, role: 'client' } })],
  ])('blocks client access to worker-only %s', async (_label, action) => {
    await expect(action()).rejects.toBeInstanceOf(BadRequestException);
  });
});
