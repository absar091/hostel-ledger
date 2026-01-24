import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

declare global {
  interface Window {
    hideInitialLoading?: () => void;
  }
}

// Hide initial loading screen when React starts
setTimeout(() => {
  if (window.hideInitialLoading) {
    window.hideInitialLoading();
  }
}, 50);

// Render the app immediately
createRoot(document.getElementById("root")!).render(<App />);

