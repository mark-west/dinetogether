import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface DirectionsButtonProps {
  address: string;
  restaurantName?: string;
  lat?: string;
  lng?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost";
}

export default function DirectionsButton({ 
  address, 
  restaurantName, 
  lat, 
  lng, 
  size = "sm", 
  variant = "outline" 
}: DirectionsButtonProps) {
  
  const formatLocationForMaps = () => {
    // Use coordinates if available for more accurate directions
    if (lat && lng) {
      return `${lat},${lng}`;
    }
    // Fall back to address with restaurant name
    return encodeURIComponent(restaurantName ? `${restaurantName}, ${address}` : address);
  };

  const getDirectionsUrl = (platform: 'google' | 'apple' | 'waze') => {
    const location = formatLocationForMaps();
    
    switch (platform) {
      case 'google':
        return `https://www.google.com/maps/dir/?api=1&destination=${location}`;
      
      case 'apple':
        // Apple Maps (works on iOS Safari and macOS)
        if (lat && lng) {
          return `http://maps.apple.com/?daddr=${lat},${lng}`;
        }
        return `http://maps.apple.com/?daddr=${encodeURIComponent(address)}`;
      
      case 'waze':
        if (lat && lng) {
          return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
        }
        return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
      
      default:
        return '';
    }
  };

  const handleDirections = (platform: 'google' | 'apple' | 'waze') => {
    const url = getDirectionsUrl(platform);
    window.open(url, '_blank');
  };

  const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  };

  const isMac = () => {
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  };

  // Auto-detect best platform based on OS
  const getDefaultPlatform = (): 'google' | 'apple' | 'waze' => {
    if (isIOS() || isMac()) {
      return 'apple';
    }
    return 'google';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="w-full sm:w-auto" data-testid="button-directions">
          <i className="fas fa-directions mr-2"></i>
          Get Directions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => handleDirections('google')}
          data-testid="directions-google"
          className="flex items-center"
        >
          <span className="mr-2 text-sm font-bold text-blue-600 bg-white rounded px-1">G</span>
          Google Maps
        </DropdownMenuItem>
        {(isIOS() || isMac()) && (
          <DropdownMenuItem 
            onClick={() => handleDirections('apple')}
            data-testid="directions-apple"
          >
            <i className="fas fa-map mr-2"></i>
            Apple Maps
          </DropdownMenuItem>
        )}
        <DropdownMenuItem 
          onClick={() => handleDirections('waze')}
          data-testid="directions-waze"
        >
          <i className="fas fa-route mr-2"></i>
          Waze
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}