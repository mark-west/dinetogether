// Using built-in fetch available in Node.js 18+

/**
 * Google Places API Service (New API)
 * Based on official Google Places API (New) documentation
 * https://developers.google.com/maps/documentation/places/web-service/place-details
 */

const GOOGLE_PLACES_BASE_URL = 'https://places.googleapis.com/v1';

export interface PlaceDetails {
  id: string;
  displayName: {
    text: string;
  };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: {
    openNow?: boolean;
    periods?: Array<{
      open: { day: number; hour: number; minute: number };
      close: { day: number; hour: number; minute: number };
    }>;
    weekdayDescriptions?: string[];
  };
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  priceLevel?: 'PRICE_LEVEL_FREE' | 'PRICE_LEVEL_INEXPENSIVE' | 'PRICE_LEVEL_MODERATE' | 'PRICE_LEVEL_EXPENSIVE' | 'PRICE_LEVEL_VERY_EXPENSIVE';
  reviews?: Array<{
    authorAttribution: {
      displayName: string;
      uri?: string;
      photoUri?: string;
    };
    rating: number;
    text: {
      text: string;
    };
    relativePublishTimeDescription: string;
  }>;
  photos?: Array<{
    name: string;
    widthPx: number;
    heightPx: number;
    authorAttributions: Array<{
      displayName: string;
      uri?: string;
      photoUri?: string;
    }>;
  }>;
  primaryType?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface NearbyPlace {
  id: string;
  displayName: {
    text: string;
  };
  primaryType?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  formattedAddress?: string;
}

export class GooglePlacesService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get detailed information about a place using the New Places API
   */
  async getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    try {
      const fields = [
        'id',
        'displayName',
        'formattedAddress',
        'nationalPhoneNumber',
        'internationalPhoneNumber',
        'websiteUri',
        'regularOpeningHours',
        'currentOpeningHours',
        'rating',
        'userRatingCount',
        'businessStatus',
        'priceLevel',
        'reviews',
        'photos',
        'primaryType',
        'location'
      ].join(',');

      const url = `${GOOGLE_PLACES_BASE_URL}/places/${placeId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': fields,
        },
      });

      if (!response.ok) {
        console.error(`Google Places API error: ${response.status} ${response.statusText}`);
        console.log('Falling back to legacy Place Details API...');
        return await this.getPlaceDetailsLegacy(placeId);
      }

      const data = await response.json() as PlaceDetails;
      console.log('=== GOOGLE PLACES API RESPONSE (NEW) ===');
      console.log('Place ID:', data.id);
      console.log('Name:', data.displayName?.text);
      console.log('Regular Opening Hours:', JSON.stringify(data.regularOpeningHours, null, 2));
      console.log('Current Opening Hours:', JSON.stringify((data as any).currentOpeningHours, null, 2));
      console.log('Location:', JSON.stringify(data.location, null, 2));
      console.log('========================================');
      return data;
    } catch (error) {
      console.error('Error fetching place details:', error);
      return null;
    }
  }

  /**
   * Search for places by text query using the New Places API
   */
  async searchByText(query: string, latitude: number, longitude: number, radius: number): Promise<NearbyPlace[]> {
    try {
      const url = `${GOOGLE_PLACES_BASE_URL}/places:searchText`;
      
      const requestBody = {
        textQuery: query,
        maxResultCount: 10,
        locationBias: {
          circle: {
            center: {
              latitude,
              longitude,
            },
            radius,
          },
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.primaryType,places.rating,places.userRatingCount,places.priceLevel,places.location,places.formattedAddress',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Google Places Text Search error: ${response.status} ${response.statusText}`);
        console.error('Error details:', errorText);
        
