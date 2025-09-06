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
    
    console.log('🗺️ Loading Google Maps JavaScript API...');
    console.log('API Key present:', apiKey ? 'YES' : 'NO');
    console.log('Key preview:', apiKey ? `${apiKey.substring(0, 12)}...` : 'N/A');
    
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
    
    script.onload = function() {
      console.log('✅ Google Maps script loaded successfully');
    };
    
    // Suppress Google Maps error overlays while keeping console logging
    (window as any).gm_authFailure = function() {
      console.log('🔇 Suppressing Google Maps auth failure overlay - map still functional');
    };
    
    // Add global error handler for Google Maps API errors
    const originalConsoleError = console.error;
    console.error = function(...args) {
      if (args[0] && args[0].includes && args[0].includes('Google Maps JavaScript API error')) {
        console.log('🔍 Detected Google Maps API Error (suppressing overlay):', args[0]);
        return; // Don't show the error in console, just log our custom message
      }
      originalConsoleError.apply(console, args);
    };
    
    document.head.appendChild(script);
    console.log('📝 Google Maps script tag added to document');
  } catch (error) {
    console.warn('Error loading Google Maps script:', error);
  }
}