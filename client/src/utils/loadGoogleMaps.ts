async function fetchApiKey(): Promise<string | null> {
  try {
    const response = await fetch('/api/config');
    const config = await response.json();
    return config.googleMapsApiKey;
  } catch (error) {
    console.error('Failed to fetch Google Maps API key:', error);
    return null;
  }
}

export async function loadGoogleMapsScript() {
  if (window.google || document.getElementById('google-maps-script')) {
    return;
  }

  const apiKey = await fetchApiKey();
  if (!apiKey) {
    console.warn('Google Maps API key not found - Google Maps features will be disabled');
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