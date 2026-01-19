import { useState, useCallback } from 'react';
import { RateLimiter } from '@/lib/security';

interface UseRateLimitOptions {
  maxAttempts?: number;
  windowMs?: number;
}

export const useRateLimit = (identifier: string, options: UseRateLimitOptions = {}) => {
  const [rateLimiter] = useState(() => new RateLimiter(options.maxAttempts, options.windowMs));
  const [isBlocked, setIsBlocked] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  const checkRateLimit = useCallback(() => {
    const allowed = rateLimiter.isAllowed(identifier);
    
    if (!allowed) {
      const remaining = rateLimiter.getRemainingTime(identifier);
      setIsBlocked(true);
      setRemainingTime(remaining);
      
      // Auto-unblock when time expires
      setTimeout(() => {
        setIsBlocked(false);
        setRemainingTime(0);
      }, remaining);
      
      return false;
    }
    
    setIsBlocked(false);
    setRemainingTime(0);
    return true;
  }, [identifier, rateLimiter]);

  const getRemainingTimeFormatted = useCallback(() => {
    const minutes = Math.floor(remainingTime / 60000);
    const seconds = Math.floor((remainingTime % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [remainingTime]);

  return {
    checkRateLimit,
    isBlocked,
    remainingTime,
    getRemainingTimeFormatted
  };
};