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
      setIsLoaded(true);
    };

    const handleError = () => {
      setError('Failed to load Google Maps');
    };

    // Check if API key exists
    const apiKey = 'AIzaSyCPTS0slU5KnKal2T_fWtO7XaGAYM78_5U'; // Temporarily hardcoded until secrets are fixed
    if (!apiKey) {
      setError('Google Maps API key not found - Google Maps features will be disabled');
      return;
    }

    // Load the Google Maps script
    loadGoogleMapsScript().catch((error) => {
      console.error('Failed to load Google Maps script:', error);
      setError('Failed to load Google Maps');
    });

    window.addEventListener('googleMapsLoaded', handleLoad);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('googleMapsLoaded', handleLoad);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return { isLoaded, error };
}

export function useGooglePlaces() {
  const { isLoaded, error } = useGoogleMaps();
  const [placesService, setPlacesService] = useState<any>(null);
  const [autocompleteService, setAutocompleteService] = useState<any>(null);

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
    } catch (error) {
      console.error('Error initializing Google Places services:', error);
    }
  }, [isLoaded, placesService, autocompleteService]); // Added services to dependencies to prevent re-initialization

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
            resolve(place);
          } else {
            reject(new Error(`Place details failed: ${status}`));
          }
        }
      );
    });
  }, [placesService]);

  const autocompleteRestaurants = useCallback((input: string, location?: { lat: number; lng: number }) => {
    return new Promise((resolve, reject) => {
      if (!autocompleteService) {
        reject(new Error('Autocomplete service not available'));
        return;
      }
      
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
            resolve(predictions || []);
          } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            resolve([]);
          } else {
            reject(new Error(`Autocomplete failed: ${status}`));
          }
        }
      );
    });
  }, [autocompleteService]);

  const getUserLocation = useCallback(() => {
    return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
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
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes cache
        }
      );
    });
  }, []);

  return {
    isLoaded,
    error,
    searchPlaces,
    getPlaceDetails,
    autocompleteRestaurants,
    getUserLocation,
  };
}