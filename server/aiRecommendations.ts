const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

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

    // Take first 6 results and format them
    const recommendations = data.results.slice(0, 6).map((place: any) => ({
      id: place.place_id,
      name: place.name,
      type: preferences.foodType || 'Restaurant',
      priceRange: place.price_level ? '$'.repeat(place.price_level) : '$$',
      rating: place.rating || 4.0,
      estimatedRating: place.rating || 4.0,
      location: place.vicinity || place.formatted_address || '',
      address: place.vicinity || place.formatted_address || '',
      description: `${preferences.foodType || 'Restaurant'} located within 30 miles of your location`,
      confidence: 0.85,
      phoneNumber: '',
      website: '',
      openingHours: place.opening_hours || null,
      reviewCount: place.user_ratings_total || 0
    }));

    return recommendations;

  } catch (error) {
    console.error('Error fetching restaurants:', error);
    return [];
  }
}