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
    
    if (!apiKey) {
      console.error('Google Maps API key not configured. Please set VITE_GOOGLE_MAPS_API_KEY environment variable.');
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
    
    window.initGoogleMaps = function() {
      window.googleMapsLoaded = true;
      window.dispatchEvent(new Event('googleMapsLoaded'));
    };
    
    script.onerror = function(error) {
      console.error('Google Maps script failed to load:', error);
      window.googleMapsLoaded = false;
    };
    
    document.head.appendChild(script);
  } catch (error) {
    console.warn('Error loading Google Maps script:', error);
  }
}