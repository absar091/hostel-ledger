import { useEffect } from 'react';
import { getCSPHeader } from '@/lib/security';

/**
 * Component to set security headers via meta tags
 * Note: For production, these should be set at the server level
 */
export const SecurityHeaders = () => {
  useEffect(() => {
    // Set Content Security Policy
    const cspMeta = document.createElement('meta');
    cspMeta.httpEquiv = 'Content-Security-Policy';
    cspMeta.content = getCSPHeader();
    document.head.appendChild(cspMeta);

    // Note: X-Frame-Options cannot be set via meta tags, only HTTP headers
    // This should be set at the server level in production

    // Set X-Content-Type-Options equivalent
    const contentTypeMeta = document.createElement('meta');
    contentTypeMeta.httpEquiv = 'X-Content-Type-Options';
    contentTypeMeta.content = 'nosniff';
    document.head.appendChild(contentTypeMeta);

    // Set Referrer Policy
    const referrerMeta = document.createElement('meta');
    referrerMeta.name = 'referrer';
    referrerMeta.content = 'strict-origin-when-cross-origin';
    document.head.appendChild(referrerMeta);

    // Cleanup function
    return () => {
      document.head.removeChild(cspMeta);
      document.head.removeChild(contentTypeMeta);
      document.head.removeChild(referrerMeta);
    };
  }, []);

  return null; // This component doesn't render anything
};

export default SecurityHeaders;