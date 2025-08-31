import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handler for IntersectionObserver issues
const originalObserve = IntersectionObserver.prototype.observe;
IntersectionObserver.prototype.observe = function(target) {
  try {
    if (!target || !(target instanceof Element)) {
      console.warn('IntersectionObserver: Invalid target element, skipping observation');
      return;
    }
    return originalObserve.call(this, target);
  } catch (error) {
    console.warn('IntersectionObserver.observe error caught and handled:', error);
    return;
  }
};

// Enhanced global error handlers
window.addEventListener('error', (event) => {
  if (event.error && (event.error.message.includes('IntersectionObserver') || event.error.message.includes('ResizeObserver'))) {
    console.warn('Global error handler caught observer error:', event.error);
    event.preventDefault();
    return false;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && 
      (event.reason.message.includes('IntersectionObserver') || 
       event.reason.message.includes('ResizeObserver') ||
       event.reason.message.includes('observer'))) {
    console.warn('Caught observer-related promise rejection:', event.reason);
    event.preventDefault();
    return false;
  }
  
  // Also handle any network-related errors silently
  if (event.reason && event.reason.message && 
      (event.reason.message.includes('fetch') || 
       event.reason.message.includes('network') ||
       event.reason.message.includes('Failed to fetch'))) {
    console.warn('Network error caught:', event.reason.message);
    event.preventDefault();
    return false;
  }
});

// Additional safety check for root element
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element not found');
}

try {
  createRoot(rootElement).render(<App />);
} catch (error) {
  console.error('Failed to render app:', error);
}
