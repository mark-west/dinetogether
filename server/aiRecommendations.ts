import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

export async function generateRestaurantRecommendations(
  userPreferences: UserPreferences,
  location: string = "current area"
): Promise<RestaurantRecommendation[]> {
  try {
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
    return [];
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