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
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  }, 2000);
}
