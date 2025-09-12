import { useState, useEffect, useCallback } from 'react';
import { loadGoogleMapsScript } from '@/utils/loadGoogleMaps';

declare global {
  interface Window {
    google: any;
    googleMapsLoaded: boolean;
    initGoogleMaps: () => void;
  }
}

export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (window.googleMapsLoaded) {
      setIsLoaded(true);
      return;
    }

    const handleLoad = () => {
      // Check if Google Maps actually loaded properly
      if (window.google?.maps) {
        setIsLoaded(true);
      } else {
        setError('Google Maps API failed to load properly');
      }
    };

    const handleError = () => {
      setError('Failed to load Google Maps');
    };

    // Using specific API key configured in loadGoogleMapsScript

    // Set up a timeout to detect if Google Maps fails to load
    const loadTimeout = setTimeout(() => {
      if (!window.googleMapsLoaded && !window.google) {
        setError('Google Maps failed to load');
      }
    }, 15000); // 15 second timeout (longer for slower connections)

    // Load the Google Maps script
    loadGoogleMapsScript().catch((error) => {
      setError('Failed to load Google Maps');
      clearTimeout(loadTimeout);
    });

    window.addEventListener('googleMapsLoaded', handleLoad);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('googleMapsLoaded', handleLoad);
      window.removeEventListener('error', handleError);
      clearTimeout(loadTimeout);
    };
  }, []);

  return { isLoaded, error };
}

export function useGooglePlaces() {
  const { isLoaded, error: mapsError } = useGoogleMaps();
  const [placesService, setPlacesService] = useState<any>(null);
  const [autocompleteService, setAutocompleteService] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    try {
      if (placesService && autocompleteService) {
        return; // Already initialized
      }
      
      const map = new window.google.maps.Map(document.createElement('div'));
      const placesServiceInstance = new window.google.maps.places.PlacesService(map);
      const autocompleteServiceInstance = new window.google.maps.places.AutocompleteService();
      
      setPlacesService(placesServiceInstance);
      setAutocompleteService(autocompleteServiceInstance);
    } catch (error: any) {
      console.error('Google Places service initialization failed:', error);
      console.error('Full error details:', {
        hasGoogleMaps: !!window.google?.maps,
        hasPlacesLibrary: !!window.google?.maps?.places,
        errorMessage: error.message,
        errorStack: error.stack
      });
      setError(`Google Places initialization failed: ${error.message}`);
    }
  }, [isLoaded, placesService, autocompleteService]); // Added services to dependencies to prevent re-initialization

  // Service health checking
  const testServices = useCallback(async () => {
    if (!placesService || !autocompleteService) {
      console.warn('Services not initialized');
      return false;
    }
    
    try {
      // Test autocomplete with minimal request
      await new Promise((resolve, reject) => {
        autocompleteService.getPlacePredictions(
          { input: 'test', types: ['restaurant'] },
          (predictions: any[], status: any) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK) {
              console.log('✅ Autocomplete service working');
              resolve(predictions);
            } else {
              console.error('❌ Autocomplete service failed:', status);
              reject(new Error(`Status: ${status}`));
            }
          }
        );
      });
      return true;
    } catch (error) {
      console.error('Service test failed:', error);
      return false;
    }
  }, [placesService, autocompleteService]);

  // Auto-test services when they're initialized
  useEffect(() => {
    if (placesService && autocompleteService && !error) {
      testServices();
    }
  }, [placesService, autocompleteService, error, testServices]);

  const searchPlaces = useCallback((query: string, location?: { lat: number; lng: number }) => {
    return new Promise((resolve, reject) => {
      if (!placesService) {
        reject(new Error('Places service not available'));
        return;
      }

      const request: any = {
        query,
        type: 'restaurant',
      };

      if (location) {
        // Use new locationBias instead of deprecated location/radius
        request.locationBias = {
          center: { lat: location.lat, lng: location.lng },
          radius: 5000 // 5km radius
        };
      }

      placesService.textSearch(request, (results: any[], status: any) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          resolve(results);
        } else {
          reject(new Error(`Places search failed: ${status}`));
        }
      });
    });
  }, [placesService]);

  const getPlaceDetails = useCallback((placeId: string) => {
    return new Promise((resolve, reject) => {
      if (!placesService) {
        reject(new Error('Places service not available'));
        return;
      }

      placesService.getDetails(
        {
          placeId,
          fields: ['name', 'formatted_address', 'geometry', 'photos', 'rating', 'price_level', 'url']
        },
        (place: any, status: any) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            // Transform Google Places API response to match our Restaurant interface
            const restaurant = {
              placeId: placeId, // Use the original placeId passed in
              name: place.name || '',
              address: place.formatted_address || '',
              rating: place.rating || undefined,
              priceLevel: place.price_level || undefined,
              photoUrl: (() => {
                try {
                  return place.photos?.[0]?.getUrl?.() || undefined;
                } catch (error) {
                  console.warn('Google Places photo access failed:', error);
                  return undefined;
                }
              })(),
              location: place.geometry?.location ? {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              } : undefined
            };
            resolve(restaurant);
          } else {
            reject(new Error(`Place details failed: ${status}`));
          }
        }
      );
    });
  }, [placesService]);

  const autocompleteRestaurants = useCallback(async (input: string, location?: { lat: number; lng: number }) => {
    // Try client-side Google API first with timeout
    if (autocompleteService) {
      try {
        return await Promise.race([
          new Promise((resolve, reject) => {
            const request: any = {
              input,
              types: ['restaurant'], // More specific type to reduce irrelevant results
            };

            if (location) {
              // Use new locationBias instead of deprecated location/radius
              request.locationBias = {
                center: { lat: location.lat, lng: location.lng },
                radius: 15000 // 15km radius
              };
            }

            autocompleteService.getPlacePredictions(
              request,
              (predictions: any[], status: any) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                  console.log('✅ Using client-side Google autocomplete');
                  resolve(predictions || []);
                } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                  resolve([]);
                } else {
                  reject(new Error(`Autocomplete failed: ${status}`));
                }
              }
            );
          }),
          // Timeout after 3 seconds if Google API doesn't respond
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Google API timeout')), 3000);
          })
        ]);
      } catch (error) {
        console.log('Client-side autocomplete failed, trying server fallback...', error);
      }
    }
    
    // Fallback to server-side proxy
    try {
      const response = await fetch('/api/restaurant-autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input, location })
      });
      
      if (!response.ok) throw new Error('Server autocomplete failed');
      
      const data = await response.json();
      console.log('✅ Using server-side autocomplete fallback');
      return data.suggestions || [];
    } catch (error: any) {
      console.error('All autocomplete methods failed:', error);
      throw new Error('Restaurant search temporarily unavailable');
    }
  }, [autocompleteService]);

  const getUserLocation = useCallback(() => {
    return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          // User location successfully retrieved
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Geolocation error:', error.message);
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000, // Increased timeout
          maximumAge: 60000 // 1 minute cache instead of 5 minutes
        }
      );
    });
  }, []);

  return {
    isLoaded,
    error: error || mapsError,
    searchPlaces,
    getPlaceDetails,
    autocompleteRestaurants,
    getUserLocation,
    placesService,
    autocompleteService,
    testServices,
  };
}