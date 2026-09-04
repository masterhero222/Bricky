import { BadRequestException } from '@nestjs/common';
import { GeocodingService } from './geocoding.service';

describe('GeocodingService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('finds a Bulgarian address and returns map coordinates', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([
        {
          lat: '42.6847312',
          lon: '23.3189021',
          display_name: 'бул. България 1, София, България',
        },
      ]),
    } as any);

    const result = await new GeocodingService().geocode(
      'София, бул. България 1',
    );

    expect(result).toEqual({
      latitude: 42.6847312,
      longitude: 23.3189021,
      displayName: 'бул. България 1, София, България',
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        href: expect.stringContaining('countrycodes=bg'),
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': expect.stringContaining('Bricky'),
        }),
      }),
    );
  });

  it('asks the client for a more precise address when there is no result', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    } as any);

    await expect(
      new GeocodingService().geocode('София, несъществуваща улица 99999'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
