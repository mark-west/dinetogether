import OpenAI from "openai";

// Check if OpenAI API key is available
const hasOpenAI = !!process.env.OPENAI_API_KEY;

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = hasOpenAI ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// Helper function to fetch nearby restaurants from Google Places API for AI recommendations
async function fetchNearbyRestaurantsForAI(latitude: number, longitude: number, radius: number) {
  const API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!API_KEY) {
    console.error('Google Maps API key not configured');
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
      console.error('Google Places API error:', data.status, data.error_message);
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
      return getFallbackRecommendations(userPreferences, location);
    }

    // Use AI to rank and filter the real restaurants based on user preferences
    if (!openai || !hasOpenAI) {
      return convertToRecommendations(localRestaurants.slice(0, 8));
    }

    const prompt = createLocalRecommendationPrompt(userPreferences, localRestaurants, location);
    
    const response = await openai.chat.completions.create({
      model: "gpt-5",
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
    // Use local restaurants as fallback
    const localRestaurants = await fetchNearbyRestaurantsForAI(latitude, longitude, 48280);
    return convertToRecommendations(localRestaurants.slice(0, 8));
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
      model: "gpt-5",
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
  try {
    // Fallback if OpenAI is not available
    if (!openai || !hasOpenAI) {
      return getFallbackCustomRecommendations(preferences, userHistory, latitude, longitude);
    }

    const prompt = createCustomRecommendationPrompt(preferences, userHistory, latitude, longitude);
    
    const response = await openai.chat.completions.create({
      model: "gpt-5",
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
  } catch (error) {
    console.error("Error generating custom AI recommendations:", error);
    return getFallbackCustomRecommendations(preferences, userHistory, latitude, longitude);
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
    // Fallback if OpenAI is not available
    if (!openai || !hasOpenAI) {
      return getFallbackGroupRecommendations(preferences, groupHistory);
    }

    const prompt = createGroupRecommendationPrompt(preferences, groupHistory);
    
    const response = await openai.chat.completions.create({
      model: "gpt-5",
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
    return getFallbackGroupRecommendations(preferences, groupHistory);
  }
}

// Fallback recommendations when AI is unavailable
function getFallbackRecommendations(userPreferences: UserPreferences, location: string): RestaurantRecommendation[] {
  const fallbackRestaurants = [
    {
      name: "Bella Vista Italian",
      cuisine: "Italian",
      priceRange: "$$",
      estimatedRating: 4.2,
      location: location,
      reasonForRecommendation: "Popular Italian restaurant with great reviews, perfect for most dining occasions",
      confidenceScore: 0.75
    },
    {
      name: "Dragon Palace",
      cuisine: "Chinese",
      priceRange: "$",
      estimatedRating: 4.0,
      location: location,
      reasonForRecommendation: "Affordable Chinese cuisine with authentic flavors and family-friendly atmosphere",
      confidenceScore: 0.70
    },
    {
      name: "The Garden Bistro",
      cuisine: "American",
      priceRange: "$$$",
      estimatedRating: 4.4,
      location: location,
      reasonForRecommendation: "Upscale American dining with seasonal menu and excellent service",
      confidenceScore: 0.80
    }
  ];

  return fallbackRestaurants;
}

// Helper function to get location-based restaurant names
function getLocationBasedRestaurants(latitude?: number, longitude?: number): { [key: string]: string[] } {
  // If coordinates are in Wisconsin area (roughly lat 43-47, lng -87 to -92)
  if (latitude && longitude && latitude >= 42 && latitude <= 47 && longitude >= -92 && longitude <= -87) {
    return {
      italian: ["Lombardino's Restaurant", "Osteria Papavero", "Salvatore's Tomato Pies"],
      chinese: ["Hong Kong Cafe", "Taste of China", "Golden Dragon"],
      mexican: ["Tornado Steak Lodge", "La Hacienda", "Casa Blanca"],
      japanese: ["Sakura Japanese Cuisine", "Wasabi Japanese Restaurant", "Kanpai"],
      indian: ["Swagat Restaurant", "Himalayan Restaurant", "India Palace"],
      american: ["The Old Fashioned", "Graze", "Tornado Room"],
      thai: ["Thai Orchid", "Sala Thai", "Bangkok House"],
      any: ["The Old Fashioned", "Lombardino's Restaurant", "Hong Kong Cafe"]
    };
  }
  
  // Default to general restaurant names for other locations
  return {
    italian: ["Bella Vista", "Romano's Kitchen", "Little Italy"],
    chinese: ["Dragon Palace", "Golden Wok", "Panda Garden"],
    mexican: ["Casa Miguel", "El Mariachi", "Taco Libre"],
    japanese: ["Sakura Sushi", "Tokyo Bay", "Ramen House"],
    indian: ["Spice Garden", "Curry Palace", "Mumbai Kitchen"],
    american: ["The Garden Bistro", "Main Street Grill", "Liberty Diner"],
    thai: ["Thai Orchid", "Bangkok Street", "Coconut Palace"],
    any: ["The Garden Bistro", "Bella Vista", "Dragon Palace"]
  };
}

function getFallbackCustomRecommendations(preferences: CustomPreferences, userHistory?: UserPreferences, latitude?: number, longitude?: number): CustomRecommendation[] {
  const cuisineMap = getLocationBasedRestaurants(latitude, longitude);

  const restaurants = cuisineMap[preferences.foodType] || cuisineMap.any;
  const priceSymbol = preferences.priceRange === 'budget' ? '$' : 
                     preferences.priceRange === 'moderate' ? '$$' : 
                     preferences.priceRange === 'upscale' ? '$$$' : '$$$$';

  return restaurants.map((name, index) => ({
    name,
    type: preferences.foodType === 'any' ? ['Italian', 'Chinese', 'American'][index] : preferences.foodType,
    rating: 3.8 + Math.random() * 1.2,
    priceRange: priceSymbol,
    description: `A ${preferences.occasion} restaurant perfect for ${preferences.groupSize} people with ${preferences.ambiance} ambiance`,
    confidence: 0.75 + Math.random() * 0.2,
    reasons: [
      `Matches your ${preferences.foodType} preference`,
      `${preferences.priceRange} price range`,
      `Great for ${preferences.occasion}`,
      `${preferences.ambiance} atmosphere`
    ]
  }));
}

function getFallbackGroupRecommendations(preferences: CustomPreferences, groupHistory: any): CustomRecommendation[] {
  const groupFavorites = [
    {
      name: "Family Table",
      type: "American",
      rating: 4.3,
      priceRange: "$$",
      description: "Spacious restaurant perfect for groups with diverse menu options that please everyone",
      confidence: 0.85,
      reasons: ["Group-friendly seating", "Diverse menu", "Moderate pricing", "Good for celebrations"]
    },
    {
      name: "Round Table Pizza",
      type: "Italian",
      rating: 4.1,
      priceRange: "$",
      description: "Casual dining perfect for large groups with shareable options and family atmosphere",
      confidence: 0.80,
      reasons: ["Great for groups", "Shareable food", "Budget-friendly", "Casual atmosphere"]
    },
    {
      name: "Fusion Bistro",
      type: "Fusion",
      rating: 4.4,
      priceRange: "$$$",
      description: "Modern restaurant with eclectic menu accommodating various dietary preferences",
      confidence: 0.78,
      reasons: ["Varied cuisine options", "Dietary accommodations", "Modern atmosphere", "Group reservations available"]
    }
  ];

  return groupFavorites;
}

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