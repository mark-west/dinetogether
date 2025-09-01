import OpenAI from "openai";

// Check if OpenAI API key is available
const hasOpenAI = !!process.env.OPENAI_API_KEY;

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = hasOpenAI ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

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
  location: string = "current area"
): Promise<RestaurantRecommendation[]> {
  try {
    // Fallback if OpenAI is not available
    if (!openai || !hasOpenAI) {
      return getFallbackRecommendations(userPreferences, location);
    }

    const prompt = createRecommendationPrompt(userPreferences, location);
    
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an expert restaurant recommendation engine that analyzes dining patterns, ratings, and preferences to suggest personalized restaurant recommendations. 
          
          Consider the user's:
          - Previous ratings and preferences
          - Cuisine preferences and dining history
          - Price preferences and location
          - Similar user patterns and popular trends
          
          Provide realistic restaurant recommendations that would likely exist in the specified area. Include a confidence score and detailed reasoning for each recommendation.
          
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
    return result.recommendations || [];
  } catch (error) {
    console.error("Error generating AI recommendations:", error);
    // Use fallback recommendations when AI fails
    return getFallbackRecommendations(userPreferences, location);
  }
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

    const response = await openai.chat.completions.create({
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
  userHistory?: UserPreferences
): Promise<CustomRecommendation[]> {
  try {
    // Fallback if OpenAI is not available
    if (!openai || !hasOpenAI) {
      return getFallbackCustomRecommendations(preferences, userHistory);
    }

    const prompt = createCustomRecommendationPrompt(preferences, userHistory);
    
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
    return getFallbackCustomRecommendations(preferences, userHistory);
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

function getFallbackCustomRecommendations(preferences: CustomPreferences, userHistory?: UserPreferences): CustomRecommendation[] {
  const cuisineMap: { [key: string]: string[] } = {
    italian: ["Bella Vista", "Romano's Kitchen", "Little Italy"],
    chinese: ["Dragon Palace", "Golden Wok", "Panda Garden"],
    mexican: ["Casa Miguel", "El Mariachi", "Taco Libre"],
    japanese: ["Sakura Sushi", "Tokyo Bay", "Ramen House"],
    indian: ["Spice Garden", "Curry Palace", "Mumbai Kitchen"],
    american: ["The Garden Bistro", "Main Street Grill", "Liberty Diner"],
    thai: ["Thai Orchid", "Bangkok Street", "Coconut Palace"],
    any: ["The Garden Bistro", "Bella Vista", "Dragon Palace"]
  };

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

function createCustomRecommendationPrompt(preferences: CustomPreferences, userHistory?: UserPreferences): string {
  let prompt = `Generate restaurant recommendations based on these specific preferences:

Food Type: ${preferences.foodType}
Price Range: ${preferences.priceRange}
Group Size: ${preferences.groupSize} people
Occasion: ${preferences.occasion}
Ambiance: ${preferences.ambiance}
Dietary Restrictions: ${preferences.dietaryRestrictions.join(", ") || "None"}
Location: ${preferences.location || "current area"}`;

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