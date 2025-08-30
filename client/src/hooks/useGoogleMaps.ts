import { useState, useEffect } from 'react';

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

    // Load the script with the API key
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript && !existingScript.getAttribute('src').includes('key=')) {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (apiKey) {
        existingScript.setAttribute('src', 
          `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`
        );
      } else {
        setError('Google Maps API key not found');
        return;
      }
    }

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
    if (isLoaded && window.google?.maps?.places) {
      const mapDiv = document.createElement('div');
      const map = new window.google.maps.Map(mapDiv);
      setPlacesService(new window.google.maps.places.PlacesService(map));
      setAutocompleteService(new window.google.maps.places.AutocompleteService());
    }
  }, [isLoaded]);

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

  const autocompleteRestaurants = (input: string) => {
    return new Promise((resolve, reject) => {
      if (!autocompleteService) {
        reject(new Error('Autocomplete service not available'));
        return;
      }

      autocompleteService.getPlacePredictions(
        {
          input,
          types: ['restaurant'],
        },
        (predictions: any[], status: any) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            resolve(predictions || []);
          } else {
            reject(new Error(`Autocomplete failed: ${status}`));
          }
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
  };
}