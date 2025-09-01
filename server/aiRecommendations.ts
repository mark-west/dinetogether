import OpenAI from "openai";

// Check if OpenAI API key is available
const hasOpenAI = !!process.env.OPENAI_API_KEY;

// Using gpt-4o model for reliable AI recommendations
const openai = hasOpenAI ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

/**
 * Fetches detailed restaurant information from Google Places API
 */
async function fetchRestaurantDetails(placeId: string) {
  const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  if (!API_KEY) return null;

  const fields = [
    'name', 'rating', 'user_ratings_total', 'price_level', 'website',
    'formatted_phone_number', 'opening_hours', 'reviews', 'types',
    'formatted_address', 'geometry', 'photos', 'business_status'
  ].join(',');

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`Google Places Details API called for ${placeId}:`);
    console.log(`Status: ${data.status}`);
    if (data.error_message) {
      console.log(`Error: ${data.error_message}`);
    }
    
    if (data.status === 'OK' && data.result) {
      const place = data.result;
      console.log(`Place details for ${place.name}:`);
      console.log(`- Phone: ${place.formatted_phone_number || 'NOT FOUND'}`);
      console.log(`- Website: ${place.website || 'NOT FOUND'}`);
      console.log(`- Opening Hours: ${place.opening_hours ? 'FOUND' : 'NOT FOUND'}`);
      
      return {
        placeId: placeId,
        name: place.name,
        rating: place.rating || 0,
        userRatingsTotal: place.user_ratings_total || 0,
        priceLevel: place.price_level,
        website: place.website,
        phoneNumber: place.formatted_phone_number,
        address: place.formatted_address,
        openingHours: place.opening_hours,
        reviews: place.reviews ? place.reviews.slice(0, 3) : [], // Top 3 reviews
        types: place.types,
        geometry: place.geometry,
        photos: place.photos,
        businessStatus: place.business_status
      };
    } else {
      console.log(`Failed to get place details for ${placeId}: ${data.status}`);
    }
  } catch (error) {
    console.error(`Error fetching details for place ${placeId}:`, error);
  }
  
  return null;
}

/**
 * Fetches nearby restaurants from Google Places API for AI recommendations
 * Filters out major chain restaurants to focus on local dining options
 */
async function fetchNearbyRestaurantsForAI(latitude: number, longitude: number, radius: number) {
  const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  if (!API_KEY) {
    // Google Maps API key not configured
    return [];
  }

  // Major chain restaurants to filter out
  const chainKeywords = [
    'mcdonald', 'burger king', 'subway', 'kfc', 'taco bell', 'pizza hut',
    'domino', 'papa john', 'wendy', 'arby', 'dairy queen', 'sonic',
    'chick-fil-a', 'popeyes', 'chipotle', 'panda express', 'starbucks',
    'dunkin', 'tim horton', 'ihop', 'denny', 'applebee', 'olive garden',
    'red lobster', 'outback', 'texas roadhouse', 'chili', 'friday',
    'buffalo wild wings', 'hooters', 'cracker barrel'
  ];

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=restaurant&key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results) {
      // Google Places API error
      return [];
    }

    // Filter out chains and process restaurants
    const filteredRestaurants = data.results
      .filter((place: any) => {
        const name = place.name.toLowerCase();
        // Skip if it's a major chain (unless it's a finer dining franchise)
        const isChain = chainKeywords.some(keyword => name.includes(keyword));
        const isFineDining = place.price_level >= 3; // Allow higher-end chains
        
        return !isChain || isFineDining;
      })
      .slice(0, 20) // Get more restaurants for AI to choose from
      .map((place: any) => ({
        id: place.place_id,
        name: place.name,
        cuisine: getCuisineFromTypes(place.types),
        priceRange: getPriceRange(place.price_level),
        rating: place.rating || 0,
        userRatingsTotal: place.user_ratings_total || 0,
        address: place.vicinity,
        photoReference: place.photos?.[0]?.photo_reference,
        geometry: place.geometry,
        businessStatus: place.business_status,
        types: place.types,
        permanently_closed: place.permanently_closed
      }));

    return filteredRestaurants;
  } catch (error) {
    console.error('Error fetching restaurants from Google Places:', error);
    return [];
  }
}

