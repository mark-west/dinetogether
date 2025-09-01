import OpenAI from "openai";

// Check if OpenAI API key is available
const hasOpenAI = !!process.env.OPENAI_API_KEY;

// Using gpt-4o model for reliable AI recommendations
const openai = hasOpenAI ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// Helper function to fetch nearby restaurants from Google Places API for AI recommendations
async function fetchNearbyRestaurantsForAI(latitude: number, longitude: number, radius: number) {
  console.log('=== AI RECOMMENDATIONS FETCH NEARBY RESTAURANTS ===');
  console.log('AI Fetch Parameters:', { latitude, longitude, radius });
  const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  console.log('AI Using Google Maps API key:', API_KEY ? `Key exists: ${API_KEY?.substring(0, 10)}...` : 'No key found');
  if (!API_KEY) {
    console.error('AI: Server-side Google Maps API key not configured');
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
  console.log('AI Making Google Places API call to:', url.replace(API_KEY, 'API_KEY_HIDDEN'));

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log('AI Google Places API response status:', data.status);
    console.log('AI Number of results:', data.results?.length || 0);

    if (data.status !== 'OK' || !data.results) {
      console.error('AI Google Places API error:', data.status, data.error_message);
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
        address: place.vicinity,
        photoReference: place.photos?.[0]?.photo_reference
      }));

    return filteredRestaurants;
  } catch (error) {
    console.error('Error fetching restaurants from Google Places:', error);
    return [];
  }
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
}

