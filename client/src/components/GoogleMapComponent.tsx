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
  restaurantName?: string;
  restaurantAddress?: string;
}

export default function GoogleMapComponent({
  center = { lat: 40.7128, lng: -74.0060 }, // Default to NYC
  zoom = 13,
  markers = [],
  onMapClick,
  className = "w-full h-64 rounded-lg",
  restaurantName,
  restaurantAddress
}: GoogleMapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  const { isLoaded, error } = useGoogleMaps();
  
  console.log('GoogleMapComponent render - isLoaded:', isLoaded, 'error:', error, 'center:', center);
  
  // Monitor for Google Maps API errors
  useEffect(() => {
    const handleGoogleMapsError = (event: any) => {
      if (event.error && event.error.includes && event.error.includes('ExpiredKeyMapError')) {
        console.log('Google Maps JavaScript API authentication issue detected');
      }
    };
    
    window.addEventListener('error', handleGoogleMapsError);
    return () => window.removeEventListener('error', handleGoogleMapsError);
  }, []);

  // Initialize map only once
  useEffect(() => {
    console.log('Map initialization check - isLoaded:', isLoaded, 'mapRef.current:', !!mapRef.current, 'window.google:', !!window.google, 'already initialized:', isInitializedRef.current);
    if (!isLoaded || !mapRef.current || !window.google || isInitializedRef.current) return;

    try {
      console.log('🗺️ Starting map initialization...');
      
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
      
      console.log('Creating Map instance...');
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, mapConfig);
      console.log('✅ Map instance created successfully:', !!mapInstanceRef.current);
      
      // Mark as initialized IMMEDIATELY after creation
      isInitializedRef.current = true;
      console.log('Map marked as initialized');
      
      // Add error listener for map loading issues
      mapInstanceRef.current.addListener('error', (error: any) => {
        console.log('Map error detected but map should remain functional:', error);
      });
      
      // Monitor map health and show fallback if needed
      let mapHealthTimer: NodeJS.Timeout;
      
      const checkMapHealth = () => {
        const mapDiv = mapRef.current;
        const fallback = document.getElementById('map-fallback');
        
        if (mapDiv && fallback) {
          // If map appears broken (gray or empty), show fallback
          const mapRect = mapDiv.getBoundingClientRect();
          const isMapVisible = mapRect.height > 0 && mapDiv.children.length > 0;
          
          if (!isMapVisible) {
            fallback.style.opacity = '1';
            fallback.style.zIndex = '1';
          } else {
            fallback.style.opacity = '0';
            fallback.style.zIndex = '-1';
          }
        }
      };
      
      mapInstanceRef.current.addListener('idle', () => {
        clearTimeout(mapHealthTimer);
        mapHealthTimer = setTimeout(checkMapHealth, 1000);
      });
      
      // Initial health check - but give Google more time to load tiles
      setTimeout(checkMapHealth, 5000);
      
      console.log('Map setup complete, waiting for tiles to load...');
      
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
    <div className="relative">
      <div 
        ref={mapRef} 
        className={className} 
        data-testid="google-map"
        style={{ minHeight: '400px', width: '100%' }}
      />
      {/* Fallback content that shows when Google Maps fails */}
      <div 
        className="absolute inset-0 bg-muted rounded-lg flex items-center justify-center pointer-events-none"
        style={{ 
          opacity: 0,
          transition: 'opacity 2s ease-in-out',
          zIndex: -1
        }}
        id="map-fallback"
      >
        <div className="text-center text-muted-foreground p-8">
          <div className="text-4xl mb-4">📍</div>
          <p className="text-sm font-medium mb-2">
            {restaurantName || "Restaurant Location"}
          </p>
          {restaurantAddress && (
            <p className="text-xs mb-2 opacity-75">
              {restaurantAddress}
            </p>
          )}
          <p className="text-xs opacity-50">
            Coordinates: {center.lat.toFixed(6)}, {center.lng.toFixed(6)}
          </p>
          <p className="text-xs mt-2 opacity-75">
            Use the website button above for navigation
          </p>
        </div>
      </div>
    </div>
  );
}