/**
 * Fetches nearby restaurants with detailed information for enhanced AI recommendations
 */
async function fetchEnhancedRestaurantsForAI(latitude: number, longitude: number, radius: number) {
  const basicRestaurants = await fetchNearbyRestaurantsForAI(latitude, longitude, radius);
  
  console.log(`Enhancement process: Found ${basicRestaurants.length} basic restaurants`);
  if (basicRestaurants.length === 0) return [];
  
  // Fetch detailed information for top restaurants (limit to avoid too many API calls)
  const topRestaurants = basicRestaurants.slice(0, 10);
  const enhancedRestaurants = [];
  
  console.log(`Enhancing top ${topRestaurants.length} restaurants with detailed Google Places data`);
  
  for (let i = 0; i < topRestaurants.length; i++) {
    const restaurant = topRestaurants[i];
    console.log(`[${i+1}/${topRestaurants.length}] Fetching details for: ${restaurant.name} (ID: ${restaurant.id})`);
    
    const details = await fetchRestaurantDetails(restaurant.id);
    if (details) {
      console.log(`✓ Got details for ${restaurant.name} - Phone: ${details.phoneNumber ? 'YES' : 'NO'}, Website: ${details.website ? 'YES' : 'NO'}`);
      enhancedRestaurants.push({
        ...restaurant,
        ...details,
        // Merge basic data with detailed data - PRESERVE CONTACT INFO FROM DETAILS
        cuisine: restaurant.cuisine, // Keep our processed cuisine type
        priceRange: restaurant.priceRange, // Keep our formatted price range
        // ENSURE contact details are preserved from Google Places API
        phoneNumber: details.phoneNumber || restaurant.phoneNumber,
        website: details.website || restaurant.website,
        openingHours: details.openingHours || restaurant.openingHours,
        address: details.address || restaurant.address || restaurant.vicinity
      });
    } else {
      console.log(`✗ No details found for ${restaurant.name}`);
      // Still include the restaurant but without enhanced data
      enhancedRestaurants.push(restaurant);
    }
  }
  
  console.log(`Enhancement complete: ${enhancedRestaurants.length} restaurants enhanced`);
  return enhancedRestaurants;
}

// Helper function to convert Google's price level to our format
function getPriceRange(priceLevel: number | undefined): string {
  switch (priceLevel) {
    case 1: return '$';
    case 2: return '$$';
    case 3: return '$$$';
    case 4: return '$$$$';
    default: return '$$';
  }
}

// Helper function to extract cuisine type from Google Place types
function getCuisineFromTypes(types: string[]): string {
  const cuisineMap: { [key: string]: string } = {
    'chinese_restaurant': 'Chinese',
    'italian_restaurant': 'Italian',
    'mexican_restaurant': 'Mexican',
    'japanese_restaurant': 'Japanese',
    'thai_restaurant': 'Thai',
    'indian_restaurant': 'Indian',
    'french_restaurant': 'French',
    'korean_restaurant': 'Korean',
    'greek_restaurant': 'Greek',
    'mediterranean_restaurant': 'Mediterranean',
    'american_restaurant': 'American',
    'steakhouse': 'Steakhouse',
    'seafood_restaurant': 'Seafood',
    'vegetarian_restaurant': 'Vegetarian',
    'pizza_restaurant': 'Pizza'
  };

  for (const type of types) {
    if (cuisineMap[type]) {
      return cuisineMap[type];
    }
  }
  return 'Restaurant';
}

export interface UserPreferences {
  userId: string;
  ratedRestaurants: Array<{
    restaurantName: string;
    rating: number;
    cuisine?: string;
    priceRange?: string;
    location?: string;
  }>;
  visitHistory: Array<{
    restaurantName: string;
    visitCount: number;
    lastVisit: Date;
    cuisine?: string;
  }>;
  preferredCuisines: string[];
  pricePreference?: "budget" | "moderate" | "upscale" | "fine-dining";
  locationPreference?: string;
}

export interface RestaurantRecommendation {
  name: string;
  cuisine: string;
  priceRange: string;
  estimatedRating: number;
  location: string;
  reasonForRecommendation: string;
  confidenceScore: number;
  externalRating?: {
    google?: number;
    yelp?: number;
  };
  // Enhanced fields from Google Maps
  website?: string;
  phoneNumber?: string;
  openingHours?: any;
  userRatingsTotal?: number;
  businessStatus?: string;
  reviews?: any[];
}

