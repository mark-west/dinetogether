import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
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
  const [query, setQuery] = useState(initialValue);
  const [useGoogleSearch, setUseGoogleSearch] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { isLoaded, error, autocompleteRestaurants, getPlaceDetails } = useGooglePlaces();
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    
    if (useGoogleSearch && isLoaded && !error) {
      setShowSuggestions(true);
      setIsSearching(true);
      
      // Clear existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      // Debounce search
      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          const results = await autocompleteRestaurants(e.target.value);
          setSuggestions(results);
          setShowSuggestions(true);
        } catch (error) {
          setSuggestions([]);
          setShowSuggestions(false);
        }
        setIsSearching(false);
      }, 300);
    }
  };

  const handleManualSelect = () => {
    if (query.trim()) {
      const restaurant: Restaurant = {
        placeId: `manual-${Date.now()}`,
        name: query.trim(),
        address: '',
      };
      onSelect(restaurant);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionSelect = async (prediction: any) => {
    try {
      const details = await getPlaceDetails(prediction.place_id);
      onSelect(details);
      setQuery(details.name);
      setShowSuggestions(false);
    } catch (error) {
      console.error('Error getting place details:', error);
      // Fallback to basic info
      const restaurant: Restaurant = {
        placeId: prediction.place_id,
        name: prediction.structured_formatting?.main_text || prediction.description,
        address: prediction.structured_formatting?.secondary_text || '',
      };
      onSelect(restaurant);
      setQuery(restaurant.name);
      setShowSuggestions(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
          Search Google
        </Button>
      </div>

      {/* Input field with search/suggestions */}
      <div className="relative">
        <Input
          value={query}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={useGoogleSearch ? "Search Google for restaurants..." : "Enter restaurant name..."}
          data-testid="input-restaurant-search"
          disabled={useGoogleSearch && (isSearching || (!isLoaded && !error))}
        />
        
        {/* Manual mode: show checkmark when there's text */}
        {!useGoogleSearch && query.trim() && (
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
    </div>
  );
}