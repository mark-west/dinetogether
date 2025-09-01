interface RestaurantWebsiteResult {
  url?: string;
  fallbackSearch: string;
}

// Function to search for restaurant website using web search
async function searchForRestaurantWebsite(query: string): Promise<string | undefined> {
  try {
    // Use web search to find actual restaurant website
    const searchResult = await fetch('http://localhost:5000/api/web-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query })
    });
    
    if (searchResult.ok) {
      const searchData = await searchResult.json();
      // Look for official website URLs in search results
      if (searchData.results && searchData.results.length > 0) {
        // Find the first result that looks like an official website
        for (const result of searchData.results) {
          const url = result.url || result.link;
          if (url && isLikelyRestaurantWebsite(url, query)) {
            return url;
          }
        }
      }
    }
    
    return undefined;
    
  } catch (error) {
    console.error('Error in restaurant website search:', error);
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
      // Search for the restaurant's website
      const searchResults = await searchForRestaurantWebsite(searchQuery);
      actualWebsiteUrl = searchResults;
    } catch (searchError) {
      console.log('Web search failed, using fallback:', searchError);
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