import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { RestaurantIcon, LocationIcon } from "./ui/app-icons";
import { getRestaurantWebsiteUrl, getWebsiteLinkText } from '@/lib/restaurantUtils';

interface Restaurant {
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
  // Google Places API fields
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

interface RestaurantCardProps {
  restaurant: Restaurant;
  index: number;
  onClick?: (restaurant: Restaurant, index: number) => void;
  showConfidence?: boolean;
  showActionButtons?: boolean;
  className?: string;
  dataTestId?: string;
}

function getConfidenceColor(confidence: number) {
  const score = confidence || 0;
  if (score >= 0.8) return "bg-green-500";
  if (score >= 0.6) return "bg-yellow-500";
  return "bg-red-500";
}

// Format business hours for display
function formatBusinessHours(openingHours: any): string {
  if (!openingHours) return 'Hours not available';
  
  try {
    // Handle both Google Places API v1 and New API formats
    const hoursData = openingHours.weekday_text || 
                     openingHours.periods || 
                     openingHours.regularOpeningHours?.weekdayDescriptions ||
                     openingHours.weekdayDescriptions;
    
    if (Array.isArray(hoursData)) {
      const today = new Date().getDay();
      // Convert Sunday=0 to Monday=0 format for Google Places
      const googleDay = today === 0 ? 6 : today - 1;
      
      if (hoursData[googleDay]) {
        return hoursData[googleDay];
      }
      return hoursData[0] || 'Hours not available';
    }
    
    return 'Hours not available';
  } catch (error) {
    console.error('Error formatting business hours:', error);
    return 'Hours not available';
  }
}

export function RestaurantCard({ 
  restaurant, 
  index, 
  onClick, 
  showConfidence = true,
  showActionButtons = true,
  className = "",
  dataTestId
}: RestaurantCardProps) {
  const displayRating = restaurant.rating || restaurant.estimatedRating || 0;
  const displayConfidence = restaurant.confidence || restaurant.confidenceScore || 0;
  const displayCuisine = restaurant.type || restaurant.cuisine || 'Restaurant';
  const displayDescription = restaurant.description || restaurant.reasonForRecommendation || '';
  const displayAddress = restaurant.address || restaurant.location || '';

  const businessHours = formatBusinessHours(restaurant.opening_hours || restaurant.openingHours);
  const websiteText = getWebsiteLinkText(restaurant.website);

  return (
    <Card 
      className={`hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick ? () => onClick(restaurant, index) : undefined}
      data-testid={dataTestId || `card-restaurant-${index}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <RestaurantIcon size="lg" className="text-orange-500" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground" data-testid={`text-restaurant-name-${index}`}>
                  {restaurant.name}
                </h3>
                {/* Website Icon */}
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const websiteUrl = await getRestaurantWebsiteUrl(restaurant.name, displayAddress);
                    window.location.href = websiteUrl;
                  }}
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                  title="Visit Restaurant Website"
                  data-testid={`button-restaurant-website-icon-${index}`}
                >
                  <i className="fas fa-globe text-xs"></i>
                </button>
              </div>
              <p className="text-sm text-muted-foreground">{displayCuisine}</p>
            </div>
          </div>
          {showConfidence && (
            <Badge className={getConfidenceColor(displayConfidence)}>
              {Math.round(displayConfidence * 100)}% match
            </Badge>
          )}
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <LocationIcon size="sm" className="text-gray-500" />
            <span className="text-sm text-muted-foreground">{displayAddress}</span>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <i className="fas fa-star text-yellow-500"></i>
              <span>{displayRating.toFixed(1)}/5</span>
              {restaurant.userRatingsTotal && (
                <span className="text-xs">({restaurant.userRatingsTotal} reviews)</span>
              )}
            </div>
            <span className="font-medium text-green-600">{restaurant.priceRange}</span>
          </div>

          {/* Business Hours */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <i className="fas fa-clock text-gray-500"></i>
            <span>{businessHours}</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {displayDescription}
        </p>

        {restaurant.reasons && restaurant.reasons.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Why this matches:</p>
            <div className="flex flex-wrap gap-1">
              {restaurant.reasons.slice(0, 2).map((reason, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {reason}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {showActionButtons && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const websiteUrl = await getRestaurantWebsiteUrl(restaurant.name, displayAddress);
                window.location.href = websiteUrl;
              }}
              data-testid={`button-website-${index}`}
            >
              <i className="fas fa-globe mr-2"></i>
              {websiteText}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}