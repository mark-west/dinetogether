import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { RestaurantIcon, LocationIcon } from "./ui/app-icons";
import { getRestaurantWebsiteUrl, getWebsiteLinkText } from '@/lib/restaurantUtils';

interface Recommendation {
  name: string;
  type: string; // Server sends 'type', not 'cuisine'
  cuisine?: string; // Keep as optional fallback
  priceRange: string;
  rating: number; // Server sends 'rating'
  estimatedRating?: number; // Keep as optional fallback
  location: string;
  address?: string;
  description: string; // Server sends 'description', not 'reasonForRecommendation'
  reasonForRecommendation?: string; // Keep as optional fallback
  confidence: number; // Server sends 'confidence', not 'confidenceScore'
  confidenceScore?: number; // Keep as optional fallback
  reasons: string[];
  phoneNumber?: string;
  formattedPhoneNumber?: string;
  website?: string;
  openingHours?: any;
  reviews?: any[];
  userRatingsTotal?: number;
  businessStatus?: string;
  placeId?: string;
  externalRating?: {
    google?: number;
    yelp?: number;
  };
}

interface DiningAnalysis {
  primaryCuisines: string[];
  averageRating: number;
  priceSensitivity: string;
  adventurousness: number;
  preferredDiningStyle: string;
}

