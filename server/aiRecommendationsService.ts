import OpenAI from 'openai';
import { GooglePlacesService } from './googlePlacesService';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

const googlePlacesService = new GooglePlacesService(process.env.GOOGLE_MAPS_API_KEY || '');

export interface RestaurantRecommendation {
  id: string;
  name: string;
  type: string;
  priceRange: string;
  rating: number;
  description: string;
  address: string;
  phoneNumber?: string;
  website?: string;
  hours?: string;
  confidence: number;
  reasons: string[];
  menuHighlights: string[];
  reviewCount?: number;
  businessStatus?: string;
  placeId: string;
}

export interface CustomPreferences {
  foodTypes: string[];
  priceRange: string;
  groupSize: number;
  occasion: string;
  dietaryRestrictions: string[];
  atmosphere: string;
  distance: number;
}

export class AIRecommendationsService {
  
  /**
   * NEW: Natural language restaurant search powered by OpenAI
   */
  async searchWithNaturalLanguage(
    query: string,
    coordinates: { lat: number; lng: number },
    userId?: string
  ): Promise<RestaurantRecommendation[]> {
    console.log('=== NATURAL LANGUAGE RESTAURANT SEARCH ===');
    console.log('Query:', query);
    console.log('Location:', coordinates);

    // Step 1: Extract preferences from natural language using OpenAI
    const preferences = await this.parseNaturalLanguageQuery(query);
    console.log('Extracted preferences:', preferences);

    // Step 2: Search Google Places  
    const radius = (preferences.distance || 10) * 1609.34; // Default 10 miles
    const nearbyPlaces = await googlePlacesService.searchNearbyPlaces(
      coordinates.lat,
      coordinates.lng,
      radius
    );

    console.log(`Found ${nearbyPlaces.length} nearby restaurants`);

    // Step 3: Get detailed data for AI analysis
    const restaurantData = [];
    for (const place of nearbyPlaces.slice(0, 15)) {
      try {
        const placeDetails = await googlePlacesService.getPlaceDetails(place.id);
        if (placeDetails) {
          restaurantData.push({
            place,
            placeDetails,
            basicInfo: {
              name: place.displayName.text,
              rating: place.rating,
              priceLevel: this.formatPriceLevelFromGoogle(place.priceLevel),
              reviewCount: place.userRatingCount,
              address: place.formattedAddress,
              type: place.primaryType
            }
          });
        }
      } catch (error) {
        console.error(`Error processing ${place.displayName.text}:`, error);
      }
    }

    // Step 4: Let OpenAI analyze and recommend
    const recommendations = await this.getAIRecommendations(query, restaurantData, preferences);
    
    console.log(`Returning ${recommendations.length} AI-curated recommendations`);
    return recommendations;
  }

  /**
   * Generate custom restaurant recommendations based on user preferences
   */
  async generateCustomRecommendations(
    preferences: CustomPreferences,
    userHistory: any[],
    latitude: number,
    longitude: number
  ): Promise<RestaurantRecommendation[]> {
    
    // First, get nearby restaurants from Google Places
    const radius = preferences.distance * 1609.34; // Convert miles to meters
    const nearbyPlaces = await googlePlacesService.searchNearbyPlaces(latitude, longitude, radius);
    
    if (nearbyPlaces.length === 0) {
      console.log('No nearby places found');
      return [];
    }

    console.log(`Found ${nearbyPlaces.length} nearby restaurants`);

    // Get detailed information for top restaurants
    const detailedRecommendations: RestaurantRecommendation[] = [];
    
    for (const place of nearbyPlaces.slice(0, 8)) {
      try {
        const details = await googlePlacesService.getPlaceDetails(place.id);
        
        if (details) {
          const recommendation: RestaurantRecommendation = {
            id: place.id,
            name: details.displayName.text,
            type: details.primaryType || 'restaurant',
            priceRange: googlePlacesService.formatPriceLevel(details.priceLevel),
            rating: details.rating || 0,
            description: await this.generateRestaurantDescription(details, preferences),
            address: details.formattedAddress || '',
            phoneNumber: details.nationalPhoneNumber,
            website: details.websiteUri,
            hours: googlePlacesService.formatOpeningHours(details.regularOpeningHours),
            confidence: this.calculateConfidenceScore(details, preferences),
            reasons: await this.generateReasons(details, preferences),
            menuHighlights: googlePlacesService.extractMenuHighlights(details.reviews),
            reviewCount: details.userRatingCount,
            businessStatus: details.businessStatus,
            placeId: place.id
          };
          
          detailedRecommendations.push(recommendation);
        }
      } catch (error) {
        console.error(`Error getting details for ${place.displayName.text}:`, error);
      }
    }

    // Sort by confidence score and rating
    detailedRecommendations.sort((a, b) => {
      const confidenceWeight = 0.7;
      const ratingWeight = 0.3;
      
      const scoreA = (a.confidence * confidenceWeight) + (a.rating / 5 * ratingWeight);
      const scoreB = (b.confidence * confidenceWeight) + (b.rating / 5 * ratingWeight);
      
      return scoreB - scoreA;
    });

    return detailedRecommendations.slice(0, 6);
  }

