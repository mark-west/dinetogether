import { useEffect, useRef, useCallback } from 'react';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';

interface GoogleMapComponentProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{
    position: { lat: number; lng: number };
    title: string;
    info?: string;
  }>;
  onMapClick?: (location: { lat: number; lng: number }) => void;
  className?: string;
}

export default function GoogleMapComponent({
  center = { lat: 40.7128, lng: -74.0060 }, // Default to NYC
  zoom = 13,
  markers = [],
  onMapClick,
  className = "w-full h-64 rounded-lg"
}: GoogleMapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  const { isLoaded, error } = useGoogleMaps();
  
  // Check for Google Maps API key expiration error
  useEffect(() => {
    const handleGoogleMapsError = (event: any) => {
      if (event.error && event.error.includes('ExpiredKeyMapError')) {
        console.error('Google Maps API key has expired');
      }
    };
    
    window.addEventListener('error', handleGoogleMapsError);
    return () => window.removeEventListener('error', handleGoogleMapsError);
  }, []);

  // Initialize map only once
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.google || isInitializedRef.current) return;

    try {
      // Initialize map with proper configuration for tile loading
      const mapConfig: any = {
        center,
        zoom,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: true,
        gestureHandling: 'cooperative'
      };
      
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, mapConfig);
      
      // Add error listener for map loading issues
      mapInstanceRef.current.addListener('error', (error: any) => {
        console.log('Map error detected but map should remain functional:', error);
      });
      
      // Force map to remain visible even with API key issues
      mapInstanceRef.current.addListener('idle', () => {
        const mapDiv = mapRef.current;
        if (mapDiv) {
          mapDiv.style.backgroundColor = 'transparent';
          mapDiv.style.opacity = '1';
        }
      });
      
      // Force a resize after initialization to ensure proper rendering
      setTimeout(() => {
        if (mapInstanceRef.current) {
          window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
          mapInstanceRef.current.setCenter(center);
          // Map resized and centered
        }
      }, 100);

      // Add click listener
      if (onMapClick) {
        mapInstanceRef.current.addListener('click', (event: any) => {
          onMapClick({
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
          });
        });
      }

      isInitializedRef.current = true;
    } catch (error) {
      // Silently handle map initialization errors
    }
  }, [isLoaded]);

  // Update map center and zoom when props change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    try {
      mapInstanceRef.current.setCenter(center);
      mapInstanceRef.current.setZoom(zoom);
    } catch (error) {
      console.error('Error updating map center/zoom:', error);
    }
  }, [center, zoom]);

  // Cleanup function
  useEffect(() => {
    return () => {
      // Clear markers
      markersRef.current.forEach(marker => {
        try {
          if (marker && marker.map) {
            marker.map = null;
          } else if (marker && marker.setMap) {
            marker.setMap(null);
          }
        } catch (error) {
          console.error('Error cleaning up marker:', error);
        }
      });
      markersRef.current = [];

      // Clear info window
      if (infoWindowRef.current) {
        try {
          infoWindowRef.current.close();
          infoWindowRef.current = null;
        } catch (error) {
          console.error('Error cleaning up info window:', error);
        }
      }

      // Clear map instance
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current = null;
        } catch (error) {
          console.error('Error cleaning up map:', error);
        }
      }
      
      isInitializedRef.current = false;
    };
  }, []);

  // Update markers when they change
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google || !isInitializedRef.current) return;

    try {
      // Clear existing markers
      markersRef.current.forEach(marker => {
        if (marker && marker.map) {
          marker.map = null;
        }
      });
      markersRef.current = [];

      // Close any open info windows
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }

      // Add new markers using standard Marker API
      markers.forEach(markerData => {
        const marker = new window.google.maps.Marker({
          position: markerData.position,
          map: mapInstanceRef.current,
          title: markerData.title,
        });

        if (markerData.info && marker) {
          if (!infoWindowRef.current) {
            infoWindowRef.current = new window.google.maps.InfoWindow();
          }

          marker.addListener('click', () => {
            infoWindowRef.current.setContent(markerData.info);
            infoWindowRef.current.open(mapInstanceRef.current, marker);
          });
        }

        if (marker) {
          markersRef.current.push(marker);
        }
      });

      // Adjust map bounds if we have multiple markers, otherwise center on single marker
      if (markers.length > 1) {
        const bounds = new window.google.maps.LatLngBounds();
        markers.forEach(marker => bounds.extend(marker.position));
        mapInstanceRef.current.fitBounds(bounds, { padding: 50 });
      } else if (markers.length === 1) {
        // For single marker, just center and use default zoom
        mapInstanceRef.current.setCenter(markers[0].position);
        mapInstanceRef.current.setZoom(15);
      }
    } catch (error) {
      console.error('Error updating map markers:', error);
    }
  }, [markers]);

  // Don't block map rendering even if there are errors - let Google Maps handle it

  if (!isLoaded) {
    return (
      <div className={`${className} bg-muted rounded-lg flex items-center justify-center`}>
        <div className="text-center text-muted-foreground">
          <div className="w-6 h-6 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapRef} 
      className={className} 
      data-testid="google-map"
      style={{ minHeight: '400px', width: '100%' }}
    />
  );
}