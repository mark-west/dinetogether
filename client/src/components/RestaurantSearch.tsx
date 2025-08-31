import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleManualSelect = () => {
    if (query.trim()) {
      const restaurant: Restaurant = {
        placeId: `manual-${Date.now()}`,
        name: query.trim(),
        address: '',
      };
      onSelect(restaurant);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleManualSelect();
    }
  };

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        data-testid="input-restaurant-search"
      />
      
      {query.trim() && (
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
    </div>
  );
}