export interface CustomPreferences {
  foodType: string;
  priceRange: string;
  groupSize: number;
  occasion: string;
  ambiance: string;
  dietaryRestrictions: string[];
  location?: string;
}

export interface CustomRecommendation {
  name: string;
  type: string;
  rating: number;
  priceRange: string;
  description: string;
  confidence: number;
  reasons: string[];
  // Google Places data fields
  phoneNumber?: string;
  website?: string;
  openingHours?: any;
  reviews?: any[];
  userRatingsTotal?: number;
  businessStatus?: string;
  placeId?: string;
  address?: string;
  cuisine?: string;
  estimatedRating?: number;
  location?: string;
  debugInfo?: {
    hasPhone: boolean;
    hasWebsite: boolean;
    hasHours: boolean;
    hasAddress: boolean;
  };
}

export async function generateRestaurantRecommendations(
  userPreferences: UserPreferences,
  location: string = "current area",
  latitude: number,
  longitude: number
): Promise<RestaurantRecommendation[]> {
  try {
    // Get real restaurants with detailed information from Google Places API within 30 miles
    const radius = 48280; // 30 miles in meters
    console.log("CALLING fetchEnhancedRestaurantsForAI...");
    const localRestaurants = await fetchEnhancedRestaurantsForAI(latitude, longitude, radius);
    console.log(`fetchEnhancedRestaurantsForAI returned ${localRestaurants?.length || 0} restaurants`);
    
    if (!localRestaurants || localRestaurants.length === 0) {
      console.log('No restaurants found via Google Places API');
      return [];
    }

    // Use AI to rank and filter the real restaurants based on user preferences
    if (!openai || !hasOpenAI) {
      return convertToRecommendations(localRestaurants.slice(0, 8));
    }

    const prompt = createLocalRecommendationPrompt(userPreferences, localRestaurants, location);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert restaurant recommendation engine with access to comprehensive Google Maps business data. You will be given a list of REAL restaurants with detailed information including ratings, reviews, hours, contact info, and more. Your job is to:
          
          1. Select and rank the 5-8 best restaurants from the provided list based on user preferences
          2. Leverage the rich business data (hours, reviews, ratings, website, phone) in your recommendations
          3. Consider practical factors like current open status, review sentiment, and Google rating quality
          4. Provide detailed reasoning that incorporates the available business intelligence
          5. Assign confidence scores based on data quality and user preference alignment
          
          IMPORTANT: Only recommend restaurants from the provided list. Do not invent restaurants.
          
          Key factors to consider:
          - Google rating and number of reviews (more reviews = more reliable)
          - Current operating status and hours
          - Recent review sentiment and specifics
          - Website availability and contact information
          - Match with user's historical preferences and ratings
          
          Respond with JSON in this exact format: { "recommendations": [{"name": "Restaurant Name", "cuisine": "Cuisine Type", "priceRange": "$$", "estimatedRating": 4.2, "location": "Address/Area", "reasonForRecommendation": "Detailed explanation incorporating Google Maps data", "confidenceScore": 0.85, "phoneNumber": "Phone from data", "website": "Website from data", "openingHours": "Hours object from data", "reviews": "Reviews array from data", "userRatingsTotal": "Review count from data", "placeId": "Place ID from data"}] }`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    if (result.recommendations && result.recommendations.length > 0) {
      // Merge AI recommendations with original Google Places data
      const enrichedRecommendations = result.recommendations.map((aiRec: any) => {
        const originalRestaurant = localRestaurants.find((r: any) => 
          r.name.toLowerCase() === aiRec.name.toLowerCase()
        );
        
        return {
          ...aiRec,
          // Ensure Google Places data is preserved
          phoneNumber: originalRestaurant?.phoneNumber || aiRec.phoneNumber,
          website: originalRestaurant?.website || aiRec.website,
          openingHours: originalRestaurant?.openingHours || aiRec.openingHours,
          reviews: originalRestaurant?.reviews || aiRec.reviews || [],
          userRatingsTotal: originalRestaurant?.userRatingsTotal || aiRec.userRatingsTotal,
          placeId: originalRestaurant?.placeId || aiRec.placeId,
          address: originalRestaurant?.address || aiRec.location,
          businessStatus: originalRestaurant?.businessStatus,
          rating: originalRestaurant?.rating || aiRec.estimatedRating
        };
      });
      
      return enrichedRecommendations;
    }
    
    return convertToRecommendations(localRestaurants.slice(0, 8));
  } catch (error) {
    console.error("Error generating AI recommendations:", error);
    // Return local restaurants without AI processing if available
    const localRestaurants = await fetchNearbyRestaurantsForAI(latitude, longitude, 48280);
    if (localRestaurants && localRestaurants.length > 0) {
      return convertToRecommendations(localRestaurants.slice(0, 8));
    }
    console.log('No real restaurants available - both Google Places and OpenAI failed');
    return [];
  }
}

// Helper function to create prompt for local restaurant recommendations
function createLocalRecommendationPrompt(userPreferences: UserPreferences, localRestaurants: any[], location: string): string {
  const { ratedRestaurants, visitHistory, preferredCuisines, pricePreference } = userPreferences;
  
  let prompt = `Select and rank the 5-8 best restaurants from the provided list for a user in ${location}.\n\n`;
  
  prompt += "Available Restaurants with Rich Details:\n";
  localRestaurants.forEach((restaurant, index) => {
    prompt += `${index + 1}. ${restaurant.name}\n`;
    prompt += `   - Cuisine: ${restaurant.cuisine}\n`;
    prompt += `   - Price Range: ${restaurant.priceRange}\n`;
    prompt += `   - Google Rating: ${restaurant.rating}/5.0 (${restaurant.userRatingsTotal || 0} reviews)\n`;
    prompt += `   - Address: ${restaurant.address}\n`;
    
    if (restaurant.phoneNumber) {
      prompt += `   - Phone: ${restaurant.phoneNumber}\n`;
    }
    
    if (restaurant.website) {
      prompt += `   - Website: ${restaurant.website}\n`;
    }
    
    if (restaurant.openingHours) {
      const isOpen = restaurant.openingHours.open_now ? "Currently Open" : "Currently Closed";
      prompt += `   - Status: ${isOpen}\n`;
      if (restaurant.openingHours.weekday_text) {
        prompt += `   - Hours: ${restaurant.openingHours.weekday_text.slice(0, 2).join(', ')}\n`;
      }
    }
    
    if (restaurant.reviews && restaurant.reviews.length > 0) {
      prompt += `   - Recent Reviews:\n`;
      restaurant.reviews.slice(0, 2).forEach((review: any) => {
        prompt += `     * "${review.text.substring(0, 100)}..." (${review.rating}/5)\n`;
      });
    }
    
    if (restaurant.businessStatus === 'PERMANENTLY_CLOSED') {
      prompt += `   - WARNING: This restaurant is permanently closed\n`;
    }
    
    prompt += "\n";
  });
  prompt += "\n";
  
  prompt += "User's Dining Profile:\n";
  
  if (ratedRestaurants.length > 0) {
    prompt += "Previous Ratings:\n";
    ratedRestaurants.forEach(restaurant => {
      prompt += `- ${restaurant.restaurantName}: ${restaurant.rating}/5 stars`;
      if (restaurant.cuisine) prompt += ` (${restaurant.cuisine})`;
      prompt += "\n";
    });
    prompt += "\n";
  }
  
  if (visitHistory.length > 0) {
    prompt += "Visit History:\n";
    visitHistory.forEach(visit => {
      prompt += `- ${visit.restaurantName}: ${visit.visitCount} visits`;
      if (visit.cuisine) prompt += ` (${visit.cuisine})`;
      prompt += "\n";
    });
    prompt += "\n";
  }
  
  if (preferredCuisines.length > 0) {
    prompt += `Preferred Cuisines: ${preferredCuisines.join(", ")}\n`;
  }
  
  if (pricePreference) {
    prompt += `Price Preference: ${pricePreference}\n`;
  }
  
  prompt += "\nSelect restaurants from the list that best match the user's preferences and provide detailed reasoning for each choice.";
  
  return prompt;
}

// REMOVED: No dummy data allowed

function createRecommendationPrompt(userPreferences: UserPreferences, location: string): string {
  const { ratedRestaurants, visitHistory, preferredCuisines, pricePreference } = userPreferences;
  
  let prompt = `Generate 5-8 personalized restaurant recommendations for a user in ${location}.\n\n`;
  
  prompt += "User's Dining Profile:\n";
  
  if (ratedRestaurants.length > 0) {
    prompt += "Previous Ratings:\n";
    ratedRestaurants.forEach(restaurant => {
      prompt += `- ${restaurant.restaurantName}: ${restaurant.rating}/5 stars`;
      if (restaurant.cuisine) prompt += ` (${restaurant.cuisine})`;
      prompt += "\n";
    });
    prompt += "\n";
  }
  
  if (visitHistory.length > 0) {
    prompt += "Visit History:\n";
    visitHistory.forEach(visit => {
      prompt += `- ${visit.restaurantName}: ${visit.visitCount} visits`;
      if (visit.cuisine) prompt += ` (${visit.cuisine})`;
      prompt += "\n";
    });
    prompt += "\n";
  }
  
  if (preferredCuisines.length > 0) {
    prompt += `Preferred Cuisines: ${preferredCuisines.join(", ")}\n`;
  }
  
  if (pricePreference) {
    prompt += `Price Preference: ${pricePreference}\n`;
  }
  
  prompt += "\nRecommendation Criteria:\n";
  prompt += "- Suggest restaurants that align with their taste preferences\n";
  prompt += "- Consider their rating patterns and cuisine preferences\n";
  prompt += "- Mix familiar and new cuisine types based on their openness to variety\n";
  prompt += "- Include restaurants at their preferred price point\n";
  prompt += "- Provide diverse options while respecting their demonstrated preferences\n";
  prompt += "- Focus on restaurants that would realistically exist in the specified area\n";
  
  return prompt;
}

export async function analyzeUserDiningPatterns(userPreferences: UserPreferences): Promise<{
  primaryCuisines: string[];
  averageRating: number;
  priceSensitivity: string;
  adventurousness: number; // 0-1 scale
  preferredDiningStyle: string;
}> {
  try {
    const prompt = `Analyze this user's dining patterns and preferences:

Rated Restaurants: ${JSON.stringify(userPreferences.ratedRestaurants)}
Visit History: ${JSON.stringify(userPreferences.visitHistory)}
Preferred Cuisines: ${userPreferences.preferredCuisines.join(", ")}

Provide analysis in JSON format: {
  "primaryCuisines": ["top 3 cuisines"],
  "averageRating": number,
  "priceSensitivity": "budget|moderate|premium|luxury",
  "adventurousness": number between 0-1,
  "preferredDiningStyle": "casual|fine-dining|family-friendly|trendy|authentic"
}`;

    const response = await openai!.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system", 
          content: "You are a dining pattern analyst. Analyze user preferences and provide structured insights."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Error analyzing dining patterns:", error);
    return {
      primaryCuisines: [],
      averageRating: 0,
      priceSensitivity: "moderate",
      adventurousness: 0.5,
      preferredDiningStyle: "casual"
    };
  }
}

// REMOVED: No dummy external ratings allowed
export async function enrichWithExternalReviews(
  recommendations: RestaurantRecommendation[]
): Promise<RestaurantRecommendation[]> {
  // Return as-is - no dummy external ratings
  return recommendations;
}

// Generate custom recommendations based on user preferences
/**
 * Generates custom restaurant recommendations based on user preferences
 * Falls back to Google Places data when OpenAI is unavailable
 */
export async function generateCustomRecommendations(
  preferences: CustomPreferences,
  userHistory?: UserPreferences,
  latitude: number,
  longitude: number
): Promise<CustomRecommendation[]> {
  
  // ALWAYS use Google Places data for location-specific results
  // Never generate fake restaurants - only return real restaurants within 30 miles

  // Use Google Places with full restaurant details
  try {
    const radius = 48280; // 30 miles in meters
    console.log(`Fetching restaurants within 30 miles of lat: ${latitude}, lng: ${longitude}`);
    const nearbyRestaurants = await fetchEnhancedRestaurantsForAI(latitude, longitude, radius);
    
    // Filter restaurants based on user preferences
    let filteredRestaurants = nearbyRestaurants;
    
    // Filter by food type if specified
    if (preferences.foodType && preferences.foodType.toLowerCase() !== 'any') {
      const preferredType = preferences.foodType.toLowerCase();
      
      filteredRestaurants = nearbyRestaurants.filter((restaurant: any) => {
        const restaurantTypes = (restaurant.types || []).join(' ').toLowerCase();
        const restaurantName = restaurant.name.toLowerCase();
        const restaurantCuisine = (restaurant.cuisine || '').toLowerCase();
        
        // Check if restaurant matches the preferred food type
        return restaurantTypes.includes(preferredType) || 
               restaurantName.includes(preferredType) ||
               restaurantCuisine.includes(preferredType);
      });
      
    }
    
    // Filter by price range if specified
    if (preferences.priceRange && preferences.priceRange !== 'any') {
      const priceMap = { 'budget': [1], 'moderate': [2], 'upscale': [3, 4] };
      const allowedPriceLevels = priceMap[preferences.priceRange as keyof typeof priceMap] || [1, 2, 3, 4];
      
      filteredRestaurants = filteredRestaurants.filter((restaurant: any) => 
        allowedPriceLevels.includes(restaurant.price_level || 2)
      );
    }
    
    // If no matches found, fall back to all restaurants
    if (filteredRestaurants.length === 0 && preferences.foodType && preferences.foodType.toLowerCase() !== 'any') {
      filteredRestaurants = nearbyRestaurants.slice(0, 6);
    }
    
    // Since we're using fetchEnhancedRestaurantsForAI, restaurants already have detailed data
    // Just ensure we have the right number of results
    const enhancedRestaurants = filteredRestaurants.slice(0, 6);
    console.log(`Found ${enhancedRestaurants.length} location-specific restaurants`);
    console.log('Sample restaurant data:', enhancedRestaurants[0] ? {
      name: enhancedRestaurants[0].name,
      hasPhone: !!enhancedRestaurants[0].phoneNumber,
      hasWebsite: !!enhancedRestaurants[0].website,
      hasHours: !!enhancedRestaurants[0].openingHours
    } : 'No restaurants found');
    
    // Convert Google Places results to CustomRecommendation format with all data preserved
    const recommendations: any[] = enhancedRestaurants.map((restaurant: any) => {
      const matchesPreference = preferences.foodType && preferences.foodType.toLowerCase() !== 'any';
      const preferenceNote = matchesPreference ? 
        `Matches your preference for ${preferences.foodType} cuisine` : 
        'Local restaurant in your area';
        
      return {
        name: restaurant.name,
        type: restaurant.cuisine || restaurant.types?.[0]?.replace('_', ' ') || 'Restaurant',
        rating: restaurant.rating || 4.0,
        priceRange: '$'.repeat(restaurant.price_level || 2),
        description: `${restaurant.name} - ${preferenceNote}. ${restaurant.vicinity || restaurant.address || 'Located nearby'}.`,
        confidence: matchesPreference ? 0.9 : 0.7,
        reasons: [
          'Located within 30 miles of your location',
          matchesPreference ? `Serves ${preferences.foodType} cuisine` : 'Based on Google Places data',
          'Real restaurant you can visit'
        ],
        // Map Google Places data - direct from API response
        phoneNumber: restaurant.phoneNumber,
        website: restaurant.website, 
        openingHours: restaurant.openingHours,
        // DIRECT API DATA - bypass any mapping issues  
        phone: restaurant.phoneNumber,
        hours: restaurant.openingHours,
        // LOG THE EXACT VALUES BEING SENT
        _serverDebug: `Phone: ${restaurant.phoneNumber || 'NULL'} | Website: ${restaurant.website || 'NULL'} | Hours: ${restaurant.openingHours ? 'OBJECT' : 'NULL'}`,
        reviews: restaurant.reviews || [],
        userRatingsTotal: restaurant.userRatingsTotal,
        businessStatus: restaurant.businessStatus,
        placeId: restaurant.placeId,
        address: restaurant.address || restaurant.vicinity,
        cuisine: restaurant.cuisine,
        estimatedRating: restaurant.rating || 4.0,
        location: restaurant.address || restaurant.vicinity,
        // Debug fields to verify data flow
        debugInfo: {
          hasPhone: !!restaurant.phoneNumber,
          hasWebsite: !!restaurant.website,
          hasHours: !!restaurant.openingHours,
          hasAddress: !!(restaurant.address || restaurant.vicinity)
        }
      };
    });
    
    return recommendations;
  } catch (fallbackError) {
    console.error('Google Places fallback also failed:', fallbackError);
    return [];
  }
}

// Generate group-specific recommendations
export async function generateGroupRecommendations(
  preferences: CustomPreferences,
  groupHistory: {
    groupEvents: Array<{ restaurantName: string; rating: number; cuisine?: string }>;
    memberPreferences: Array<{ preferredCuisines: string[]; pricePreference?: string }>;
  }
): Promise<CustomRecommendation[]> {
  try {
    // Return empty if OpenAI is not available - no fake restaurants
    if (!openai || !hasOpenAI) {
      console.log('OpenAI API not available - no group recommendations');
      return [];
    }

    const prompt = createGroupRecommendationPrompt(preferences, groupHistory);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a group dining specialist that creates restaurant recommendations for groups based on collective preferences and history.
          
          Consider:
          - Group's previous dining experiences and ratings
          - Collective preferences and dietary restrictions
          - Group size and dining dynamics
          - Price range that works for all members
          - Occasion and atmosphere for group dining
          - Restaurants that can accommodate the group comfortably
          
          Provide recommendations that balance individual preferences with group dynamics.
          
          Respond with JSON in this exact format: { "recommendations": [{"name": "Restaurant Name", "type": "Cuisine Type", "rating": 4.2, "priceRange": "$$", "description": "Why this works for the group", "confidence": 0.85, "reasons": ["group-focused reason1", "reason2", "reason3"]}] }`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2500
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.recommendations || [];
  } catch (error) {
    console.error("Error generating group AI recommendations:", error);
    console.log('OpenAI API failed - no group recommendations available');
    return [];
  }
}

