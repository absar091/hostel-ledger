import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Hide initial loading screen when React starts
setTimeout(() => {
  if (window.hideInitialLoading) {
    window.hideInitialLoading();
  }
}, 100);

createRoot(document.getElementById("root")!).render(<App />);
