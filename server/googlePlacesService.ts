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
        return null;
      }

      const data = await response.json() as PlaceDetails;
      return data;
    } catch (error) {
      console.error('Error fetching place details:', error);
      return null;
    }
  }

  /**
   * Search for nearby places using the New Places API
   */
  async searchNearbyPlaces(latitude: number, longitude: number, radius: number): Promise<NearbyPlace[]> {
    try {
      const url = `${GOOGLE_PLACES_BASE_URL}/places:searchNearby`;
      
      const requestBody = {
        includedTypes: ['restaurant', 'cafe', 'bar', 'bakery', 'meal_takeaway', 'food'],
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
        console.error(`Google Places Nearby Search error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json() as { places: NearbyPlace[] };
      return data.places || [];
    } catch (error) {
      console.error('Error searching nearby places:', error);
      return [];
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