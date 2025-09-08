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
  latitude?: number;
  longitude?: number;
}

export function NaturalLanguageSearch({ variant, groupId, className = "" }: NaturalLanguageSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [results, setResults] = useState<RestaurantResult[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [location, navigate] = useLocation();
  const [allowedNavigation, setAllowedNavigation] = useState(false);
  const [currentAbortController, setCurrentAbortController] = useState<AbortController | null>(null);

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
    
    // Cleanup function to prevent memory leaks and async response conflicts
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [results, prompt, isExpanded]);

  // Auto-reset AI Concierge when navigating away (except for allowed navigation)
  useEffect(() => {
    const currentPath = location;
    const hasResults = results.length > 0;
    
    if (!hasResults) {
      // No results to reset
      return;
    }

    // Check if this is a navigation back from restaurant details
    const urlParams = new URLSearchParams(window.location.search);
    const backParam = urlParams.get('back');
    const isNavigatingBack = backParam && currentPath.includes(backParam);
    
    // Check if this is a restaurant details page
    const isRestaurantDetailsPage = currentPath.startsWith('/restaurant/');
    
    // Check if this is an allowed navigation we explicitly marked
    if (allowedNavigation) {
      setAllowedNavigation(false); // Reset the flag
      return;
    }
    
    // If navigating back from restaurant details or staying on restaurant details, don't reset
    if (isNavigatingBack || isRestaurantDetailsPage) {
      return;
    }
    
    // Check if we have AI Concierge results and we're not on an allowed page
    if (hasResults && !isRestaurantDetailsPage) {
      // This is navigation away from AI results to a different page - reset the concierge
      console.log('AI Concierge: Auto-resetting due to navigation away from results');
      resetSearch();
    }
    
  }, [location, allowedNavigation]);

  const searchMutation = useMutation({
    mutationFn: async (searchPrompt: string) => {
      if (!userLocation) {
        throw new Error('Location not available');
      }
      
      console.log('AI Concierge: Starting search request...');
      const startTime = Date.now();
      
      const endpoint = variant === 'group' && groupId 
        ? `/api/ai-concierge/group/${groupId}`
        : '/api/ai-concierge';
      
      const params = new URLSearchParams();
      params.set('lat', userLocation.lat.toString());
      params.set('lng', userLocation.lng.toString());
      
      // Create AbortController for request cancellation
      const controller = new AbortController();
      setCurrentAbortController(controller);
      
      // Set up 3-minute timeout (180 seconds)
      const timeoutId = setTimeout(() => {
        console.log('AI Concierge: Request timeout after 3 minutes, aborting...');
        controller.abort();
      }, 180000);
      
      try {
        console.log('AI Concierge: Making API request to:', `${endpoint}?${params}`);
        
        const response = await fetch(`${endpoint}?${params}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ prompt: searchPrompt }),
          credentials: 'include',
          signal: controller.signal
        });
        
        // Clear timeout on successful response
        clearTimeout(timeoutId);
        
        const elapsedTime = Date.now() - startTime;
        console.log(`AI Concierge: Request completed in ${elapsedTime}ms (${Math.round(elapsedTime/1000)}s)`);
        
        if (!response.ok) {
          const error = await response.text();
          console.error('AI Concierge: Search error:', error);
          throw new Error(`Search failed: ${response.status} - ${error}`);
        }
        
        const data = await response.json();
        console.log('AI Concierge: Successfully parsed response data');
        return data;
        
      } catch (error: any) {
        clearTimeout(timeoutId);
        setCurrentAbortController(null);
        
        if (error.name === 'AbortError') {
          console.log('AI Concierge: Request was cancelled or timed out');
          throw new Error('Search request was cancelled or timed out after 3 minutes');
        }
        
        console.error('AI Concierge: Request failed:', error);
        throw error;
      }
    },
    onSuccess: (data: any) => {
      console.log('AI Concierge: Search completed successfully!');
      console.log('AI Concierge: Restaurant results:', data);
      setCurrentAbortController(null);
      
      if (data.restaurants && Array.isArray(data.restaurants)) {
        console.log(`AI Concierge: Setting ${data.restaurants.length} restaurant results`);
        setResults(data.restaurants);
      } else {
        console.log('AI Concierge: No restaurants found in response');
        setResults([]);
      }
    },
    onError: (error: any) => {
      console.error('AI Concierge: Search failed with error:', error);
      setCurrentAbortController(null);
      setResults([]);
      
      // Don't show error UI for user-cancelled requests
      if (error.name === 'AbortError' || error.message?.includes('cancelled')) {
        console.log('Search was cancelled by user - no error shown');
        return;
      }
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

  const handleCancelSearch = () => {
    if (currentAbortController) {
      console.log('AI Concierge: User cancelled search');
      currentAbortController.abort();
      setCurrentAbortController(null);
      // Reset the mutation to clear any pending state
      searchMutation.reset();
    }
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
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      rating: restaurant.rating,
      reviewCount: 0,
      menuHighlights: [],
      features: ['AI-generated recommendation', 'Natural language search result'],
      confidence: restaurant.confidence || 0.85,
      placeId: restaurant.placeId || restaurant.id
    };
    
    sessionStorage.setItem(`restaurant_${restaurantId}`, JSON.stringify(restaurantData));
    const currentPath = window.location.pathname;
    
    // Mark this as allowed navigation to prevent AI Concierge reset
    setAllowedNavigation(true);
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
    <Card className={`ai-concierge-card bg-primary text-primary-foreground border-primary/20 shadow-lg ${className}`}>
      <CardHeader 
        className="cursor-pointer hover:bg-primary-foreground/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="header-toggle-concierge"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-foreground/10 border border-primary-foreground/20 rounded-lg flex items-center justify-center">
              <AISparklesIcon size={24} className="text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-primary-foreground">AI Dining Concierge</CardTitle>
              <p className="text-sm text-primary-foreground">
                Tell us what you're craving in plain English
              </p>
            </div>
          </div>
          
          <div className="shrink-0 text-primary-foreground p-2">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {!results.length && !searchMutation.isPending && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="search-prompt" className="text-sm font-medium text-primary-foreground">
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
                  className="min-h-[80px] resize-none bg-primary-foreground/10 border-primary-foreground/30 text-gray-900 placeholder:text-gray-500 focus:border-primary-foreground/60"
                  data-testid="textarea-search-prompt"
                />
                
                {/* Example Prompts */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-primary-foreground">Or try these examples:</p>
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
                        className="text-xs px-2 py-1 bg-primary-foreground/15 hover:bg-primary-foreground/25 border border-primary-foreground/30 rounded-md text-primary-foreground hover:text-primary-foreground transition-colors cursor-pointer"
                        data-testid={`button-example-${index}`}
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
                
                <p className="text-xs text-primary-foreground/90">
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
                  className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                  data-testid="button-search-restaurants"
                >
                  <AISparklesIcon size={16} className="mr-2" />
                  Find Restaurants
                </Button>
              </div>
            </div>
          )}

          {searchMutation.isPending && (
            <div className="space-y-6 py-8">
              {/* Simple Honest Loading Indicator */}
              <div className="text-center">
                <div className="inline-flex items-center gap-3 mb-6">
                  <div className="animate-spin h-6 w-6 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"></div>
                  <span className="text-lg font-semibold text-primary-foreground">AI is searching for you...</span>
                </div>
              </div>

              {/* Honest Time Expectation */}
              <div className="bg-primary-foreground/10 rounded-lg p-6 border border-primary-foreground/20 max-w-md mx-auto">
                <div className="text-center">
                  <h4 className="font-medium text-primary-foreground mb-3">⏱️ Processing Your Request</h4>
                  <div className="space-y-2 text-sm text-primary-foreground/90">
                    <p>This usually takes <strong>60-90 seconds</strong></p>
                    <p className="text-xs text-primary-foreground/70">
                      We're using AI to find real restaurants, reading reviews, and getting current hours & details
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-primary-foreground/20">
                    <Button 
                      onClick={handleCancelSearch}
                      variant="outline"
                      size="sm"
                      className="bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/30"
                      data-testid="button-cancel-search"
                    >
                      Cancel Search
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {searchMutation.isError && (
            <div className="text-center py-8">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                  <i className="fas fa-exclamation-triangle text-2xl text-red-400"></i>
                </div>
                <h3 className="font-medium text-primary-foreground mb-2">Search Failed</h3>
                <p className="text-sm text-primary-foreground mb-4">
                  We couldn't process your request right now. This might be due to:
                </p>
                <ul className="text-xs text-primary-foreground/90 text-left mb-4 space-y-1">
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
                  className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-4 bg-background p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground">Your AI-Powered Recommendations</h4>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetSearch}
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  data-testid="button-new-search"
                >
                  🔄 New Search
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
                            // Website clicks open in new tab, so no navigation reset needed
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
              
              {/* Prominent Reset Button at Bottom */}
              <div className="flex justify-center pt-6 pb-2 border-t border-border">
                <Button 
                  onClick={resetSearch}
                  variant="outline"
                  size="lg"
                  className="w-full max-w-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground font-medium"
                  data-testid="button-reset-search"
                >
                  🔄 Start New Search
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}