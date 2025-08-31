export async function loadGoogleMapsScript(): Promise<void> {
  if (window.google || document.getElementById('google-maps-script')) {
    return;
  }

  try {
    // Fetch the API key from a dedicated endpoint
    const response = await fetch('/api/auth/user');
    if (response.ok) {
      // Since we can't access /api/config due to routing conflicts,
      // let's load without the API key and show a message
      console.log('Loading Google Maps without API key - restaurant search will be limited');
      
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.async = true;
      script.defer = true;
      script.src = 'https://maps.googleapis.com/maps/api/js?libraries=places&callback=initGoogleMaps';
      
      window.initGoogleMaps = function() {
        window.googleMapsLoaded = true;
        window.dispatchEvent(new Event('googleMapsLoaded'));
      };
      
      document.head.appendChild(script);
    }
  } catch (error) {
    console.warn('Could not load Google Maps:', error);
  }
}