  /**
   * Generate a description for a restaurant using AI if available
   */
  private async generateRestaurantDescription(
    details: any,
    preferences: CustomPreferences
  ): Promise<string> {
    
    if (!openai) {
      // Fallback description without AI
      const rating = details.rating ? `${details.rating}-star` : 'highly-rated';
      const type = details.primaryType || 'restaurant';
      return `${rating} ${type} located at ${details.formattedAddress}. ${details.userRatingCount || 0} reviews.`;
    }

    try {
      const prompt = `Create a concise, appealing description for this restaurant:
Name: ${details.displayName.text}
Type: ${details.primaryType}
Rating: ${details.rating}/5 (${details.userRatingCount} reviews)
Address: ${details.formattedAddress}
Price Level: ${details.priceLevel}

User preferences: ${preferences.foodTypes.join(', ')}, ${preferences.atmosphere} atmosphere, ${preferences.occasion}

Write 1-2 sentences highlighting why this restaurant matches the user's preferences.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.7
      });

      return response.choices[0].message.content?.trim() || 
        `${details.rating}-star ${details.primaryType} at ${details.formattedAddress}`;
        
    } catch (error) {
      console.error('Error generating description:', error);
      return `${details.rating}-star ${details.primaryType} at ${details.formattedAddress}`;
    }
  }

  /**
   * Generate reasons why this restaurant matches user preferences
   */
  private async generateReasons(
    details: any,
    preferences: CustomPreferences
  ): Promise<string[]> {
    
    const reasons: string[] = [];

    // Rating-based reason
    if (details.rating >= 4.0) {
      reasons.push(`Highly rated (${details.rating}/5 stars)`);
    }

    // Price match
    const priceLevel = googlePlacesService.formatPriceLevel(details.priceLevel);
    if (priceLevel === preferences.priceRange) {
      reasons.push(`Matches your ${preferences.priceRange} budget`);
    }

    // Type match
    if (preferences.foodTypes.some(type => 
      details.primaryType?.toLowerCase().includes(type.toLowerCase())
    )) {
      reasons.push(`Serves ${preferences.foodTypes.join(' and ')}`);
    }

    // Review count
    if (details.userRatingCount > 100) {
      reasons.push(`Popular choice with ${details.userRatingCount}+ reviews`);
    }

    return reasons.slice(0, 3);
  }

  /**
   * Calculate confidence score based on how well the restaurant matches preferences
   */
  private calculateConfidenceScore(
    details: any,
    preferences: CustomPreferences
  ): number {
    let score = 0.5; // Base score

    // Rating boost
    if (details.rating >= 4.0) score += 0.2;
    if (details.rating >= 4.5) score += 0.1;

    // Price match
    const priceLevel = googlePlacesService.formatPriceLevel(details.priceLevel);
    if (priceLevel === preferences.priceRange) score += 0.15;

    // Review count boost
    if (details.userRatingCount > 50) score += 0.1;
    if (details.userRatingCount > 200) score += 0.05;

    // Business status
    if (details.businessStatus === 'OPERATIONAL') score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Parse natural language query into structured preferences using OpenAI
   */
  private async parseNaturalLanguageQuery(query: string): Promise<any> {
    if (!openai) return { distance: 10 }; // Fallback

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // Using gpt-4o which supports JSON mode
        messages: [{
          role: "user",
          content: `Parse this restaurant search query into structured preferences:
"${query}"

Extract and return JSON with these fields (use null if not mentioned):
- occasion: string (e.g., "date night", "business meeting", "casual dining", "celebration")
- priceRange: string ("$", "$$", "$$$", "$$$$")  
- foodType: string (e.g., "Italian", "sushi", "steakhouse")
- ambiance: string (e.g., "romantic", "casual", "upscale", "quiet")
- dietaryRestrictions: array of strings
- distance: number (miles, default 10 if not specified)
- groupSize: number (default 2)
- specialRequests: array of strings (outdoor seating, live music, etc.)

Respond with only valid JSON.`
        }],
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Error parsing natural language query:', error);
      return { distance: 10 };
    }
  }

  /**
   * Get AI-powered restaurant recommendations with improved JSON format handling
   */
  private async getAIRecommendations(
    originalQuery: string,
    restaurantData: any[],
    preferences: any
  ): Promise<RestaurantRecommendation[]> {
    if (!openai) return []; // No AI available

    try {
      const restaurantSummaries = restaurantData.map(r => ({
        name: r.basicInfo.name,
        rating: r.basicInfo.rating,
        priceLevel: r.basicInfo.priceLevel,
        reviewCount: r.basicInfo.reviewCount,
        type: r.basicInfo.type,
        reviews: r.placeDetails.reviews?.slice(0, 3).map((rev: any) => rev.text?.text).join(' ') || ''
      }));

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // Using gpt-4o which supports JSON mode
        messages: [{
          role: "user",
          content: `User query: "${originalQuery}"
Extracted preferences: ${JSON.stringify(preferences, null, 2)}

Available restaurants: ${JSON.stringify(restaurantSummaries, null, 2)}

Analyze these restaurants and select the 3-6 best matches for the user's query. Consider:
- How well each restaurant matches the specific request
- Review content mentioning relevant keywords
- Price appropriateness
- Rating and popularity
- Overall suitability for the occasion

IMPORTANT: Return ONLY valid JSON format. Do NOT use tables, markdown, or any other formatting. 

Return JSON array with selected restaurants, each containing:
- name: string
- rating: number  
- priceRange: string
- confidence: number (0-1, how well it matches)
- reasons: array of 2-3 specific reasons why it's a good match
- description: engaging 1-sentence description highlighting why it fits their request

Be selective - only recommend restaurants that truly match the request. Respond with valid JSON only.`
        }],
        response_format: { type: "json_object" }
      });

      const aiResults = JSON.parse(response.choices[0].message.content || '{"restaurants":[]}');
      
      // Convert to our format
      return await this.convertAIResultsToRecommendations(aiResults.restaurants || [], restaurantData);
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
      return [];
    }
  }

  /**
   * Convert AI results back to our recommendation format
   */
  private async convertAIResultsToRecommendations(
    aiResults: any[],
    restaurantData: any[]
  ): Promise<RestaurantRecommendation[]> {
    const recommendations: RestaurantRecommendation[] = [];

    for (const aiResult of aiResults) {
      const matchingData = restaurantData.find(r => 
        r.basicInfo.name.toLowerCase() === aiResult.name.toLowerCase()
      );

      if (matchingData) {
        const { place, placeDetails } = matchingData;
        
        const recommendation: RestaurantRecommendation = {
          id: place.id,
          name: place.displayName.text,
          type: place.primaryType || 'restaurant',
          priceRange: this.formatPriceLevelFromGoogle(place.priceLevel),
          rating: place.rating || 0,
          description: aiResult.description || `${place.displayName.text} - ${place.primaryType}`,
          address: place.formattedAddress || '',
          phoneNumber: placeDetails.nationalPhoneNumber || '',
          website: placeDetails.websiteUri || '',
          hours: googlePlacesService.formatOpeningHours(placeDetails.regularOpeningHours),
          confidence: aiResult.confidence || 0.5,
          reasons: aiResult.reasons || ['Good match for your query'],
          menuHighlights: googlePlacesService.extractMenuHighlights(placeDetails.reviews),
          reviewCount: place.userRatingCount || 0,
          businessStatus: placeDetails.businessStatus,
          placeId: place.id
        };
        
        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  /**
   * Format price level from Google Places API
   */
  private formatPriceLevelFromGoogle(priceLevel?: string): string {
    switch (priceLevel) {
      case 'PRICE_LEVEL_FREE': return '$';
      case 'PRICE_LEVEL_INEXPENSIVE': return '$';
      case 'PRICE_LEVEL_MODERATE': return '$$';
      case 'PRICE_LEVEL_EXPENSIVE': return '$$$';
      case 'PRICE_LEVEL_VERY_EXPENSIVE': return '$$$$';
      default: return '$$';
    }
  }
}

export default AIRecommendationsService;