// NO FALLBACK RESTAURANTS - only real API data should be used

// NO HARDCODED RESTAURANTS - only use real API data

// REMOVED - No fake custom recommendations

// REMOVED - No fake group recommendations

function createCustomRecommendationPrompt(preferences: CustomPreferences, userHistory?: UserPreferences, latitude?: number, longitude?: number): string {
  let prompt = `Generate restaurant recommendations based on these specific preferences:

Food Type: ${preferences.foodType}
Price Range: ${preferences.priceRange}
Group Size: ${preferences.groupSize} people
Occasion: ${preferences.occasion}
Ambiance: ${preferences.ambiance}
Dietary Restrictions: ${preferences.dietaryRestrictions.join(", ") || "None"}
Location: ${preferences.location || "current area"}
Coordinates: ${latitude}, ${longitude}

IMPORTANT: Only recommend restaurants that would realistically exist within 30 miles of the given coordinates.`;

  if (userHistory) {
    prompt += `

User's dining history:
- Preferred cuisines: ${userHistory.preferredCuisines.join(", ")}
- Previous ratings: ${userHistory.ratedRestaurants.map(r => `${r.restaurantName} (${r.rating}/5)`).join(", ")}
- Price preference: ${userHistory.pricePreference || "flexible"}`;
  }

  prompt += `

Please recommend 3-4 restaurants that match these criteria perfectly.`;

  return prompt;
}

function createGroupRecommendationPrompt(preferences: CustomPreferences, groupHistory: any): string {
  return `Generate restaurant recommendations for a group dining experience:

Current Request:
- Food Type: ${preferences.foodType}
- Price Range: ${preferences.priceRange}
- Group Size: ${preferences.groupSize} people
- Occasion: ${preferences.occasion}
- Ambiance: ${preferences.ambiance}
- Dietary Restrictions: ${preferences.dietaryRestrictions.join(", ") || "None"}

Group History:
- Previous group events: ${groupHistory.groupEvents.map((e: any) => `${e.restaurantName} (rated ${e.rating}/5)`).join(", ")}
- Member preferences: ${groupHistory.memberPreferences.map((p: any) => p.preferredCuisines.join("/")).join(", ")}

Focus on restaurants that can accommodate the group size comfortably and have options that appeal to the group's collective preferences.`;
}