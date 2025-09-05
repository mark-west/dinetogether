import { generatePreciseLocationDescription } from './utils/distanceCalculator';

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Type definitions
export interface UserPreferences {
  userId: string;
  ratedRestaurants: Array<{
    restaurantName: string;
    rating: number;
    cuisine: string;
    location?: string;
  }>;
  visitHistory: Array<{
    restaurantName: string;
    visitCount: number;
    lastVisit: Date;
    cuisine: string;
  }>;
  preferredCuisines: string[];
  pricePreference: "budget" | "moderate" | "upscale" | "fine-dining";
  locationPreference?: string;
}

export interface CustomPreferences {
  foodType: string;
  priceRange: string;
  groupSize: number;
  occasion: string;
  ambiance: string;
  dietaryRestrictions: string[];
}

// Stub exports to satisfy imports
export function analyzeUserDiningPatterns() { return []; }
export function generateRestaurantRecommendations() { return []; }
export function enrichWithExternalReviews(data: any) { return data; }
export function fetchNearbyRestaurants() { return []; }
export function generateGroupRecommendations() { return []; }

export async function generateCustomRecommendations(
  preferences: any, 
  userHistory: any, 
  latitude: number, 
  longitude: number
) {
  if (!API_KEY) {
    throw new Error('Google Maps API key not configured');
  }

  const radius = 48280; // 30 miles

  // Build search query based on food type
  let searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=restaurant&key=${API_KEY}`;
  
  if (preferences.foodType && preferences.foodType.toLowerCase() !== 'any') {
    searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&keyword=${encodeURIComponent(preferences.foodType + ' restaurant')}&key=${API_KEY}`;
  }

  try {
    const response = await fetch(searchUrl);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results) {
      return [];
    }

    // Take first 6 results and format them with precise distances
    const recommendations = data.results.slice(0, 6).map((place: any) => {
      const restaurantLat = place.geometry?.location?.lat;
      const restaurantLng = place.geometry?.location?.lng;
      const address = place.vicinity || place.formatted_address || '';
      
      // Generate precise description with exact distance
      const description = (restaurantLat && restaurantLng) ? 
        generatePreciseLocationDescription(
          latitude, 
          longitude, 
          restaurantLat, 
          restaurantLng,
          place.name,
          preferences.foodType || 'Restaurant'
        ) : 
        `${preferences.foodType || 'Restaurant'} restaurant near your location`;

      return {
        id: place.place_id,
        name: place.name,
        type: preferences.foodType || 'Restaurant',
        priceRange: place.price_level ? '$'.repeat(Math.min(place.price_level, 3)) : '$',
        rating: place.rating || 4.0,
        estimatedRating: place.rating || 4.0,
        location: address,
        address: address,
        description: description,
        confidence: 0.85,
        phoneNumber: '',
        website: '',
        openingHours: place.opening_hours || null,
        reviewCount: place.user_ratings_total || 0,
        coordinates: restaurantLat && restaurantLng ? {
          lat: restaurantLat,
          lng: restaurantLng
        } : null
      };
    });

    return recommendations;

  } catch (error) {
    console.error('Error fetching restaurants:', error);
    return [];
  }
}