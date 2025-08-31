export async function loadGoogleMapsScript(): Promise<void> {
  if (window.google || document.getElementById('google-maps-script')) {
    return;
  }

  try {
    // Get the API key from environment variables
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    console.log('Google Maps API key status:', apiKey ? 'Found' : 'Missing');
    
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
      window.googleMapsLoaded = true;
      window.dispatchEvent(new Event('googleMapsLoaded'));
    };
    
    script.onerror = function(error) {
      console.error('Failed to load Google Maps script:', error);
      console.error('Check API key permissions and billing status');
    };
    
    document.head.appendChild(script);
  } catch (error) {
    console.error('Failed to load Google Maps:', error);
  }
}