export function loadGoogleMapsScript() {
  if (window.google || document.getElementById('google-maps-script')) {
    return;
  }

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn('VITE_GOOGLE_MAPS_API_KEY not found - Google Maps features will be disabled');
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
  
  document.head.appendChild(script);
}

// Auto-load on import
loadGoogleMapsScript();