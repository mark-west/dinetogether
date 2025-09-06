import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { RestaurantInfo } from '@/components/RestaurantInfo';

interface Restaurant {
  id: string;
  name: string;
  type: string;
  priceRange: string;
  description: string;
  address?: string;
  location?: string;
  rating?: number;
  estimatedRating?: number;
  reviewCount?: number;
  userRatingsTotal?: number;
  confidence?: number;
  phoneNumber?: string;
  website?: string;
  openingHours?: {
    open_now?: boolean;
    weekdayDescriptions?: string[];
    periods?: Array<{
      open: { day: number; hour: number; minute: number };
      close: { day: number; hour: number; minute: number };
    }>;
  };
  latitude?: number;
  longitude?: number;
  menuHighlights?: string[];
  features?: string[];
  reviews?: any[];
}

export default function RestaurantDetails() {
  const [, params] = useRoute('/restaurant/:id');
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const restaurantId = params?.id;
  const backPath = new URLSearchParams(window.location.search).get('back') || '/dashboard';
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRestaurant = () => {
      if (!restaurantId) return;
      
      setIsLoading(true);
      try {
        // Get restaurant data from sessionStorage (set by AI recommendations)
        const cachedData = sessionStorage.getItem(`restaurant_${restaurantId}`);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          // Restaurant data loaded successfully
          setRestaurant(parsed);
          setIsLoading(false);
          return;
        }

        // If no cached data, redirect back 
        // No restaurant data found for the given ID
        toast({
          title: "Restaurant Not Found",
          description: "Please select a restaurant from AI recommendations",
          variant: "destructive"
        });
        setLocation(backPath);
      } catch (error) {
        console.error('Error loading restaurant:', error);
        toast({
          title: "Error",
          description: "Failed to load restaurant details",
          variant: "destructive"
        });
        setLocation(backPath);
      }
    };

    loadRestaurant();
  }, [restaurantId, toast, setLocation, backPath]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading restaurant details...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Restaurant Not Found</h1>
          <p className="text-muted-foreground mb-4">The restaurant you're looking for could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <RestaurantInfo
      restaurant={restaurant}
      onBack={() => setLocation(backPath)}
      backText="Back"
      showEventCreation={true}
    />
  );
}