import OpenAI from 'openai';
import { GooglePlacesService } from './googlePlacesService';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

const googlePlacesService = new GooglePlacesService(process.env.GOOGLE_MAPS_API_KEY2 || '');

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
}

export default AIRecommendationsService;