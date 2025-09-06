export async function loadGoogleMapsScript(): Promise<void> {
  try {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('Google Maps API key not configured. Please set VITE_GOOGLE_MAPS_API_KEY environment variable.');
      return;
    }

    // Clean up any existing script
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      existingScript.remove();
    }

    // Use direct script loading with proper async loading pattern
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    
    await new Promise<void>((resolve, reject) => {
      script.onload = () => {
        window.googleMapsLoaded = true;
        resolve();
      };
      
      script.onerror = (error) => {
        console.error('Google Maps script failed to load:', error);
        reject(new Error('Google Maps failed to load'));
      };
      
      document.head.appendChild(script);
      
      // Set a timeout to prevent infinite waiting
      setTimeout(() => {
        if (!window.google?.maps) {
          reject(new Error('Google Maps failed to load (timeout)'));
        }
      }, 10000);
    });
  } catch (error) {
    console.error('Error loading Google Maps script:', error);
    throw error;
  }
}