        // Fallback to legacy text search
        console.log('Falling back to legacy text search...');
        return await this.searchByTextLegacy(query, latitude, longitude);
      }

      const data = await response.json() as { places: NearbyPlace[] };
      return data.places || [];
    } catch (error) {
      console.error('Error in text search:', error);
      return await this.searchByTextLegacy(query, latitude, longitude);
    }
  }

  /**
   * Legacy text search fallback
   */
  private async searchByTextLegacy(query: string, latitude: number, longitude: number): Promise<NearbyPlace[]> {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${latitude},${longitude}&radius=30000&key=${this.apiKey}`;
      
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`Google Places Legacy Text Search error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json() as any;
      
      if (data.status !== 'OK') {
        console.error('Google Places Legacy Text Search status error:', data.status);
        return [];
      }

      // Convert legacy format to new format
      return (data.results || []).map((place: any): NearbyPlace => ({
        id: place.place_id,
        displayName: { text: place.name },
        primaryType: place.types?.[0] || 'restaurant',
        rating: place.rating,
        userRatingCount: place.user_ratings_total,
        priceLevel: this.convertLegacyPriceLevel(place.price_level),
        location: place.geometry?.location ? {
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
        } : undefined,
        formattedAddress: place.formatted_address,
      }));
    } catch (error) {
      console.error('Error in legacy text search:', error);
      return [];
    }
  }

  /**
   * Search for nearby places using the New Places API
   */
  async searchNearbyPlaces(latitude: number, longitude: number, radius: number): Promise<NearbyPlace[]> {
    try {
      const url = `${GOOGLE_PLACES_BASE_URL}/places:searchNearby`;
      
      const requestBody = {
        includedTypes: ['restaurant', 'cafe', 'bar', 'bakery', 'meal_takeaway'],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: {
              latitude,
              longitude,
            },
            radius,
          },
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.primaryType,places.rating,places.userRatingCount,places.priceLevel,places.location,places.formattedAddress',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Google Places Nearby Search error: ${response.status} ${response.statusText}`);
        console.error('Error details:', errorText);
        
        // Fallback to old API format if new API fails
        console.log('Falling back to old Places API format...');
        return await this.searchNearbyPlacesLegacy(latitude, longitude, radius);
      }

      const data = await response.json() as { places: NearbyPlace[] };
      return data.places || [];
    } catch (error) {
      console.error('Error searching nearby places:', error);
      return [];
    }
  }

  /**
   * Fallback method using the legacy Places API when the new API fails
   */
  private async searchNearbyPlacesLegacy(latitude: number, longitude: number, radius: number): Promise<NearbyPlace[]> {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=restaurant&opennow=false&key=${this.apiKey}`;
      
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`Google Places Legacy API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json() as any;
      
      if (data.status !== 'OK') {
        console.error('Google Places Legacy API status error:', data.status);
        return [];
      }

      // Convert legacy format to new format
      return (data.results || []).map((place: any): NearbyPlace => ({
        id: place.place_id,
        displayName: { text: place.name },
        primaryType: place.types?.[0] || 'restaurant',
        rating: place.rating,
        userRatingCount: place.user_ratings_total,
        priceLevel: this.convertLegacyPriceLevel(place.price_level),
        location: place.geometry?.location ? {
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
        } : undefined,
        formattedAddress: place.vicinity,
      }));
    } catch (error) {
      console.error('Error in legacy Places API search:', error);
      return [];
    }
  }

  /**
   * Fallback method using legacy Place Details API
   */
  private async getPlaceDetailsLegacy(placeId: string): Promise<PlaceDetails | null> {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,international_phone_number,website,opening_hours,rating,user_ratings_total,business_status,price_level,reviews,photos,type,geometry&key=${this.apiKey}`;
      
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`Google Places Legacy Details API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json() as any;
      
      if (data.status !== 'OK') {
        console.error('Google Places Legacy Details API status error:', data.status);
        return null;
      }

      const place = data.result;
      console.log('=== GOOGLE PLACES API RESPONSE (LEGACY) ===');
      console.log('Place ID:', placeId);
      console.log('Name:', place.name);
      console.log('Opening Hours:', JSON.stringify(place.opening_hours, null, 2));
      console.log('Geometry:', JSON.stringify(place.geometry, null, 2));
      console.log('=========================================');
      
      // Convert legacy format to new format
      return {
        id: placeId,
        displayName: { text: place.name || '' },
        formattedAddress: place.formatted_address,
        nationalPhoneNumber: place.formatted_phone_number,
        internationalPhoneNumber: place.international_phone_number,
        websiteUri: place.website,
        regularOpeningHours: place.opening_hours ? {
          openNow: place.opening_hours.open_now,
          periods: place.opening_hours.periods?.map((period: any) => ({
            open: {
              day: period.open.day,
              hour: parseInt(period.open.time?.substring(0, 2) || '0'),
              minute: parseInt(period.open.time?.substring(2, 4) || '0')
            },
            close: period.close ? {
              day: period.close.day,
              hour: parseInt(period.close.time?.substring(0, 2) || '0'),
              minute: parseInt(period.close.time?.substring(2, 4) || '0')
            } : undefined
          })),
          weekdayDescriptions: place.opening_hours.weekday_text
        } : undefined,
        rating: place.rating,
        userRatingCount: place.user_ratings_total,
        businessStatus: place.business_status,
        priceLevel: this.convertLegacyPriceLevel(place.price_level) as any,
        reviews: place.reviews?.map((review: any) => ({
          authorAttribution: {
            displayName: review.author_name || '',
            uri: review.author_url,
            photoUri: review.profile_photo_url
          },
          rating: review.rating,
          text: { text: review.text || '' },
          relativePublishTimeDescription: review.relative_time_description || ''
        })),
        photos: place.photos?.map((photo: any) => ({
          name: photo.photo_reference,
          widthPx: photo.width,
          heightPx: photo.height,
          authorAttributions: [{
            displayName: photo.html_attributions?.[0] || '',
            uri: undefined,
            photoUri: undefined
          }]
        })),
        primaryType: place.types?.[0] || 'restaurant',
        location: place.geometry?.location ? {
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng
        } : undefined
      };
    } catch (error) {
      console.error('Error in legacy Place Details API:', error);
      return null;
    }
  }

  /**
   * Convert legacy price level to new format
   */
  private convertLegacyPriceLevel(priceLevel?: number): string | undefined {
    if (typeof priceLevel !== 'number') return undefined;
    switch (priceLevel) {
      case 0: return 'PRICE_LEVEL_FREE';
      case 1: return 'PRICE_LEVEL_INEXPENSIVE';
      case 2: return 'PRICE_LEVEL_MODERATE';
      case 3: return 'PRICE_LEVEL_EXPENSIVE';
      case 4: return 'PRICE_LEVEL_VERY_EXPENSIVE';
      default: return undefined;
    }
  }

  /**
   * Convert price level to user-friendly string
   */
  formatPriceLevel(priceLevel?: string): string {
    switch (priceLevel) {
      case 'PRICE_LEVEL_FREE':
        return 'Free';
      case 'PRICE_LEVEL_INEXPENSIVE':
        return '$';
      case 'PRICE_LEVEL_MODERATE':
        return '$$';
      case 'PRICE_LEVEL_EXPENSIVE':
        return '$$$';
      case 'PRICE_LEVEL_VERY_EXPENSIVE':
        return '$$$$';
      default:
        return '$$';
    }
  }

  /**
   * Format opening hours for display
   */
  formatOpeningHours(openingHours?: PlaceDetails['regularOpeningHours']): string {
    if (!openingHours?.weekdayDescriptions) {
      return '';
    }
    return openingHours.weekdayDescriptions.join('\n');
  }

  /**
   * Extract menu highlights from reviews
   */
  extractMenuHighlights(reviews?: PlaceDetails['reviews']): string[] {
    if (!reviews) return [];

    const highlights: string[] = [];
    const foodKeywords = [
      'delicious', 'amazing', 'best', 'excellent', 'perfect', 'incredible',
      'pizza', 'burger', 'pasta', 'salad', 'steak', 'chicken', 'seafood',
      'dessert', 'coffee', 'wine', 'beer', 'cocktail', 'appetizer'
    ];

    reviews.slice(0, 3).forEach(review => {
      const text = review.text.text.toLowerCase();
      foodKeywords.forEach(keyword => {
        if (text.includes(keyword) && !highlights.some(h => h.includes(keyword))) {
          // Extract sentence containing the keyword
          const sentences = review.text.text.split('. ');
          const relevantSentence = sentences.find(s => s.toLowerCase().includes(keyword));
          if (relevantSentence && relevantSentence.length < 100) {
            highlights.push(relevantSentence.trim());
          }
        }
      });
    });

    return highlights.slice(0, 3);
  }
}

export default GooglePlacesService;