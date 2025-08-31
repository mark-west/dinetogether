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

  // Initialize map only once
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.google || isInitializedRef.current) return;

    try {
      // Initialize map - mapId only needed for AdvancedMarkerElement
      const mapConfig: any = {
        center,
        zoom,
        styles: [
          {
            featureType: "poi.business",
            elementType: "labels",
            stylers: [{ visibility: "on" }]
          }
        ],
      };
      
      // Add mapId if AdvancedMarkerElement is available
      if (window.google.maps.marker?.AdvancedMarkerElement) {
        mapConfig.mapId = 'DEMO_MAP_ID';
      }
      
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, mapConfig);

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
      console.error('Error initializing Google Map:', error);
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

      // Add new markers - try AdvancedMarkerElement first, fallback to Marker
      markers.forEach(markerData => {
        let marker;
        
        // Try using AdvancedMarkerElement if available
        if (window.google.maps.marker?.AdvancedMarkerElement) {
          try {
            marker = new window.google.maps.marker.AdvancedMarkerElement({
              position: markerData.position,
              map: mapInstanceRef.current,
              title: markerData.title,
            });
          } catch (advancedError) {
            console.warn('AdvancedMarkerElement failed, falling back to Marker:', advancedError);
            marker = null;
          }
        }
        
        // Fallback to regular Marker if AdvancedMarkerElement not available or failed
        if (!marker) {
          marker = new window.google.maps.Marker({
            position: markerData.position,
            map: mapInstanceRef.current,
            title: markerData.title,
          });
        }

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

      // Adjust map bounds if we have markers
      if (markers.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        markers.forEach(marker => bounds.extend(marker.position));
        mapInstanceRef.current.fitBounds(bounds, { padding: 50 });
      }
    } catch (error) {
      console.error('Error updating map markers:', error);
    }
  }, [markers]);

  if (error) {
    return (
      <div className={`${className} bg-muted rounded-lg flex items-center justify-center`}>
        <div className="text-center text-muted-foreground">
          <i className="fas fa-map-marker-alt text-2xl mb-2"></i>
          <p className="text-sm">Map unavailable</p>
        </div>
      </div>
    );
  }

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

  return <div ref={mapRef} className={className} data-testid="google-map" />;
}