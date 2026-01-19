/**
 * Security utilities for input validation and sanitization
 */

// XSS Prevention
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>\"'&]/g, (match) => {
      const escapeMap: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return escapeMap[match];
    })
    .trim()
    .substring(0, 1000); // Limit length
};

// SQL Injection Prevention (for any future SQL usage)
export const sanitizeForSQL = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/['";\\]/g, '') // Remove dangerous SQL characters
    .trim()
    .substring(0, 500);
};

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

// Password strength validation
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Amount validation for financial data
export const validateAmount = (amount: number | string): { isValid: boolean; error?: string; sanitizedAmount?: number } => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(num)) {
    return { isValid: false, error: 'Amount must be a valid number' };
  }
  
  if (num <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }
  
  if (num > 1000000) {
    return { isValid: false, error: 'Amount cannot exceed 1,000,000' };
  }
  
  // Round to 2 decimal places
  const sanitizedAmount = Math.round(num * 100) / 100;
  
  return { isValid: true, sanitizedAmount };
};

// Name validation
export const validateName = (name: string): { isValid: boolean; error?: string; sanitizedName?: string } => {
  if (typeof name !== 'string') {
    return { isValid: false, error: 'Name must be a string' };
  }
  
  const sanitizedName = sanitizeInput(name);
  
  if (sanitizedName.length === 0) {
    return { isValid: false, error: 'Name is required' };
  }
  
  if (sanitizedName.length > 50) {
    return { isValid: false, error: 'Name must be less than 50 characters' };
  }
  
  // Only allow letters, spaces, hyphens, and apostrophes
  if (!/^[a-zA-Z\s\-']+$/.test(sanitizedName)) {
    return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
  }
  
  return { isValid: true, sanitizedName };
};

// Phone number validation
export const validatePhone = (phone: string): { isValid: boolean; error?: string; sanitizedPhone?: string } => {
  if (typeof phone !== 'string') {
    return { isValid: false, error: 'Phone number must be a string' };
  }
  
  // Remove all non-digit characters
  const sanitizedPhone = phone.replace(/\D/g, '');
  
  if (sanitizedPhone.length === 0) {
    return { isValid: true, sanitizedPhone: '' }; // Phone is optional
  }
  
  if (sanitizedPhone.length < 10 || sanitizedPhone.length > 15) {
    return { isValid: false, error: 'Phone number must be between 10 and 15 digits' };
  }
  
  return { isValid: true, sanitizedPhone };
};

// Rate limiting helper
export class RateLimiter {
  private attempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  
  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 15 * 60 * 1000 // 15 minutes
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);
    
    if (!record) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }
    
    // Reset if window has passed
    if (now - record.lastAttempt > this.windowMs) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }
    
    // Check if limit exceeded
    if (record.count >= this.maxAttempts) {
      return false;
    }
    
    // Increment count
    record.count++;
    record.lastAttempt = now;
    return true;
  }
  
  getRemainingTime(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record || record.count < this.maxAttempts) {
      return 0;
    }
    
    const elapsed = Date.now() - record.lastAttempt;
    return Math.max(0, this.windowMs - elapsed);
  }
}

// CSRF Token generation and validation
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const validateCSRFToken = (token: string, expectedToken: string): boolean => {
  if (!token || !expectedToken) return false;
  return token === expectedToken;
};

// Content Security Policy helper
export const getCSPHeader = (): string => {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://*.firebaseio.com https://*.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://api.cloudinary.com wss://*.firebaseio.com https://*.gstatic.com",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
};