export function AIRecommendations() {
  const [location, setLocation] = useState("current area");
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [, navigate] = useLocation();

  const { data: apiResponse, isLoading: loadingRecommendations, refetch: refetchRecommendations } = useQuery({
    queryKey: ["/api/recommendations", location],
    retry: false,
    enabled: true,
  });
  
  // Debug the API response structure
  const recommendations = apiResponse?.recommendations || apiResponse;
  console.log('DEBUG: API response:', apiResponse);
  console.log('DEBUG: Recommendations array:', recommendations);

  const { data: analysis, isLoading: loadingAnalysis } = useQuery<DiningAnalysis>({
    queryKey: ["/api/dining-analysis"],
    retry: false,
    enabled: showAnalysis,
  });

  const handleLocationChange = (newLocation: string) => {
    setLocation(newLocation);
    refetchRecommendations();
  };

  const handleRestaurantClick = (restaurant: Recommendation, index: number) => {
    // Generate a restaurant ID from the name and index
    const restaurantId = `${restaurant.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${index}`;
    
    
    // Store comprehensive restaurant data in sessionStorage including all Google Places data
    const restaurantData = {
      id: restaurantId,
      name: restaurant.name,
      type: restaurant.type || restaurant.cuisine || 'Restaurant',
      priceRange: restaurant.priceRange,
      description: restaurant.description || restaurant.reasonForRecommendation || '',
      address: restaurant.location || restaurant.address || '',
      // Store both field name formats to handle different data structures
      phone: restaurant.phoneNumber || restaurant.formattedPhoneNumber || '',
      phoneNumber: restaurant.phoneNumber || restaurant.formattedPhoneNumber || '',
      website: restaurant.website || '',
      websiteUri: restaurant.website || '',
      hours: formatOpeningHours(restaurant.openingHours),
      openingHours: restaurant.openingHours,
      rating: restaurant.rating || restaurant.estimatedRating || 0,
      estimatedRating: restaurant.rating || restaurant.estimatedRating || 0,
      reviewCount: restaurant.userRatingsTotal || 0,
      userRatingsTotal: restaurant.userRatingsTotal || 0,
      menuHighlights: extractMenuHighlights(restaurant.reviews),
      features: [
        'AI-generated recommendation', 
        'Google Maps verified',
        ...(restaurant.website ? ['Website available'] : []),
        ...(restaurant.phoneNumber ? ['Phone available'] : []),
        ...(restaurant.openingHours ? ['Hours available'] : [])
      ],
      reviews: restaurant.reviews || [],
      businessStatus: restaurant.businessStatus,
      placeId: restaurant.placeId
    };
    
    // Clear any existing data for this restaurant to prevent caching issues
    sessionStorage.removeItem(`restaurant_${restaurantId}`);
    sessionStorage.setItem(`restaurant_${restaurantId}`, JSON.stringify(restaurantData));
    console.log('Stored restaurant data:', restaurantData);
    navigate(`/restaurant/${restaurantId}?back=/recommendations`);
  };

  // Helper function to format opening hours for display
  const formatOpeningHours = (openingHours: any) => {
    if (!openingHours) return '';
    
    const currentStatus = openingHours.open_now ? 'Open Now' : 'Currently Closed';
    
    if (openingHours.weekday_text && openingHours.weekday_text.length > 0) {
      // Get today's hours
      const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
      const todaysHours = openingHours.weekday_text[today === 0 ? 6 : today - 1]; // Adjust for Sunday
      return `${currentStatus} • ${todaysHours}`;
    }
    
    return currentStatus;
  };

  // Helper function to extract menu highlights from reviews
  const extractMenuHighlights = (reviews: any[]) => {
    if (!reviews || reviews.length === 0) return [];
    
    const highlights: string[] = [];
    const foodKeywords = ['pizza', 'pasta', 'burger', 'steak', 'chicken', 'fish', 'salad', 'soup', 'dessert', 'coffee', 'wine', 'beer', 'cocktail'];
    
    reviews.forEach(review => {
      if (review.text) {
        const text = review.text.toLowerCase();
        foodKeywords.forEach(keyword => {
          if (text.includes(keyword) && !highlights.some(h => h.toLowerCase().includes(keyword))) {
            // Extract sentence containing the food item
            const sentences = review.text.split(/[.!?]/);
            const relevantSentence = sentences.find((s: string) => s.toLowerCase().includes(keyword));
            if (relevantSentence && relevantSentence.trim().length > 10 && highlights.length < 3) {
              highlights.push(relevantSentence.trim());
            }
          }
        });
      }
    });
    
    return highlights;
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <i
            key={star}
            className={`fas fa-star text-xs ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    if (score >= 0.6) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">AI Restaurant Recommendations</h2>
          <p className="text-muted-foreground">Personalized suggestions based on your dining history and preferences</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAnalysis(!showAnalysis)}
            data-testid="button-toggle-analysis"
          >
            {showAnalysis ? "Hide" : "Show"} My Dining Profile
          </Button>
          <Button 
            onClick={() => refetchRecommendations()}
            size="sm"
            data-testid="button-refresh-recommendations"
          >
            <i className="fas fa-refresh mr-2"></i>
            Refresh
          </Button>
        </div>
      </div>

      {/* Location Filter */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-medium text-muted-foreground">Location:</span>
        {["current area", "downtown", "nearby", "within 5 miles"].map((loc) => (
          <Button
            key={loc}
            variant={location === loc ? "default" : "outline"}
            size="sm"
            onClick={() => handleLocationChange(loc)}
            data-testid={`button-location-${loc.replace(' ', '-')}`}
          >
            {loc}
          </Button>
        ))}
      </div>

      {/* Dining Analysis */}
      {showAnalysis && (
        <Card data-testid="card-dining-analysis">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <i className="fas fa-chart-line text-blue-500"></i>
              Your Dining Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAnalysis ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : analysis ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="font-medium text-foreground">Favorite Cuisines</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {analysis.primaryCuisines.map((cuisine, index) => (
                      <Badge key={index} variant="secondary">{cuisine}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-foreground">Average Rating Given</p>
                  <div className="flex items-center gap-2 mt-1">
                    {renderStars(analysis.averageRating)}
                    <span className="text-sm text-muted-foreground">
                      {analysis.averageRating.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="font-medium text-foreground">Price Preference</p>
                  <Badge variant="outline" className="mt-1 capitalize">
                    {analysis.priceSensitivity}
                  </Badge>
                </div>
                <div>
                  <p className="font-medium text-foreground">Dining Style</p>
                  <Badge variant="outline" className="mt-1 capitalize">
                    {analysis.preferredDiningStyle}
                  </Badge>
                </div>
                <div>
                  <p className="font-medium text-foreground">Adventurousness</p>
                  <div className="mt-1">
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${analysis.adventurousness * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(analysis.adventurousness * 100)}% adventurous
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Unable to analyze dining patterns. Try rating more restaurants!</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <div className="space-y-4">
        {loadingRecommendations ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-3" />
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : recommendations && Array.isArray(recommendations) && recommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(recommendations as Recommendation[]).map((rec: Recommendation, index: number) => (
              <Card 
                key={index} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleRestaurantClick(rec, index)}
                data-testid={`card-recommendation-${index}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <RestaurantIcon size="lg" className="text-orange-500" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground" data-testid={`text-restaurant-name-${index}`}>
                            {rec.name}
                          </h3>
                          {/* Website Icon */}
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const websiteUrl = await getRestaurantWebsiteUrl(rec.name, rec.location);
                              window.open(websiteUrl, '_blank');
                            }}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                            title="Visit Restaurant Website"
                            data-testid={`button-restaurant-website-icon-${index}`}
                          >
                            <i className="fas fa-globe text-xs"></i>
                          </button>
                        </div>
                        <p className="text-sm text-muted-foreground">{rec.cuisine}</p>
                      </div>
                    </div>
                    <Badge className={getConfidenceColor(rec.confidenceScore)}>
                      {Math.round(rec.confidenceScore * 100)}% match
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2">
                      <LocationIcon size="sm" className="text-gray-500" />
                      <span className="text-sm text-muted-foreground">{rec.location}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {renderStars(rec.estimatedRating)}
                        <span className="text-sm font-medium">{rec.estimatedRating.toFixed(1)}</span>
                      </div>
                      <Badge variant="outline">{rec.priceRange}</Badge>
                    </div>

                    {/* Enhanced Google Maps Data */}
                    <div className="space-y-1">
                      {rec.userRatingsTotal && rec.userRatingsTotal > 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <i className="fas fa-users text-blue-500"></i>
                          <span>{rec.userRatingsTotal} Google reviews</span>
                        </div>
                      )}
                      
                      {rec.phoneNumber && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <i className="fas fa-phone text-green-500"></i>
                          <span>{rec.phoneNumber}</span>
                        </div>
                      )}
                      
                      {rec.openingHours && (
                        <div className="flex items-center gap-2 text-xs">
                          <i className={`fas fa-clock ${rec.openingHours.open_now ? 'text-green-500' : 'text-red-500'}`}></i>
                          <span className={rec.openingHours.open_now ? 'text-green-600' : 'text-red-600'}>
                            {rec.openingHours.open_now ? 'Open Now' : 'Currently Closed'}
                          </span>
                        </div>
                      )}

                      {rec.externalRating && (
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          {rec.externalRating.google && (
                            <span>Google: {rec.externalRating.google.toFixed(1)}</span>
                          )}
                          {rec.externalRating.yelp && (
                            <span>Yelp: {rec.externalRating.yelp.toFixed(1)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3" data-testid={`text-recommendation-reason-${index}`}>
                    {rec.reasonForRecommendation}
                  </p>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        // Could integrate with maps or reservation systems
                        window.open(`https://www.google.com/maps/search/${encodeURIComponent(rec.name + ' ' + rec.location)}`, '_blank');
                      }}
                      data-testid={`button-view-restaurant-${index}`}
                    >
                      <i className="fas fa-map-marker-alt mr-2"></i>
                      View on Map
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={async () => {
                        const websiteUrl = await getRestaurantWebsiteUrl(rec.name, rec.location);
                        window.open(websiteUrl, '_blank');
                      }}
                      data-testid={`button-website-${index}`}
                    >
                      <i className="fas fa-globe mr-2"></i>
                      Visit Website
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <RestaurantIcon size="xl" className="text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Recommendations Yet</h3>
              <p className="text-muted-foreground mb-4">
                Start rating restaurants from your dining events to get personalized AI recommendations!
              </p>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/events'}
                data-testid="button-view-events"
              >
                View Your Events
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}