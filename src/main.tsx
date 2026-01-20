import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Hide initial loading screen when React starts
setTimeout(() => {
  if (window.hideInitialLoading) {
    window.hideInitialLoading();
  }
}, 50);

// Render the app immediately
createRoot(document.getElementById("root")!).render(<App />);

// Register Service Worker for PWA functionality (deferred)
if ('serviceWorker' in navigator) {
  // Defer service worker registration to not block initial load
  setTimeout(() => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
        
        // Check for updates every 60 seconds
        setInterval(() => {
          registration.update();
        }, 60000);
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available, prompt user to refresh
                if (confirm('A new version of Hostel Ledger is available! Click OK to update.')) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                }
              }
            });
          }
        });
        
        // Listen for controller change (new SW activated)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  }, 2000);
}
