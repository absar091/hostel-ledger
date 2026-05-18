// JWT utilities for token handling
// Note: In a real production app, you'd use a proper JWT library and backend
// This is a simplified version for demonstration

interface TokenPayload {
  userId: string;
  email: string;
  type: 'verification' | 'reset';
  exp: number;
  iat: number;
}

// Get JWT secret from environment (Vite uses import.meta.env)
const JWT_SECRET = import.meta.env.VITE_JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('VITE_JWT_SECRET environment variable is not defined');
}

import hmacSHA256 from 'crypto-js/hmac-sha256';
import Base64Url from 'crypto-js/enc-base64url';
import encUtf8 from 'crypto-js/enc-utf8';

// SECURITY: Use cryptographically secure HMAC SHA-256 instead of simple Base64 concatenation for token signatures
export const createToken = (payload: Omit<TokenPayload, 'iat' | 'exp'>, expiresInMinutes: number = 60): string => {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: TokenPayload = {
    ...payload,
    iat: now,
    exp: now + (expiresInMinutes * 60)
  };
  
  // SECURITY: Properly encode token payload to prevent tampering
  const tokenData = Base64Url.stringify(encUtf8.parse(JSON.stringify(fullPayload)));
  const signature = Base64Url.stringify(hmacSHA256(tokenData, JWT_SECRET));
  return tokenData + '.' + signature;
};

export const verifyToken = (token: string): { valid: boolean; payload?: TokenPayload; error?: string } => {
  try {
    const [tokenData, signature] = token.split('.');
    if (!tokenData || !signature) {
      return { valid: false, error: 'Invalid token format' };
    }

    // SECURITY: Use cryptographic signature verification to prevent spoofing
    const expectedSignature = Base64Url.stringify(hmacSHA256(tokenData, JWT_SECRET));
    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid token signature' };
    }

    // Parse decoded base64url string
    const decodedStr = Base64Url.parse(tokenData).toString(encUtf8);
    const payload: TokenPayload = JSON.parse(decodedStr);
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp < now) {
      return { valid: false, error: 'Token expired' };
    }
    
    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: 'Invalid token' };
  }
};

// Generate secure random string for additional security
export const generateSecureToken = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomValue = globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
    result += chars.charAt(Math.floor((randomValue / 4294967296) * chars.length));
  }
  return result;
};