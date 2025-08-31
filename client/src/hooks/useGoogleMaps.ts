import { useState, useEffect } from 'react';
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
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
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
    if (isLoaded && window.google?.maps?.places && !placesService && !autocompleteService) {
      try {
        const mapDiv = document.createElement('div');
        const map = new window.google.maps.Map(mapDiv);
        const placesServiceInstance = new window.google.maps.places.PlacesService(map);
        const autocompleteServiceInstance = new window.google.maps.places.AutocompleteService();
        
        setPlacesService(placesServiceInstance);
        setAutocompleteService(autocompleteServiceInstance);
      } catch (error) {
        console.error('Error initializing Google Places services:', error);
      }
    }
  }, [isLoaded, placesService, autocompleteService]); // Added services to dependencies to prevent re-initialization

  const searchPlaces = (query: string, location?: { lat: number; lng: number }) => {
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
        request.location = new window.google.maps.LatLng(location.lat, location.lng);
        request.radius = 5000; // 5km radius
      }

      placesService.textSearch(request, (results: any[], status: any) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          resolve(results);
        } else {
          reject(new Error(`Places search failed: ${status}`));
        }
      });
    });
  };

  const getPlaceDetails = (placeId: string) => {
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
  };

  const autocompleteRestaurants = (input: string, location?: { lat: number; lng: number }) => {
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
        request.location = new window.google.maps.LatLng(location.lat, location.lng);
        request.radius = 15000; // Reduced radius from 20km to 15km
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
  };

  const getUserLocation = () => {
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
  };

  return {
    isLoaded,
    error,
    searchPlaces,
    getPlaceDetails,
    autocompleteRestaurants,
    getUserLocation,
  };
}