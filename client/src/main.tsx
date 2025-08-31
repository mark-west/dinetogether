import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handler for IntersectionObserver issues
const originalObserve = IntersectionObserver.prototype.observe;
IntersectionObserver.prototype.observe = function(target) {
  if (!target || !(target instanceof Element)) {
    console.warn('IntersectionObserver: Invalid target element, skipping observation');
    return;
  }
  return originalObserve.call(this, target);
};

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes('IntersectionObserver')) {
    console.warn('Caught IntersectionObserver error:', event.reason);
    event.preventDefault(); // Prevent the error from showing in console
  }
});

createRoot(document.getElementById("root")!).render(<App />);
