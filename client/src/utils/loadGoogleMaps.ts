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
    
    if (!apiKey) {
      console.error('Google Maps API key not found in VITE_GOOGLE_MAPS_API_KEY');
      return;
    }
    console.log('Loading Google Maps with API key...');

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.async = true;
    script.defer = true;
    // Load places library for restaurant search functionality
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=initGoogleMaps`;
    
    window.initGoogleMaps = function() {
      console.log('Google Maps callback fired');
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