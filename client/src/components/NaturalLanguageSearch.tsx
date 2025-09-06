import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { AISparklesIcon } from '@/components/icons/AISparklesIcon';
import { ChevronDown, ChevronUp, MapPin, Clock, Globe } from 'lucide-react';
import { useLocation } from 'wouter';

interface NaturalLanguageSearchProps {
  variant: 'user' | 'group';
  groupId?: string;
  className?: string;
}

interface RestaurantResult {
  id: string;
  name: string;
  type: string;
  rating: number;
  priceRange: string;
  description: string;
  confidence: number;
  reasons: string[];
  address?: string;
  location?: string;
  openingHours?: any;
  phone?: string;
  website?: string;
  placeId?: string;
}

export function NaturalLanguageSearch({ variant, groupId, className = "" }: NaturalLanguageSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [results, setResults] = useState<RestaurantResult[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [, navigate] = useLocation();

  // Get user's location and restore search state on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
          setUserLocation(null);
        }
      );
    }

    // Restore search state if navigating back
    const savedResults = sessionStorage.getItem('aiConciergeResults');
    const savedPrompt = sessionStorage.getItem('aiConciergePrompt');
    const savedExpanded = sessionStorage.getItem('aiConciergeExpanded');
    
    if (savedResults && savedPrompt) {
      setResults(JSON.parse(savedResults));
      setPrompt(savedPrompt);
      setIsExpanded(savedExpanded === 'true');
    }
  }, []);

  // Save search state when results change or before navigating away
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (results.length > 0) {
        sessionStorage.setItem('aiConciergeResults', JSON.stringify(results));
        sessionStorage.setItem('aiConciergePrompt', prompt);
        sessionStorage.setItem('aiConciergeExpanded', isExpanded.toString());
      } else {
        // Clear storage if no results
        sessionStorage.removeItem('aiConciergeResults');
        sessionStorage.removeItem('aiConciergePrompt');
        sessionStorage.removeItem('aiConciergeExpanded');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Also save when results change
    if (results.length > 0) {
      sessionStorage.setItem('aiConciergeResults', JSON.stringify(results));
      sessionStorage.setItem('aiConciergePrompt', prompt);
      sessionStorage.setItem('aiConciergeExpanded', isExpanded.toString());
    }
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [results, prompt, isExpanded]);

  const searchMutation = useMutation({
    mutationFn: async (searchPrompt: string) => {
      if (!userLocation) {
        throw new Error('Location not available');
      }
      
      const endpoint = variant === 'group' && groupId 
        ? `/api/ai-concierge/group/${groupId}`
        : '/api/ai-concierge';
      
      const params = new URLSearchParams();
      params.set('lat', userLocation.lat.toString());
      params.set('lng', userLocation.lng.toString());
      
      const response = await apiRequest('POST', `${endpoint}?${params}`, { prompt: searchPrompt });
      
      if (!response.ok) {
        const error = await response.text();
        console.error('Search error:', error);
        throw new Error(`Search failed: ${response.status}`);
      }
      
      return await response.json();
    },
    onSuccess: (data: any) => {
      console.log('AI Dining Concierge results:', data);
      setResults(data.restaurants || []);
    },
    onError: (error: any) => {
      console.error('Search error:', error);
      setResults([]);
    }
  });

  const handleSearch = () => {
    if (!prompt.trim()) return;
    if (!userLocation) {
      console.error('Location not available for search');
      return;
    }
    searchMutation.mutate(prompt.trim());
  };

  const handleRestaurantClick = (restaurant: RestaurantResult, index: number) => {
    const restaurantId = `${restaurant.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${index}`;
    
    const restaurantData = {
      id: restaurantId,
      name: restaurant.name,
      type: restaurant.type,
      priceRange: restaurant.priceRange,
      description: restaurant.description,
      address: restaurant.address || restaurant.location || '',
      location: restaurant.address || restaurant.location || '',
      phone: restaurant.phone || '',
      website: restaurant.website || '',
      hours: '',
      openingHours: restaurant.openingHours || null,
      rating: restaurant.rating,
      reviewCount: 0,
      menuHighlights: [],
      features: ['AI-generated recommendation', 'Natural language search result'],
      confidence: restaurant.confidence || 0.85,
      placeId: restaurant.placeId || restaurant.id
    };
    
    sessionStorage.setItem(`restaurant_${restaurantId}`, JSON.stringify(restaurantData));
    const currentPath = window.location.pathname;
    navigate(`/restaurant/${restaurantId}?back=${currentPath}`);
  };

  const resetSearch = () => {
    setPrompt('');
    setResults([]);
    // Clear stored search state
    sessionStorage.removeItem('aiConciergeResults');
    sessionStorage.removeItem('aiConciergePrompt');
    sessionStorage.removeItem('aiConciergeExpanded');
  };

  return (
    <Card className={`ai-concierge-card ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 gradient-bg rounded-lg flex items-center justify-center">
              <AISparklesIcon size={24} className="text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-foreground">AI Dining Concierge</CardTitle>
              <p className="text-sm text-muted-foreground">
                Tell us what you're craving in plain English
              </p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="shrink-0"
            data-testid="button-toggle-concierge"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                AI Dining Concierge
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {!results.length && !searchMutation.isPending && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="search-prompt" className="text-sm font-medium text-foreground">
                  What are you looking for?
                </label>
                <Textarea
                  id="search-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  placeholder="Describe what kind of dining experience you're looking for..."
                  className="min-h-[80px] resize-none"
                  data-testid="textarea-search-prompt"
                />
                
                {/* Example Prompts */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">Or try these examples:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Romantic Italian dinner for two",
                      "Casual lunch spot for work meeting", 
                      "Best tacos in town",
                      "Family-friendly breakfast place",
                      "Trendy sushi for date night",
                      "Quick healthy lunch",
                      "Cozy coffee shop to work from"
                    ].map((example, index) => (
                      <button
                        key={index}
                        onClick={() => setPrompt(example)}
                        className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        data-testid={`button-example-${index}`}
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  {userLocation ? 
                    "Press Enter to search, or Shift+Enter for new line. We'll search near your current location." :
                    "Please allow location access to get personalized restaurant recommendations."
                  }
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleSearch}
                  disabled={!prompt.trim() || !userLocation || searchMutation.isPending}
                  className="gradient-bg"
                  data-testid="button-search-restaurants"
                >
                  <AISparklesIcon size={16} className="mr-2" />
                  Find Restaurants
                </Button>
              </div>
            </div>
          )}

          {searchMutation.isPending && (
            <div className="space-y-4">
              <div className="text-center py-6">
                <div className="inline-flex items-center gap-3 text-muted-foreground">
                  <div className="animate-spin h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full"></div>
                  <span className="font-medium">AI is finding perfect restaurants for you...</span>
                </div>
              </div>
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          )}

          {searchMutation.isError && (
            <div className="text-center py-8">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-exclamation-triangle text-2xl text-red-500"></i>
                </div>
                <h3 className="font-medium text-foreground mb-2">Search Failed</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  We couldn't process your request right now. This might be due to:
                </p>
                <ul className="text-xs text-muted-foreground text-left mb-4 space-y-1">
                  <li>• Location access required</li>
                  <li>• AI service temporarily unavailable</li>
                  <li>• Network connectivity issues</li>
                </ul>
                <Button 
                  onClick={() => {
                    searchMutation.reset();
                    resetSearch();
                  }}
                  variant="outline"
                  size="sm"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground">Your AI-Powered Recommendations</h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={resetSearch}
                  data-testid="button-new-search"
                >
                  New Search
                </Button>
              </div>
              
              {results.map((restaurant, index) => (
                <Card 
                  key={index} 
                  className="border-l-4 border-l-primary cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleRestaurantClick(restaurant, index)}
                  data-testid={`card-restaurant-${index}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h5 className="font-medium text-foreground">{restaurant.name}</h5>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">{restaurant.type}</Badge>
                          <Badge variant="outline">{restaurant.priceRange}</Badge>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <i
                                key={i}
                                className={`fas fa-star text-xs ${
                                  i < Math.floor(restaurant.rating)
                                    ? 'text-yellow-500'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="text-sm text-muted-foreground ml-1">
                              {restaurant.rating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-purple-600">
                          {Math.round(restaurant.confidence * 100)}% match
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {restaurant.description}
                    </p>
                    
                    {/* Address & Hours */}
                    <div className="space-y-2 mb-3">
                      {(restaurant.address || restaurant.location) && (
                        <div className="flex items-start gap-1">
                          <MapPin className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-muted-foreground">
                            {restaurant.address || restaurant.location}
                          </p>
                        </div>
                      )}
                      
                      {restaurant.openingHours?.open_now !== undefined && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <p className={`text-xs font-medium ${restaurant.openingHours.open_now ? 'text-green-600' : 'text-red-600'}`}>
                            {restaurant.openingHours.open_now ? 'Open Now' : 'Closed'}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {(restaurant.reasons || []).map((reason, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {reason}
                        </Badge>
                      ))}
                    </div>
                    
                    {/* Website Button */}
                    {restaurant.website && (
                      <div className="flex gap-2 mt-4 pt-3 border-t">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(restaurant.website, '_blank', 'noopener,noreferrer');
                          }}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          data-testid={`button-website-${restaurant.id}`}
                        >
                          <Globe className="w-4 h-4 mr-2" />
                          Visit Website
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}