import { useState, useEffect, useRef } from "react";
import { useGooglePlaces } from "@/hooks/useGoogleMaps";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Restaurant {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  priceLevel?: number;
  photoUrl?: string;
  location?: { lat: number; lng: number };
}

interface RestaurantSearchProps {
  onSelect: (restaurant: Restaurant) => void;
  placeholder?: string;
  initialValue?: string;
}

export default function RestaurantSearch({ onSelect, placeholder = "Search for restaurants...", initialValue = "" }: RestaurantSearchProps) {
  const [query, setQuery] = useState(initialValue);
  
  // Sync internal state with external initialValue changes
  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { isLoaded, error, autocompleteRestaurants, getPlaceDetails, getUserLocation } = useGooglePlaces();
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Get user's location on component mount - only once
  useEffect(() => {
    if (isLoaded && !userLocation) {
      getUserLocation()
        .then(location => {
          setUserLocation(location);
        })
        .catch(error => {
          console.log('Could not get user location for restaurant search:', error.message);
          // Continue without location - search will still work but without proximity sorting
        });
    }
  }, [isLoaded]); // Removed getUserLocation dependency to prevent re-runs

  useEffect(() => {
    if (!isLoaded || !query.trim() || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Increase debounce time to reduce API calls
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const predictions = await autocompleteRestaurants(query, userLocation || undefined) as any[];
        setSuggestions(predictions.slice(0, 5));
        setShowSuggestions(true);
      } catch (err) {
        console.error('Error fetching restaurant suggestions:', err);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsSearching(false);
      }
    }, 800); // Increased from 300ms to 800ms

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, isLoaded, autocompleteRestaurants, userLocation]);

  const handleSelectRestaurant = async (prediction: any) => {
    // Use the restaurant name instead of the full description for cleaner display
    setQuery(prediction.structured_formatting?.main_text || prediction.description);
    setShowSuggestions(false);
    
    try {
      const placeDetails = await getPlaceDetails(prediction.place_id) as any;
      const photoUrl = placeDetails.photos?.[0]?.getUrl({ maxWidth: 400, maxHeight: 300 });
      
      const restaurant: Restaurant = {
        placeId: prediction.place_id,
        name: placeDetails.name,
        address: placeDetails.formatted_address,
        rating: placeDetails.rating,
        priceLevel: placeDetails.price_level,
        photoUrl,
        location: {
          lat: placeDetails.geometry.location.lat(),
          lng: placeDetails.geometry.location.lng(),
        },
      };
      
      onSelect(restaurant);
    } catch (err) {
      console.error('Error fetching place details:', err);
    }
  };

  if (error) {
    return (
      <div className="text-sm text-destructive">
        Unable to load restaurant search: {error}
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        data-testid="input-restaurant-search"
        disabled={!isLoaded}
      />
      
      {!isLoaded && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {showSuggestions && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto">
          <CardContent className="p-2">
            {isSearching ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : suggestions.length > 0 ? (
              <div className="space-y-1">
                {suggestions.map((prediction) => (
                  <Button
                    key={prediction.place_id}
                    variant="ghost"
                    className="w-full justify-start h-auto p-3 text-left"
                    onClick={() => handleSelectRestaurant(prediction)}
                    data-testid={`suggestion-${prediction.place_id}`}
                  >
                    <div className="flex items-center gap-3">
                      <i className="fas fa-utensils text-muted-foreground"></i>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{prediction.structured_formatting.main_text}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {prediction.structured_formatting.secondary_text}
                        </p>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                <i className="fas fa-search mb-2"></i>
                <p className="text-sm">No restaurants found</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}