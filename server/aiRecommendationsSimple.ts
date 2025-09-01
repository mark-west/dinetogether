// Simple working Mexican restaurant search
export async function findMexicanRestaurants(latitude: number, longitude: number) {
  const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!API_KEY) {
    throw new Error('Google Maps API key not configured');
  }

  const radius = 48280; // 30 miles in meters
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&keyword=mexican%20restaurant&key=${API_KEY}`;
  
  console.log(`SIMPLE MEXICAN SEARCH: Searching at ${latitude}, ${longitude}`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`SIMPLE SEARCH RESULT: Status=${data.status}, Count=${data.results?.length || 0}`);
    
    if (data.status === 'OK' && data.results?.length > 0) {
      console.log(`Found Mexican restaurants:`, data.results.slice(0, 3).map((r: any) => r.name));
      return data.results.slice(0, 6).map((place: any) => ({
        id: place.place_id,
        name: place.name,
        type: 'Mexican',
        priceRange: place.price_level ? '$'.repeat(place.price_level) : '$$',
        rating: place.rating || 4.0,
        estimatedRating: place.rating || 4.0,
        location: place.vicinity || place.formatted_address || '',
        address: place.vicinity || place.formatted_address || '',
        description: `Authentic Mexican restaurant located in your area`,
        confidence: 0.8,
        phoneNumber: '',
        website: '',
        openingHours: null
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Simple Mexican search error:', error);
    return [];
  }
}