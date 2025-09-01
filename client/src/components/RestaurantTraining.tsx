import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Star, Heart, X } from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
  type: string;
  priceRange: string;
  description: string;
  rating?: number;
}

interface RestaurantTrainingProps {
  variant: 'user' | 'group';
  groupId?: string;
  onTrainingComplete?: () => void;
}

export function RestaurantTraining({ 
  variant, 
  groupId, 
  onTrainingComplete 
}: RestaurantTrainingProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ratings, setRatings] = useState<Record<string, { rating?: number; interest?: 'interested' | 'nah' }>>({});
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
          setLocationError('Unable to get location. Using default area.');
          // Fallback to Atlanta coordinates
          setLocation({ lat: 33.7490, lng: -84.3880 });
        }
      );
    } else {
      setLocationError('Geolocation not supported. Using default area.');
      setLocation({ lat: 33.7490, lng: -84.3880 });
    }
  }, []);

  // Fetch training restaurants
  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ['/api/training/restaurants', variant, groupId, location?.lat, location?.lng],
    queryFn: async () => {
      if (!location) return [];
      
      const params = new URLSearchParams();
      params.set('lat', location.lat.toString());
      params.set('lng', location.lng.toString());
      
      const url = `/api/training/restaurants/${variant}${groupId ? `/${groupId}` : ''}?${params}`;
      const response = await fetch(url);
      return response.json();
    },
    enabled: !!location
  });

  // Submit rating mutation
  const ratingMutation = useMutation({
    mutationFn: async (data: { restaurantId: string; rating?: number; interest?: 'interested' | 'nah' }) => {
      const endpoint = variant === 'group' && groupId 
        ? `/api/training/group/${groupId}/rate`
        : '/api/training/rate';
      
      const response = await apiRequest('POST', endpoint, data);
      return await response.json();
    }
  });

  const currentRestaurant = restaurants[currentIndex];

  const handleRating = (rating: number) => {
    if (!currentRestaurant) return;
    
    const newRating = { rating };
    setRatings(prev => ({
      ...prev,
      [currentRestaurant.id]: newRating
    }));

    ratingMutation.mutate({
      restaurantId: currentRestaurant.id,
      rating
    });

    // Move to next restaurant
    if (currentIndex < restaurants.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onTrainingComplete?.();
    }
  };

  const handleInterest = (interest: 'interested' | 'nah') => {
    if (!currentRestaurant) return;
    
    const newRating = { interest };
    setRatings(prev => ({
      ...prev,
      [currentRestaurant.id]: newRating
    }));

    ratingMutation.mutate({
      restaurantId: currentRestaurant.id,
      interest
    });

    // Move to next restaurant
    if (currentIndex < restaurants.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onTrainingComplete?.();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading nearby restaurants...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!restaurants.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground">No restaurants available for training.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (currentIndex >= restaurants.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Heart className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Training Complete!</h3>
              <p className="text-muted-foreground">
                Thanks for rating {Object.keys(ratings).length} restaurants. 
                The AI now has a better understanding of your preferences.
              </p>
            </div>
            <Button onClick={onTrainingComplete} className="gradient-bg">
              Get AI Suggestions
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              Help Train the AI
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Rate these restaurants to get better recommendations
            </p>
          </div>
          <Badge variant="secondary">
            {currentIndex + 1} of {restaurants.length}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {currentRestaurant && (
          <div className="space-y-4">
            {/* Restaurant Info */}
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-foreground">
                {currentRestaurant.name}
              </h3>
              <div className="flex items-center justify-center gap-2">
                <Badge variant="outline">{currentRestaurant.type}</Badge>
                <Badge variant="outline">{currentRestaurant.priceRange}</Badge>
              </div>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                {currentRestaurant.description}
              </p>
            </div>

            {/* Star Rating */}
            <div className="text-center space-y-3">
              <p className="font-medium text-foreground">Have you been here?</p>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                    data-testid={`star-${star}`}
                  >
                    <Star 
                      className="w-8 h-8 text-yellow-400 hover:text-yellow-500 cursor-pointer"
                      fill="currentColor"
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Click stars to rate (1-5)</p>
            </div>

            {/* Interest Buttons */}
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">Or if you haven't been:</p>
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleInterest('interested')}
                  className="flex items-center gap-2 hover:bg-green-50 hover:border-green-300"
                  data-testid="button-interested"
                >
                  <Heart className="w-4 h-4" />
                  Interested
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleInterest('nah')}
                  className="flex items-center gap-2 hover:bg-red-50 hover:border-red-300"
                  data-testid="button-nah"
                >
                  <X className="w-4 h-4" />
                  Not for me
                </Button>
              </div>
            </div>

            {/* Skip Button */}
            <div className="text-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (currentIndex < restaurants.length - 1) {
                    setCurrentIndex(prev => prev + 1);
                  } else {
                    onTrainingComplete?.();
                  }
                }}
                className="text-muted-foreground"
                data-testid="button-skip"
              >
                Skip this one
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}