/**
 * Utilities for restaurant-related functionality
 */

/**
 * Generates a Google search URL for a restaurant's official website
 * This helps users find the restaurant's menu, hours, and contact info
 */
export function generateRestaurantWebsiteSearchUrl(restaurantName: string, address?: string): string {
  // Clean up the restaurant name for better search results
  const cleanName = restaurantName.trim();
  
  // Build search query with restaurant name and location if available
  let searchQuery = `${cleanName} restaurant`;
  
  if (address) {
    // Extract city/area from address for better search results
    const addressParts = address.split(',');
    if (addressParts.length >= 2) {
      // Add city to search for more specific results
      const city = addressParts[addressParts.length - 2].trim();
      searchQuery += ` ${city}`;
    }
  }
  
  searchQuery += ' menu hours website';
  
  // Encode the search query for URL
  const encodedQuery = encodeURIComponent(searchQuery);
  
  // Return Google search URL that will likely find the restaurant's official website
  return `https://www.google.com/search?q=${encodedQuery}`;
}

/**
 * Gets the restaurant's actual website URL or fallback search
 * @param restaurantName - Name of the restaurant
 * @param address - Optional restaurant address
 * @returns Promise that resolves to the restaurant's website URL
 */
export async function getRestaurantWebsiteUrl(restaurantName: string, address?: string): Promise<string> {
  try {
    const response = await fetch(`/api/restaurant-website?name=${encodeURIComponent(restaurantName)}&address=${encodeURIComponent(address || '')}`);
    
    if (response.ok) {
      const data = await response.json();
      return data.url;
    }
  } catch (error) {
    console.error('Error fetching restaurant website:', error);
  }
  
  // Fallback to Google search
  return generateRestaurantWebsiteSearchUrl(restaurantName, address);
}

/**
 * Gets a fun, clear button text for the website link
 */
export function getWebsiteLinkText(): string {
  const options = [
    "🌐 Check Out Their Website",
    "🍽️ Browse Menu & Info", 
    "📱 Visit Restaurant Online",
    "🌟 Explore Their Website",
    "🔗 Restaurant Website"
  ];
  
  // Return a random option for variety, but consistent within a session
  return options[Math.floor(Date.now() / (1000 * 60 * 60)) % options.length];
}