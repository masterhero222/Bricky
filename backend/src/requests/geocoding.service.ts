import { BadRequestException, Injectable, Logger } from '@nestjs/common';

export type GeocodedAddress = {
  latitude: number;
  longitude: number;
  displayName: string;
};

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly cache = new Map<string, GeocodedAddress>();
  private nextRequestAt = 0;

  async geocode(addressInput: string): Promise<GeocodedAddress> {
    const address = String(addressInput || '').trim();
    if (address.length < 5 || address.length > 255) {
      throw new BadRequestException('Въведете по-точен адрес до 255 символа.');
    }

    const cacheKey = address.toLocaleLowerCase('bg-BG');
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const waitMs = Math.max(0, this.nextRequestAt - Date.now());
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
    this.nextRequestAt = Date.now() + 1100;

    const endpoint =
      process.env.GEOCODING_API_URL ||
      'https://nominatim.openstreetmap.org/search';
    const url = new URL(endpoint);
    url.searchParams.set('q', address);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'bg');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('accept-language', 'bg');

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Bricky/1.0 (https://bricky.bg; contact@bricky.bg)',
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`Geocoder returned ${response.status}`);

      const rows = (await response.json()) as Array<Record<string, unknown>>;
      const first = rows?.[0];
      const latitude = Number(first?.lat);
      const longitude = Number(first?.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new BadRequestException(
          'Адресът не беше намерен. Добавете град, улица и номер.',
        );
      }

      const result = {
        latitude: Number(latitude.toFixed(7)),
        longitude: Number(longitude.toFixed(7)),
        displayName: String(first?.display_name || address),
      };
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(
        `Address geocoding failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException(
        'Адресът не може да бъде проверен в момента. Опитайте отново.',
      );
    }
  }
}
