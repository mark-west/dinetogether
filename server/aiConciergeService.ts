import OpenAI from 'openai';
import { GooglePlacesService } from './googlePlacesService';

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface AIConciergeRequest {
  prompt: string;
  latitude: number;
  longitude: number;
  userId?: string;
  groupId?: string;
}

interface RestaurantRecommendation {
  id: string;
  name: string;
  type: string;
  rating: number;
  priceRange: string;
  description: string;
  confidence: number;
  reasons: string[];
  address?: string;
  location?: string;
  phone?: string;
  website?: string;
  openingHours?: any;
  placeId?: string;
  latitude?: number;
  longitude?: number;
}

export class AIConciergeService {
  private googlePlacesService: GooglePlacesService;

  constructor() {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }
    this.googlePlacesService = new GooglePlacesService(apiKey);
  }

  async processNaturalLanguageRequest(request: AIConciergeRequest): Promise<{ restaurants: RestaurantRecommendation[] }> {
    try {
      console.log('AI Concierge Processing Request:', { 
        prompt: request.prompt, 
        coordinates: `${request.latitude},${request.longitude}` 
      });

      // Step 1: Use OpenAI to interpret the natural language request
      const gptResponse = await this.interpretRequest(request.prompt, request.latitude, request.longitude);
      console.log('OpenAI Response:', gptResponse);

      // Step 2: Extract restaurant names/addresses from GPT response
      const restaurantNames = this.extractRestaurantNames(gptResponse.restaurants);
      console.log('Extracted restaurant names for Google Places search:', restaurantNames);

      // Step 3: Search Google Places API for each restaurant
      const detailedRestaurants = await this.enrichWithGooglePlacesData(
        restaurantNames, 
        request.latitude, 
        request.longitude
      );
      console.log('Google Places API enriched data:', detailedRestaurants);

      return { restaurants: detailedRestaurants };
    } catch (error) {
      console.error('AI Concierge Service Error:', error);
      throw error;
    }
  }

  private async interpretRequest(prompt: string, latitude: number, longitude: number): Promise<any> {
    const systemPrompt = `You are a restaurant recommendation AI assistant. The user is located at coordinates ${latitude}, ${longitude}. 

Based on their natural language request, provide restaurant recommendations in the following JSON format:

{
  "restaurants": [
    {
      "name": "Restaurant Name",
      "address": "Full Address",
      "type": "Cuisine Type",
      "reasoning": "Why this matches their request"
    }
  ]
}

Requirements:
1. Only recommend restaurants that exist near the provided coordinates
2. Provide REAL restaurant names and addresses, not fictional ones
3. Include complete street addresses when possible
4. Focus on restaurants that match the user's specific request
5. Limit to 6 restaurants maximum
6. Prioritize highly-rated, well-known establishments

User location: ${latitude}, ${longitude}
User request: ${prompt}

Respond with only valid JSON, no additional text.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user", 
          content: `near ${latitude}, ${longitude}, restaurant results only, and add google Places API data: ${prompt}`
        }
      ],
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content || '{"restaurants": []}');
  }

  private extractRestaurantNames(restaurants: any[]): Array<{name: string, address?: string, reasoning?: string}> {
    if (!Array.isArray(restaurants)) {
      return [];
    }

    return restaurants.map(restaurant => ({
      name: restaurant.name || '',
      address: restaurant.address || '',
      reasoning: restaurant.reasoning || ''
    })).filter(r => r.name.length > 0);
  }

  private async enrichWithGooglePlacesData(
    restaurantList: Array<{name: string, address?: string, reasoning?: string}>, 
    latitude: number, 
    longitude: number
  ): Promise<RestaurantRecommendation[]> {
    const enrichedRestaurants: RestaurantRecommendation[] = [];
    
    for (const restaurant of restaurantList) {
      try {
        console.log(`Searching Google Places for: ${restaurant.name} ${restaurant.address || ''}`);
        
        // Search for the restaurant using text search
        const searchQuery = `${restaurant.name} ${restaurant.address || ''}`.trim();
        const places = await this.googlePlacesService.searchByText(
          searchQuery,
          latitude,
          longitude,
          30000 // 30km radius
        );

        if (places && places.length > 0) {
          // Get detailed information for the first (most relevant) result
          const place = places[0];
          const details = await this.googlePlacesService.getPlaceDetails(place.id);
          
          if (details) {
            
            const enrichedRestaurant: RestaurantRecommendation = {
              id: place.id,
              name: details.displayName.text,
              type: this.formatPrimaryType(details.primaryType),
              rating: details.rating || 0,
              priceRange: this.googlePlacesService.formatPriceLevel(details.priceLevel),
              description: this.generateDescription(details, restaurant.reasoning || ''),
              confidence: 0.85,
              reasons: [restaurant.reasoning || 'AI-generated recommendation'].filter(Boolean),
              address: details.formattedAddress || '',
              location: details.formattedAddress || '',
              phone: details.nationalPhoneNumber || '',
              website: details.websiteUri || '',
              latitude: details.location?.latitude,
              longitude: details.location?.longitude,
              openingHours: details.regularOpeningHours ? {
                open_now: details.regularOpeningHours.openNow,
                weekdayDescriptions: details.regularOpeningHours.weekdayDescriptions,
                periods: details.regularOpeningHours.periods
              } : null,
              placeId: place.id
            };

            enrichedRestaurants.push(enrichedRestaurant);
            console.log(`Successfully enriched: ${enrichedRestaurant.name}`);
          }
        } else {
          console.log(`No Google Places results found for: ${restaurant.name}`);
        }
      } catch (error) {
        console.error(`Error enriching restaurant ${restaurant.name}:`, error);
        // Continue with other restaurants even if one fails
      }
    }

    return enrichedRestaurants;
  }

  private formatPrimaryType(primaryType?: string): string {
    if (!primaryType) return 'Restaurant';
    
    const typeMap: { [key: string]: string } = {
      'restaurant': 'Restaurant',
      'meal_takeaway': 'Takeaway',
      'meal_delivery': 'Delivery',
      'cafe': 'Cafe',
      'bar': 'Bar',
      'bakery': 'Bakery',
      'fast_food_restaurant': 'Fast Food',
      'pizza_restaurant': 'Pizza',
      'chinese_restaurant': 'Chinese',
      'italian_restaurant': 'Italian',
      'mexican_restaurant': 'Mexican',
      'japanese_restaurant': 'Japanese',
      'indian_restaurant': 'Indian'
    };

    return typeMap[primaryType] || primaryType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  private generateDescription(details: any, aiReasoning: string): string {
    const parts: string[] = [];
    
    if (aiReasoning) {
      parts.push(aiReasoning);
    }
    
    if (details.rating && details.userRatingCount) {
      parts.push(`Highly rated (${details.rating}/5 with ${details.userRatingCount} reviews)`);
    }
    
    if (details.priceLevel) {
      const priceDesc = this.getPriceLevelDescription(details.priceLevel);
      parts.push(priceDesc);
    }
    
    return parts.join('. ') || 'Great restaurant option for your dining preferences.';
  }

  private getPriceLevelDescription(priceLevel: string): string {
    const levelMap: { [key: string]: string } = {
      'PRICE_LEVEL_FREE': 'Free',
      'PRICE_LEVEL_INEXPENSIVE': 'Budget-friendly pricing',
      'PRICE_LEVEL_MODERATE': 'Moderate pricing', 
      'PRICE_LEVEL_EXPENSIVE': 'Upscale dining',
      'PRICE_LEVEL_VERY_EXPENSIVE': 'Fine dining experience'
    };
    
    return levelMap[priceLevel] || '';
  }
}

export const aiConciergeService = new AIConciergeService();