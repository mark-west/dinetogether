import { loadGoogleMapsScript } from '@/utils/loadGoogleMaps';

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress?: string;
}

export class GeocodingService {
  private static instance: GeocodingService;
  private geocoder: any | null = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): GeocodingService {
    if (!GeocodingService.instance) {
      GeocodingService.instance = new GeocodingService();
    }
    return GeocodingService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await loadGoogleMapsScript();
      if (window.google && window.google.maps) {
        this.geocoder = new window.google.maps.Geocoder();
        this.isInitialized = true;
      } else {
        throw new Error('Google Maps API not available');
      }
    } catch (error) {
      console.error('Failed to initialize geocoding service:', error);
      throw error;
    }
  }

  public async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.geocoder) {
      throw new Error('Geocoder not initialized');
    }

    return new Promise((resolve) => {
      this.geocoder!.geocode(
        { address },
        (results: any, status: string) => {
          if (status === 'OK' && results && results[0]) {
            const location = results[0].geometry.location;
            resolve({
              lat: location.lat(),
              lng: location.lng(),
              formattedAddress: results[0].formatted_address
            });
          } else {
            console.warn('Geocoding failed for address:', address, 'Status:', status);
            resolve(null);
          }
        }
      );
    });
  }

  public async geocodePlaceId(placeId: string): Promise<GeocodeResult | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.geocoder) {
      throw new Error('Geocoder not initialized');
    }

    return new Promise((resolve) => {
      this.geocoder!.geocode(
        { placeId },
        (results: any, status: string) => {
          if (status === 'OK' && results && results[0]) {
            const location = results[0].geometry.location;
            resolve({
              lat: location.lat(),
              lng: location.lng(),
              formattedAddress: results[0].formatted_address
            });
          } else {
            console.warn('Geocoding failed for placeId:', placeId, 'Status:', status);
            resolve(null);
          }
        }
      );
    });
  }
}

export const geocodingService = GeocodingService.getInstance();