/**
 * Calculate precise distance between two coordinates using the Haversine formula
 * Returns distance in miles, accurate to within a tenth of a mile
 */

interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param coord1 - First coordinate (user location)
 * @param coord2 - Second coordinate (restaurant location)  
 * @returns Distance in miles, rounded to 1 decimal place
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 3959; // Earth's radius in miles
  
  const lat1Rad = toRadians(coord1.latitude);
  const lat2Rad = toRadians(coord2.latitude);
  const deltaLatRad = toRadians(coord2.latitude - coord1.latitude);
  const deltaLonRad = toRadians(coord2.longitude - coord1.longitude);

  const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Round to 1 decimal place for precision
  return Math.round(distance * 10) / 10;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Generate a precise distance description for a restaurant
 * @param userLat - User's latitude
 * @param userLon - User's longitude  
 * @param restaurantLat - Restaurant's latitude
 * @param restaurantLon - Restaurant's longitude
 * @param restaurantName - Restaurant name
 * @param cuisine - Cuisine type
 * @returns Precise description with exact distance
 */
export function generatePreciseLocationDescription(
  userLat: number,
  userLon: number,
  restaurantLat: number,
  restaurantLon: number,
  restaurantName: string,
  cuisine: string
): string {
  const distance = calculateDistance(
    { latitude: userLat, longitude: userLon },
    { latitude: restaurantLat, longitude: restaurantLon }
  );

  let distanceText;
  if (distance < 0.1) {
    distanceText = "less than 0.1 miles away";
  } else if (distance === 0.1) {
    distanceText = "0.1 miles away";
  } else if (distance < 1) {
    distanceText = `${distance} miles away`;
  } else {
    distanceText = `${distance} mile${distance !== 1 ? 's' : ''} away`;
  }

  return `${cuisine} restaurant ${distanceText} from your location`;
}