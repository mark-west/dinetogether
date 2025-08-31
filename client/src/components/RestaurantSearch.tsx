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
  const [inputValue, setInputValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const { isLoaded, error, autocompleteRestaurants, getPlaceDetails, getUserLocation } = useGooglePlaces();
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Request location when Google search is enabled
  useEffect(() => {
    if (useGoogleSearch && isLoaded && !userLocation && locationStatus === 'idle') {
      setLocationStatus('requesting');
      getUserLocation()
        .then((location) => {
          console.log('Location detected:', location);
          setUserLocation(location);
          setLocationStatus('granted');
        })
        .catch((error) => {
          console.error('Location error:', error);
          setLocationStatus('denied');
        });
    }
  }, [useGoogleSearch, isLoaded, userLocation, locationStatus, getUserLocation]);

  // Simple debounced search
  useEffect(() => {
    if (!useGoogleSearch || !isLoaded || error || inputValue.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // Pass location if available for better results
        const results = await autocompleteRestaurants(inputValue, userLocation || undefined);
        setSuggestions(results as any[]);
        setShowSuggestions(true);
      } catch (error) {
        setSuggestions([]);
        setShowSuggestions(false);
      }
      setIsSearching(false);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [inputValue, useGoogleSearch, isLoaded, error, autocompleteRestaurants, userLocation]);

  const handleManualSubmit = () => {
    const value = inputValue.trim();
    if (value) {
      const restaurant: Restaurant = {
        placeId: `manual-${Date.now()}`,
        name: value,
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
      setInputValue((details as Restaurant).name);
    } catch (error) {
      const restaurant: Restaurant = {
        placeId: prediction.place_id,
        name: prediction.structured_formatting?.main_text || prediction.description,
        address: prediction.structured_formatting?.secondary_text || '',
      };
      onSelect(restaurant);
      setInputValue(restaurant.name);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!useGoogleSearch || !showSuggestions || suggestions.length === 0) {
        handleManualSubmit();
      } else if (suggestions.length > 0) {
        handleSuggestionSelect(suggestions[0]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Toggle between manual and Google search */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={!useGoogleSearch ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setUseGoogleSearch(false);
            setShowSuggestions(false);
            setSuggestions([]);
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
          Search Google
          {userLocation && <span className="ml-1">📍</span>}
        </Button>
      </div>

      {/* Single input field */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            className="flex-1 h-10 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder={useGoogleSearch ? "Search Google for restaurants..." : "Enter restaurant name..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            data-testid="input-restaurant-search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
          
          {!useGoogleSearch && (
            <Button
              type="button"
              onClick={handleManualSubmit}
              disabled={!inputValue.trim()}
              data-testid="button-add-restaurant"
            >
              Add
            </Button>
          )}
        </div>

        {/* Loading indicator for Google search */}
        {useGoogleSearch && isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full" />
          </div>
        )}

        {/* Google search suggestions */}
        {useGoogleSearch && showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((prediction) => (
              <div
                key={prediction.place_id}
                className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b last:border-b-0"
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

      {/* Help text */}
      {useGoogleSearch && error && (
        <p className="text-sm text-yellow-600 dark:text-yellow-400">
          Google search unavailable. Switch to manual entry to continue.
        </p>
      )}
      
      {!useGoogleSearch && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Type the restaurant name and press Enter or click Add
        </p>
      )}
      
      {useGoogleSearch && !error && (
        <div className="space-y-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Type at least 3 characters to search for restaurants
          </p>
          {locationStatus === 'requesting' && (
            <p className="text-sm text-blue-600 dark:text-blue-400">
              🔄 Requesting your location for better results...
            </p>
          )}
          {locationStatus === 'granted' && userLocation && (
            <p className="text-sm text-green-600 dark:text-green-400">
              📍 Using your location for nearby results ({userLocation.lat.toFixed(3)}, {userLocation.lng.toFixed(3)})
            </p>
          )}
          {locationStatus === 'denied' && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              ⚠️ Location access denied. Results may be less accurate.
            </p>
          )}
        </div>
      )}
    </div>
  );
}