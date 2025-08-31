import { useState, useRef } from "react";
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
  const [inputValue, setInputValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const value = inputValue.trim();
    if (value) {
      const restaurant: Restaurant = {
        placeId: `manual-${Date.now()}`,
        name: value,
        address: '',
      };
      onSelect(restaurant);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Restaurant Name
      </p>
      
      <div className="flex gap-2">
        <input
          ref={inputRef}
          className="flex-1 h-10 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          data-testid="input-restaurant-search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
        
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!inputValue.trim()}
          data-testid="button-add-restaurant"
        >
          Add
        </Button>
      </div>
      
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Enter the restaurant name and click Add
      </p>
    </div>
  );
}