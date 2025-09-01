interface RestaurantWebsiteResult {
  url?: string;
  fallbackSearch: string;
}

// Function to search for restaurant website using Google Places API
async function searchForRestaurantWebsite(restaurantName: string, address?: string): Promise<string | undefined> {
  try {
    // Use Google Places API to find the business profile with website
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.log('Google Maps API key not found');
      return undefined;
    }

    // First, search for the place using the Text Search API
    const searchQuery = `${restaurantName}${address ? ` ${address}` : ''}`;
    const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${apiKey}`;
    
    const searchResponse = await fetch(textSearchUrl);
    const searchData = await searchResponse.json();
    
    if (searchData.results && searchData.results.length > 0) {
      // Get the first result's place_id
      const placeId = searchData.results[0].place_id;
      
      // Use Place Details API to get the website URL
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=website&key=${apiKey}`;
      
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();
      
      if (detailsData.result && detailsData.result.website) {
        console.log(`Found website for ${restaurantName}: ${detailsData.result.website}`);
        return detailsData.result.website;
      }
    }
    
    return undefined;
    
  } catch (error) {
    console.error('Error in Google Places restaurant website search:', error);
    return undefined;
  }
}

// Helper function to check if a URL is likely the restaurant's official website
function isLikelyRestaurantWebsite(url: string, originalQuery: string): boolean {
  const restaurantName = originalQuery.split(' ')[0].toLowerCase();
  const urlLower = url.toLowerCase();
  
  // Skip directories, third-party sites, and social media
  const skipPatterns = [
    'yelp.com', 'google.com', 'facebook.com', 'instagram.com', 
    'twitter.com', 'foursquare.com', 'tripadvisor.com', 'opentable.com',
    'grubhub.com', 'doordash.com', 'ubereats.com', 'seamless.com',
    'menuism.com', 'zomato.com', 'yellowpages.com'
  ];
  
  // If URL contains skip patterns, it's not the official website
  if (skipPatterns.some(pattern => urlLower.includes(pattern))) {
    return false;
  }
  
  // Look for restaurant name in domain
  if (urlLower.includes(restaurantName.replace(/[^a-z]/g, ''))) {
    return true;
  }
  
  return false;
}

// Cache for restaurant websites to avoid repeated searches
const websiteCache = new Map<string, RestaurantWebsiteResult>();

export async function webSearchForRestaurantWebsite(
  restaurantName: string, 
  address?: string
): Promise<RestaurantWebsiteResult> {
  const cacheKey = `${restaurantName}-${address || ''}`.toLowerCase();
  
  // Check cache first
  if (websiteCache.has(cacheKey)) {
    return websiteCache.get(cacheKey)!;
  }

  const fallbackSearch = `https://www.google.com/search?q=${encodeURIComponent(`${restaurantName} ${address || ''} restaurant official website`)}`;
  
  try {
    // Build search query for restaurant website
    const searchQuery = `${restaurantName} ${address ? `${address} ` : ''}restaurant official website`;
    
    // Try to find actual restaurant website using web search
    let actualWebsiteUrl: string | undefined;
    
    try {
      // Search for the restaurant's website using Google Places API
      const searchResults = await searchForRestaurantWebsite(restaurantName, address);
      actualWebsiteUrl = searchResults;
    } catch (searchError) {
      console.log('Google Places search failed, using fallback:', searchError);
    }
    
    const result: RestaurantWebsiteResult = {
      fallbackSearch,
      url: actualWebsiteUrl
    };

    // Cache the result
    websiteCache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error('Error searching for restaurant website:', error);
    const result: RestaurantWebsiteResult = {
      fallbackSearch
    };
    websiteCache.set(cacheKey, result);
    return result;
  }
}

// API endpoint to get restaurant website
export async function getRestaurantWebsiteUrl(restaurantName: string, address?: string): Promise<string> {
  const result = await webSearchForRestaurantWebsite(restaurantName, address);
  return result.url || result.fallbackSearch;
}