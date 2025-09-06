export async function loadGoogleMapsScript(): Promise<void> {
  // Force complete cleanup of any existing Google Maps instances
  const existingScript = document.getElementById('google-maps-script');
  if (existingScript) {
    existingScript.remove();
  }
  
  // Aggressively clear any cached Google Maps state
  window.googleMapsLoaded = false;
  if (window.google) {
    delete (window as any).google;
  }
  if ((window as any).initGoogleMaps) {
    delete (window as any).initGoogleMaps;
  }

  try {
    // Fetch API key from environment variable
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    // Loading Google Maps JavaScript API
    
    if (!apiKey) {
      console.error('Google Maps API key not configured. Please set VITE_GOOGLE_MAPS_API_KEY environment variable.');
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.async = true;
    script.defer = true;
    // Force fresh load with cache busting and explicit version
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=3.55&callback=initGoogleMaps&_=${Date.now()}`;
    
    window.initGoogleMaps = function() {
      window.googleMapsLoaded = true;
      window.dispatchEvent(new Event('googleMapsLoaded'));
    };
    
    script.onerror = function(error) {
      console.error('❌ Google Maps script failed to load:', error);
      window.googleMapsLoaded = false;
    };
    
    // Suppress Google Maps error overlays while keeping functionality
    (window as any).gm_authFailure = function() {
      // Silently suppress auth failure overlays
    };
    
    document.head.appendChild(script);
  } catch (error) {
    console.warn('Error loading Google Maps script:', error);
  }
}