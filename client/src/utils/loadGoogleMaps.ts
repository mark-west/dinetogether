export async function loadGoogleMapsScript(): Promise<void> {
  if (window.google || document.getElementById('google-maps-script')) {
    return;
  }

  try {
    // Get the API key from environment variables
    const apiKey = 'AIzaSyCPTS0slU5KnKal2T_fWtO7XaGAYM78_5U'; // Temporarily hardcoded until secrets are fixed
    
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
      window.googleMapsLoaded = true;
      window.dispatchEvent(new Event('googleMapsLoaded'));
    };
    
    script.onerror = function() {
      console.error('Failed to load Google Maps script');
    };
    
    document.head.appendChild(script);
  } catch (error) {
    console.error('Failed to load Google Maps:', error);
  }
}