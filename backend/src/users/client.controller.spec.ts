import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClientController } from './client.controller';

describe('ClientController', () => {
  const users = {
    findClientProfile: jest.fn(),
  };
  const controller = new ClientController(users as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the private profile of the authenticated client', async () => {
    users.findClientProfile.mockResolvedValue({
      userId: 42,
      displayName: 'Test Client',
      phonePrivate: '0888000000',
      defaultAddress: 'Sofia',
      user: { email: 'client@example.test' },
    });

    await expect(
      controller.getMyProfile({ user: { id: 42, role: 'client' } }),
    ).resolves.toEqual({
      userId: 42,
      name: 'Test Client',
      phone: '0888000000',
      email: 'client@example.test',
      address: 'Sofia',
    });
    expect(users.findClientProfile).toHaveBeenCalledWith(42);
  });

  it('rejects non-client roles', async () => {
    await expect(
      controller.getMyProfile({ user: { id: 7, role: 'worker' } }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(users.findClientProfile).not.toHaveBeenCalled();
  });

  it('returns not found when the client profile is missing', async () => {
    users.findClientProfile.mockResolvedValue(null);

    await expect(
      controller.getMyProfile({ user: { id: 42, role: 'client' } }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
