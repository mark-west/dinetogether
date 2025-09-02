import { useState, useEffect } from 'react';
import GoogleMapComponent from './GoogleMapComponent';
import { geocodingService, type GeocodeResult } from '@/services/geocoding';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface EventMapComponentProps {
  event: {
    id: string;
    name: string;
    restaurantName?: string;
    restaurantAddress?: string;
    restaurantLat?: string;
    restaurantLng?: string;
    restaurantPlaceId?: string;
  };
}

export function EventMapComponent({ event }: EventMapComponentProps) {
  const [coordinates, setCoordinates] = useState<GeocodeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  // Check if we have stored coordinates
  const hasStoredCoordinates = Boolean(
    event.restaurantLat && 
    event.restaurantLng && 
    !isNaN(parseFloat(event.restaurantLat)) && 
    !isNaN(parseFloat(event.restaurantLng))
  );

  // Get coordinates from various sources
  useEffect(() => {
    const getCoordinates = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. First try stored coordinates
        if (hasStoredCoordinates) {
          setCoordinates({
            lat: parseFloat(event.restaurantLat!),
            lng: parseFloat(event.restaurantLng!)
          });
          setLoading(false);
          return;
        }

        // 2. Try place ID if available
        if (event.restaurantPlaceId) {
          const result = await geocodingService.geocodePlaceId(event.restaurantPlaceId);
          if (result) {
            setCoordinates(result);
            setLoading(false);
            return;
          }
        }

        // 3. Fall back to address geocoding
        if (event.restaurantAddress) {
          const result = await geocodingService.geocodeAddress(event.restaurantAddress);
          if (result) {
            setCoordinates(result);
            setLoading(false);
            return;
          }
        }

        // No coordinates found
        setError('Unable to determine restaurant location');
      } catch (err) {
        console.error('Error getting coordinates:', err);
        setError('Failed to load map location');
      } finally {
        setLoading(false);
      }
    };

    if (showMap && !coordinates) {
      getCoordinates();
    }
  }, [showMap, event, hasStoredCoordinates, coordinates]);

  // If no location data at all, don't show the location section
  if (!event.restaurantName && !event.restaurantAddress) {
    return null;
  }

  const mapMarkers = coordinates ? [{
    position: { lat: coordinates.lat, lng: coordinates.lng },
    title: event.restaurantName || event.name,
    info: `<div><strong>${event.restaurantName || event.name}</strong><br/>${event.restaurantAddress || ''}</div>`
  }] : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <i className="fas fa-map-marker-alt"></i>
          Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Restaurant Info */}
        {(event.restaurantName || event.restaurantAddress) && (
          <div className="p-4 bg-muted rounded-lg space-y-3">
            {event.restaurantName && (
              <div className="flex items-center gap-2 mb-2">
                <p className="font-medium text-lg" data-testid="text-restaurant-name">
                  {event.restaurantName}
                </p>
              </div>
            )}
            
            {event.restaurantAddress && (
              <div className="flex items-start gap-2">
                <i className="fas fa-map-marker-alt text-muted-foreground mt-1"></i>
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="text-sm" data-testid="text-restaurant-address">
                    {event.restaurantAddress}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Map Display */}
        {!showMap ? (
          <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center p-6">
              <i className="fas fa-map text-3xl text-muted-foreground mb-3"></i>
              <p className="text-sm text-muted-foreground mb-3">
                {event.restaurantAddress ? 'Click to view location on map' : 'No address available'}
              </p>
              {event.restaurantAddress && (
                <Button 
                  onClick={() => setShowMap(true)}
                  variant="outline" 
                  size="sm"
                  data-testid="button-show-map"
                >
                  <i className="fas fa-map mr-2"></i>
                  Show Map
                </Button>
              )}
            </div>
          </div>
        ) : loading ? (
          <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center">
              <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground mb-2"></i>
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        ) : error ? (
          <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center p-6">
              <i className="fas fa-exclamation-triangle text-2xl text-yellow-500 mb-2"></i>
              <p className="text-sm text-muted-foreground mb-3">{error}</p>
              <Button 
                onClick={() => {
                  setError(null);
                  setCoordinates(null);
                  setShowMap(false);
                }}
                variant="outline" 
                size="sm"
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : coordinates ? (
          <GoogleMapComponent
            center={{ lat: coordinates.lat, lng: coordinates.lng }}
            markers={mapMarkers}
            zoom={15}
            className="w-full h-64 rounded-lg"
          />
        ) : (
          <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center p-6">
              <i className="fas fa-map-marker-alt text-3xl text-muted-foreground mb-3"></i>
              <p className="text-sm text-muted-foreground">
                Location not found for this address
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}