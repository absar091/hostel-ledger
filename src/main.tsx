import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

// Hide initial loading screen when React starts
setTimeout(() => {
  if (window.hideInitialLoading) {
    window.hideInitialLoading();
  }
}, 50);

// Render the app immediately
createRoot(document.getElementById("root")!).render(<App />);

// Register Service Worker with auto-update
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    if (confirm('A new version of Hostel Ledger is available! Click OK to update.')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
  onRegistered(registration) {
    console.log('SW registered:', registration);
    
    // Check for updates every 60 seconds
    if (registration) {
      setInterval(() => {
        registration.update();
      }, 60000);
    }
  },
  onRegisterError(error) {
    console.error('SW registration error:', error);
  },
});

