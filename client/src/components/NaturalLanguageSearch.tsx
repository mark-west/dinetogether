import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Search, Sparkles, MapPin, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RestaurantInfo } from '@/components/RestaurantInfo';

interface Recommendation {
  id: string;
  displayName: {
    text: string;
  };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  primaryType?: string;
  regularOpeningHours?: {
    openNow?: boolean;
  };
  websiteUri?: string;
  nationalPhoneNumber?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface CollapsibleProps {
  collapsed?: boolean;
  preselectedGroup?: string;
}

export function NaturalLanguageSearch({ collapsed = false, preselectedGroup }: CollapsibleProps = {}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Recommendation[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Recommendation | null>(null);
  const [showRestaurantDetails, setShowRestaurantDetails] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const { toast } = useToast();

  // Get user's current location
  const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    });
  };

  const searchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      const coordinates = await getCurrentLocation();
      const response = await apiRequest('POST', '/api/recommendations/natural', {
        query: searchQuery,
        coordinates
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      setResults(data.recommendations || []);
      if (data.recommendations?.length === 0) {
        toast({
          title: "No results found",
          description: "Try a different search query or check your location permissions.",
        });
      }
    },
    onError: (error) => {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: "Please try again or check your internet connection.",
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    if (!query.trim()) {
      toast({
        title: "Enter a search query",
        description: "Try something like 'romantic Italian restaurant for date night'",
      });
      return;
    }
    searchMutation.mutate(query);
  };

  const handleRestaurantClick = (restaurant: Recommendation) => {
    setSelectedRestaurant(restaurant);
    setShowRestaurantDetails(true);
  };

  // Convert recommendation to RestaurantInfo format
  const convertToRestaurantFormat = (rec: Recommendation) => {
    return {
      id: rec.id,
      name: rec.displayName?.text || '',
      type: rec.primaryType || 'restaurant',
      priceRange: rec.priceLevel || 'PRICE_LEVEL_MODERATE',
      description: `${rec.displayName?.text || ''} - ${rec.primaryType || 'Restaurant'}`,
      address: rec.formattedAddress || '',
      location: rec.formattedAddress || '',
      rating: rec.rating,
      reviewCount: rec.userRatingCount,
      phoneNumber: rec.nationalPhoneNumber || '',
      website: rec.websiteUri || '',
      isOpen: rec.regularOpeningHours?.openNow,
      latitude: rec.location?.latitude,
      longitude: rec.location?.longitude,
    };
  };

  const formatPriceLevel = (priceLevel?: string) => {
    switch (priceLevel) {
      case 'PRICE_LEVEL_FREE': return '$';
      case 'PRICE_LEVEL_INEXPENSIVE': return '$';
      case 'PRICE_LEVEL_MODERATE': return '$$';
      case 'PRICE_LEVEL_EXPENSIVE': return '$$$';
      case 'PRICE_LEVEL_VERY_EXPENSIVE': return '$$$$';
      default: return '$$';
    }
  };

  return (
    <>
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader 
          className="pb-3 cursor-pointer" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          data-testid="card-ai-dining-concierge-header"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  AI Dining Concierge
                </CardTitle>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Tell me what you're craving and I'll find the perfect restaurant
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
            >
              {isCollapsed ? '+' : '-'}
            </Button>
          </div>
        </CardHeader>
        
        {!isCollapsed && (
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Search Input */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="E.g., 'romantic Italian restaurant for date night' or 'quick lunch under $15'"
                    className="border-blue-200 dark:border-blue-800 focus:border-blue-500 dark:focus:border-blue-400"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    data-testid="input-ai-search-query"
                  />
                </div>
                <Button 
                  onClick={handleSearch}
                  disabled={searchMutation.isPending}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  data-testid="button-ai-search"
                >
                  {searchMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Example Queries */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Try:</span>
                {[
                  "Cozy cafe near me",
                  "Best pizza under $20", 
                  "Romantic dinner spot",
                  "Quick healthy lunch"
                ].map((example) => (
                  <Button
                    key={example}
                    variant="outline"
                    size="sm"
                    className="text-xs h-6 px-2 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30"
                    onClick={() => setQuery(example)}
                    data-testid={`button-example-${example.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {example}
                  </Button>
                ))}
              </div>

              {/* Loading State */}
              {searchMutation.isPending && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium">Finding perfect restaurants for you...</span>
                  </div>
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              )}

              {/* Results */}
              {results.length > 0 && !searchMutation.isPending && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Found {results.length} great options for you:
                    </span>
                  </div>
                  
                  <div className="grid gap-3 max-h-96 overflow-y-auto">
                    {results.map((restaurant) => (
                      <Card 
                        key={restaurant.id} 
                        className="hover:shadow-md transition-shadow cursor-pointer border-blue-100 dark:border-blue-900 hover:border-blue-300 dark:hover:border-blue-700"
                        onClick={() => handleRestaurantClick(restaurant)}
                        data-testid={`card-restaurant-${restaurant.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                              {restaurant.displayName?.text?.charAt(0) || 'R'}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className="font-semibold text-foreground truncate" data-testid={`text-restaurant-name-${restaurant.id}`}>
                                  {restaurant.displayName?.text}
                                </h4>
                                <div className="flex items-center gap-1 shrink-0">
                                  {restaurant.rating && (
                                    <>
                                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                      <span className="text-xs font-medium" data-testid={`text-rating-${restaurant.id}`}>
                                        {restaurant.rating.toFixed(1)}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                                {restaurant.primaryType && (
                                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                    {restaurant.primaryType.replace(/_/g, ' ')}
                                  </Badge>
                                )}
                                {restaurant.priceLevel && (
                                  <span className="font-semibold text-green-600 dark:text-green-400">
                                    {formatPriceLevel(restaurant.priceLevel)}
                                  </span>
                                )}
                                {restaurant.regularOpeningHours?.openNow !== undefined && (
                                  <Badge 
                                    variant={restaurant.regularOpeningHours.openNow ? "default" : "destructive"}
                                    className="text-xs px-2 py-0.5"
                                  >
                                    {restaurant.regularOpeningHours.openNow ? 'Open' : 'Closed'}
                                  </Badge>
                                )}
                              </div>
                              
                              {restaurant.formattedAddress && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="w-3 h-3" />
                                  <span className="truncate" data-testid={`text-address-${restaurant.id}`}>
                                    {restaurant.formattedAddress}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Restaurant Details Modal */}
      {selectedRestaurant && showRestaurantDetails && (
        <Dialog open={showRestaurantDetails} onOpenChange={setShowRestaurantDetails}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedRestaurant.displayName?.text}</DialogTitle>
            </DialogHeader>
            <RestaurantInfo 
              restaurant={convertToRestaurantFormat(selectedRestaurant)}
              preselectedGroup={preselectedGroup}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}