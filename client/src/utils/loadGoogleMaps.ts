export async function loadGoogleMapsScript(): Promise<void> {
  // Remove any existing Google Maps script to force reload with new API key
  const existingScript = document.getElementById('google-maps-script');
  if (existingScript) {
    existingScript.remove();
    window.googleMapsLoaded = false;
    delete window.google;
  }
  
  if (window.google && window.googleMapsLoaded) {
    return;
  }

  try {
    // Get the API key from environment variables
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    console.log('Google Maps API key status:', apiKey ? 'Found' : 'Missing');
    console.log('API key starts with:', apiKey ? apiKey.substring(0, 10) + '...' : 'None');
    
    if (!apiKey) {
      console.error('Google Maps API key not found - Google Maps features will be disabled');
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.async = true;
    script.defer = true;
    // Load places library for restaurant search functionality
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=initGoogleMaps`;
    
    window.initGoogleMaps = function() {
      console.log('Google Maps script loaded successfully');
      console.log('Google Maps available:', !!window.google);
      console.log('Places API available:', !!window.google?.maps?.places);
      window.googleMapsLoaded = true;
      window.dispatchEvent(new Event('googleMapsLoaded'));
    };
    
    script.onerror = function(error) {
      console.error('Failed to load Google Maps script:', error);
      console.error('This usually means:');
      console.error('1. Invalid API key');
      console.error('2. API key lacks Places API permissions');
      console.error('3. Billing not enabled for the project');
      console.error('4. Domain restrictions on the API key');
    };
    
    document.head.appendChild(script);
  } catch (error) {
    console.error('Failed to load Google Maps:', error);
  }
}