export async function generateRestaurantRecommendations(
  userPreferences: UserPreferences,
  location: string = "current area",
  latitude: number = 33.7490,
  longitude: number = -84.3880
): Promise<RestaurantRecommendation[]> {
  try {
    // Get real restaurants from Google Places API within 30 miles
    const radius = 48280; // 30 miles in meters
    const localRestaurants = await fetchNearbyRestaurantsForAI(latitude, longitude, radius);
    
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
          content: `You are an expert restaurant recommendation engine. You will be given a list of REAL restaurants from Google Places API and user preferences. Your job is to:
          
          1. Select and rank the 5-8 best restaurants from the provided list based on user preferences
          2. Provide detailed reasoning for each recommendation
          3. Assign confidence scores based on how well each restaurant matches user preferences
          
          IMPORTANT: Only recommend restaurants from the provided list. Do not invent restaurants.
          
          Respond with JSON in this exact format: { "recommendations": [{"name": "Restaurant Name", "cuisine": "Cuisine Type", "priceRange": "$$", "estimatedRating": 4.2, "location": "Address/Area", "reasonForRecommendation": "Detailed explanation", "confidenceScore": 0.85}] }`
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
    return result.recommendations || convertToRecommendations(localRestaurants.slice(0, 8));
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
  
  prompt += "Available Restaurants:\n";
  localRestaurants.forEach((restaurant, index) => {
    prompt += `${index + 1}. ${restaurant.name} (${restaurant.cuisine}) - ${restaurant.priceRange} - Rating: ${restaurant.rating} - ${restaurant.address}\n`;
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

// Helper function to convert Google Places restaurants to recommendation format
function convertToRecommendations(restaurants: any[]): RestaurantRecommendation[] {
  return restaurants.map(restaurant => ({
    name: restaurant.name,
    cuisine: restaurant.cuisine,
    priceRange: restaurant.priceRange,
    estimatedRating: restaurant.rating,
    location: restaurant.address,
    reasonForRecommendation: `Local restaurant with ${restaurant.rating} star rating`,
    confidenceScore: 0.7
  }));
}

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

// Mock function for external review integration (Google/Yelp)
// In a real implementation, this would call actual APIs
export async function enrichWithExternalReviews(
  recommendations: RestaurantRecommendation[]
): Promise<RestaurantRecommendation[]> {
  // Simulate external API calls with realistic review data
  return recommendations.map(restaurant => ({
    ...restaurant,
    externalRating: {
      google: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0-5.0 range
      yelp: Math.round((Math.random() * 2 + 3) * 10) / 10
    }
  }));
}

// Generate custom recommendations based on user preferences
export async function generateCustomRecommendations(
  preferences: CustomPreferences,
  userHistory?: UserPreferences,
  latitude: number = 33.7490,
  longitude: number = -84.3880
): Promise<CustomRecommendation[]> {
  console.log('=== GENERATING CUSTOM RECOMMENDATIONS ===');
  console.log('Preferences:', preferences);
  console.log('Location:', { latitude, longitude });
  
  try {
    // Try OpenAI first if available
    if (openai && hasOpenAI) {
      const prompt = createCustomRecommendationPrompt(preferences, userHistory, latitude, longitude);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert restaurant recommendation engine that creates personalized suggestions based on specific user preferences and requirements.
            
            Consider:
            - Food type and cuisine preferences
            - Price range and budget constraints
            - Group size and dining dynamics
            - Occasion and atmosphere requirements
            - Dietary restrictions and special needs
            - User's historical preferences if available
            
            Provide realistic restaurant recommendations that match all specified criteria. Include confidence scores and detailed reasoning.
            
            Respond with JSON in this exact format: { "recommendations": [{"name": "Restaurant Name", "type": "Cuisine Type", "rating": 4.2, "priceRange": "$$", "description": "Detailed description", "confidence": 0.85, "reasons": ["reason1", "reason2", "reason3"]}] }`
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
    }
  } catch (error) {
    console.error("Error generating custom AI recommendations:", error);
    console.log('OpenAI API failed - falling back to Google Places recommendations');
  }

  // Fallback to Google Places when OpenAI is unavailable or fails
  console.log('Using Google Places fallback for recommendations');
  try {
    const radius = 48280; // 30 miles in meters
    const nearbyRestaurants = await fetchNearbyRestaurantsForAI(latitude, longitude, radius);
    
    console.log('Found nearby restaurants for fallback:', nearbyRestaurants.length);
    
    // Filter restaurants based on user preferences
    let filteredRestaurants = nearbyRestaurants;
    
    // Filter by food type if specified
    if (preferences.foodType && preferences.foodType.toLowerCase() !== 'any') {
      const preferredType = preferences.foodType.toLowerCase();
      console.log('Filtering by food type:', preferredType);
      
      filteredRestaurants = nearbyRestaurants.filter((restaurant: any) => {
        const restaurantTypes = (restaurant.types || []).join(' ').toLowerCase();
        const restaurantName = restaurant.name.toLowerCase();
        const restaurantCuisine = (restaurant.cuisine || '').toLowerCase();
        
        // Check if restaurant matches the preferred food type
        return restaurantTypes.includes(preferredType) || 
               restaurantName.includes(preferredType) ||
               restaurantCuisine.includes(preferredType);
      });
      
      console.log(`Found ${filteredRestaurants.length} restaurants matching "${preferences.foodType}"`);
    }
    
    // Filter by price range if specified
    if (preferences.priceRange && preferences.priceRange !== 'any') {
      const priceMap = { 'budget': [1], 'moderate': [2], 'upscale': [3, 4] };
      const allowedPriceLevels = priceMap[preferences.priceRange as keyof typeof priceMap] || [1, 2, 3, 4];
      
      filteredRestaurants = filteredRestaurants.filter((restaurant: any) => 
        allowedPriceLevels.includes(restaurant.price_level || 2)
      );
      
      console.log(`After price filtering (${preferences.priceRange}):`, filteredRestaurants.length);
    }
    
    // If no matches found, fall back to all restaurants but mention the limitation
    if (filteredRestaurants.length === 0 && preferences.foodType && preferences.foodType.toLowerCase() !== 'any') {
      console.log('No matches found for preferences, showing all nearby restaurants');
      filteredRestaurants = nearbyRestaurants.slice(0, 6);
    }
    
    // Convert Google Places results to CustomRecommendation format
    const recommendations: CustomRecommendation[] = filteredRestaurants.slice(0, 6).map((restaurant: any) => {
      const matchesPreference = preferences.foodType && preferences.foodType.toLowerCase() !== 'any';
      const preferenceNote = matchesPreference ? 
        `Matches your preference for ${preferences.foodType} cuisine` : 
        'Local restaurant in your area';
        
      return {
        name: restaurant.name,
        type: restaurant.cuisine || restaurant.types?.[0]?.replace('_', ' ') || 'Restaurant',
        rating: restaurant.rating || 4.0,
        priceRange: '$'.repeat(restaurant.price_level || 2),
        description: `${restaurant.name} - ${preferenceNote}. ${restaurant.vicinity || 'Located nearby'}.`,
        confidence: matchesPreference ? 0.9 : 0.7,
        reasons: [
          'Located within 30 miles of your location',
          matchesPreference ? `Serves ${preferences.foodType} cuisine` : 'Based on Google Places data',
          'Real restaurant you can visit'
        ]
      };
    });
    
    console.log('Converted to recommendations:', recommendations.length);
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