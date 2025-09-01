import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { RestaurantIcon, LocationIcon } from "./ui/app-icons";
import { RestaurantCard } from "./RestaurantCard";
import { getRestaurantWebsiteUrl, getWebsiteLinkText } from '@/lib/restaurantUtils';

interface Recommendation {
  name: string;
  type: string;
  cuisine?: string;
  priceRange: string;
  rating: number;
  estimatedRating?: number;
  location: string;
  address?: string;
  description: string;
  reasonForRecommendation?: string;
  confidence: number;
  confidenceScore?: number;
  reasons: string[];
  formatted_phone_number?: string;
  phoneNumber?: string;
  website?: string;
  opening_hours?: any;
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

function extractMenuHighlights(reviews: any[]): string[] {
  if (!reviews || !Array.isArray(reviews)) return [];
  
  const highlights: string[] = [];
  const keywords = ['burger', 'pizza', 'pasta', 'salad', 'sandwich', 'chicken', 'beef', 'seafood', 'dessert'];
  
  reviews.forEach(review => {
    if (review.text) {
      keywords.forEach(keyword => {
        if (review.text.toLowerCase().includes(keyword) && !highlights.includes(keyword)) {
          highlights.push(keyword);
        }
      });
    }
  });
  
  return highlights.slice(0, 3);
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
  
  const recommendations = apiResponse?.recommendations || apiResponse;

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
    const restaurantId = `${restaurant.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${index}`;
    
    const restaurantData = {
      id: restaurantId,
      name: restaurant.name,
      type: restaurant.type || restaurant.cuisine || 'Restaurant',
      priceRange: restaurant.priceRange,
      description: restaurant.description || restaurant.reasonForRecommendation || '',
      ...restaurant,
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
    
    sessionStorage.removeItem(`restaurant_${restaurantId}`);
    sessionStorage.setItem(`restaurant_${restaurantId}`, JSON.stringify(restaurantData));
    navigate(`/restaurant/${restaurantId}?back=/recommendations`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">AI Restaurant Recommendations</h2>
          <p className="text-muted-foreground">
            Personalized dining suggestions based on your preferences and history
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAnalysis(!showAnalysis)}
            data-testid="button-toggle-analysis"
          >
            <i className="fas fa-chart-pie mr-2"></i>
            {showAnalysis ? 'Hide Analysis' : 'Show Analysis'}
          </Button>
          <Button
            onClick={() => refetchRecommendations()}
            disabled={loadingRecommendations}
            data-testid="button-refresh-recommendations"
          >
            <i className="fas fa-sync-alt mr-2"></i>
            {loadingRecommendations ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Location Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LocationIcon size="md" />
            Search Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter location (e.g., New York, NY)"
              className="flex-1 px-3 py-2 border rounded-md"
              data-testid="input-location"
            />
            <Button onClick={() => handleLocationChange(location)} data-testid="button-search-location">
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dining Analysis */}
      {showAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <i className="fas fa-chart-pie"></i>
              Your Dining Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAnalysis ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : analysis ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="font-medium text-foreground">Favorite Cuisines</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {analysis.primaryCuisines.map((cuisine, i) => (
                      <Badge key={i} variant="secondary">{cuisine}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-foreground">Average Rating</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-2xl font-bold text-yellow-500">{analysis.averageRating.toFixed(1)}</span>
                    <i className="fas fa-star text-yellow-500"></i>
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
              <RestaurantCard
                key={index}
                restaurant={rec}
                index={index}
                onClick={handleRestaurantClick}
                showConfidence={true}
                showActionButtons={true}
                dataTestId={`card-recommendation-${index}`}
              />
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