export async function loadGoogleMapsScript(): Promise<void> {
  console.log('loadGoogleMapsScript called');
  
  if (window.google || document.getElementById('google-maps-script')) {
    console.log('Google Maps already loaded or script already exists');
    return;
  }

  try {
    // Get the API key from environment variables
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    console.log('Google Maps API key found:', !!apiKey);
    
    if (!apiKey) {
      console.error('Google Maps API key not found - Google Maps features will be disabled');
      return;
    }

    console.log('Loading Google Maps script...');
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
    
    window.initGoogleMaps = function() {
      console.log('Google Maps callback executed');
      window.googleMapsLoaded = true;
      window.dispatchEvent(new Event('googleMapsLoaded'));
    };
    
    script.onerror = function() {
      console.error('Failed to load Google Maps script');
    };
    
    document.head.appendChild(script);
    console.log('Google Maps script added to document head');
  } catch (error) {
    console.error('Failed to load Google Maps:', error);
  }
}