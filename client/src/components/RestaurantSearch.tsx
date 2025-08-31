import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useGooglePlaces } from "@/hooks/useGoogleMaps";

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

export default function RestaurantSearch({ onSelect, placeholder = "Enter restaurant name...", initialValue = "" }: RestaurantSearchProps) {
  const [useGoogleSearch, setUseGoogleSearch] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const { isLoaded, error, autocompleteRestaurants, getPlaceDetails, getUserLocation } = useGooglePlaces();
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Get user location for better search results
  useEffect(() => {
    const getLocation = async () => {
      try {
        const location = await getUserLocation();
        setUserLocation(location);
      } catch (error) {
        // Location access denied or failed, will search without location bias
        console.log('Location access denied or failed');
      }
    };
    
    if (useGoogleSearch && isLoaded && !userLocation) {
      getLocation();
    }
  }, [useGoogleSearch, isLoaded, getUserLocation, userLocation]);

  // Set initial value
  useEffect(() => {
    if (inputRef.current && initialValue) {
      inputRef.current.value = initialValue;
    }
  }, [initialValue]);

  const handleInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const newValue = target.value;
    
    if (useGoogleSearch && isLoaded && !error) {
      // Clear existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      // Only search if there's actual content
      if (newValue.trim().length > 2) { // Increased minimum length
        setIsSearching(true);
        setShowSuggestions(true);
        
        // Longer debounce to reduce re-renders
        searchTimeoutRef.current = setTimeout(async () => {
          try {
            const results = await autocompleteRestaurants(newValue, userLocation || undefined);
            setSuggestions(results as any[]);
            setShowSuggestions(true);
          } catch (error) {
            setSuggestions([]);
            setShowSuggestions(false);
          }
          setIsSearching(false);
        }, 1000); // Very long debounce
      } else {
        setIsSearching(false);
        setShowSuggestions(false);
        setSuggestions([]);
      }
    }
  };

  // Use native event listener to bypass React
  useEffect(() => {
    const input = inputRef.current;
    if (input) {
      input.addEventListener('input', handleInputChange);
      return () => {
        input.removeEventListener('input', handleInputChange);
      };
    }
  }, [useGoogleSearch, isLoaded, error, userLocation]);

  const handleManualSelect = () => {
    const currentValue = inputRef.current?.value?.trim();
    if (currentValue) {
      const restaurant: Restaurant = {
        placeId: `manual-${Date.now()}`,
        name: currentValue,
        address: '',
      };
      onSelect(restaurant);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionSelect = async (prediction: any) => {
    setShowSuggestions(false);
    
    try {
      const details = await getPlaceDetails(prediction.place_id);
      onSelect(details as Restaurant);
      if (inputRef.current) {
        inputRef.current.value = (details as Restaurant).name;
      }
    } catch (error) {
      console.error('Error getting place details:', error);
      const restaurant: Restaurant = {
        placeId: prediction.place_id,
        name: prediction.structured_formatting?.main_text || prediction.description,
        address: prediction.structured_formatting?.secondary_text || '',
      };
      onSelect(restaurant);
      if (inputRef.current) {
        inputRef.current.value = restaurant.name;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!useGoogleSearch || !showSuggestions || suggestions.length === 0) {
        handleManualSelect();
      } else if (suggestions.length > 0) {
        handleSuggestionSelect(suggestions[0]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Toggle between manual and Google search */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={!useGoogleSearch ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setUseGoogleSearch(false);
            setShowSuggestions(false);
          }}
          data-testid="button-manual-mode"
        >
          Manual Entry
        </Button>
        <Button
          type="button"
          variant={useGoogleSearch ? "default" : "outline"}
          size="sm"
          onClick={() => setUseGoogleSearch(true)}
          data-testid="button-google-search"
        >
          Search Google {userLocation ? '(Near You)' : ''}
        </Button>
      </div>

      {/* Native HTML input to bypass React's controlled input system */}
      <div className="relative">
        <input
          ref={inputRef}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={useGoogleSearch ? "Search Google for restaurants..." : "Enter restaurant name..."}
          data-testid="input-restaurant-search"
          disabled={useGoogleSearch && (isSearching || (!isLoaded && !error))}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          onKeyDown={handleKeyDown}
        />
        
        {/* Manual mode: show checkmark when there's text */}
        {!useGoogleSearch && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleManualSelect}
              className="h-6 w-6 p-0"
              data-testid="button-manual-select"
            >
              ✓
            </Button>
          </div>
        )}

        {/* Google mode: show loading or error state */}
        {useGoogleSearch && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {isSearching && (
              <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full" />
            )}
            {error && (
              <span className="text-xs text-red-500">Error</span>
            )}
          </div>
        )}

        {/* Google search suggestions */}
        {useGoogleSearch && showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-10 bg-white dark:bg-gray-800 border rounded-md shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((prediction) => (
              <div
                key={prediction.place_id}
                className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b last:border-b-0"
                onMouseDown={(e) => {
                  e.preventDefault();
                }}
                onClick={() => handleSuggestionSelect(prediction)}
                data-testid={`suggestion-${prediction.place_id}`}
              >
                <div className="font-medium">
                  {prediction.structured_formatting?.main_text || prediction.description}
                </div>
                {prediction.structured_formatting?.secondary_text && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {prediction.structured_formatting.secondary_text}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status messages */}
      {useGoogleSearch && error && (
        <p className="text-sm text-yellow-600 dark:text-yellow-400">
          Google search unavailable. Switch to manual entry to continue.
        </p>
      )}
      
      {!useGoogleSearch && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Type the restaurant name and press Enter or click ✓
        </p>
      )}

      {useGoogleSearch && userLocation && (
        <p className="text-sm text-green-600 dark:text-green-400">
          🎯 Searching near your location for better results
        </p>
      )}
    </div>
  );
}