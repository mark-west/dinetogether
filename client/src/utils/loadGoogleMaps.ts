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

    console.log('Loading Google Maps with API key length:', apiKey.length);
    
    // Ensure API key is properly encoded for URL
    const encodedApiKey = encodeURIComponent(apiKey);
    
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.async = true;
    script.defer = true;
    const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${encodedApiKey}&libraries=places&callback=initGoogleMaps`;
    console.log('Google Maps script URL (key masked):', scriptUrl.replace(encodedApiKey, 'KEY_MASKED'));
    console.log('API key first/last chars:', `${apiKey.charAt(0)}...${apiKey.charAt(apiKey.length-1)}`);
    script.src = scriptUrl;
    
    window.initGoogleMaps = function() {
      console.log('✅ Google Maps JavaScript API loaded successfully');
      window.googleMapsLoaded = true;
      window.dispatchEvent(new Event('googleMapsLoaded'));
    };
    
    script.onload = function() {
      console.log('Google Maps script element loaded (but callback may not have fired yet)');
    };
    
    script.onerror = function(error) {
      console.error('❌ Google Maps script failed to load:', error);
      window.googleMapsLoaded = false;
    };
    
    document.head.appendChild(script);
  } catch (error) {
    console.warn('Error loading Google Maps script:', error);
  }
}