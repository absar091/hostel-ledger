import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop component - Scrolls to top of page on route change
 * This ensures users always see the top of a new page when navigating
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top when pathname changes
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
