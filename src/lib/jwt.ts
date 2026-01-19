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
const JWT_SECRET = import.meta.env.VITE_JWT_SECRET || 'hostel-ledger-super-secret-key-2024-change-in-production';

// Simple base64 encoding/decoding for demo purposes
// In production, use proper JWT with signing
export const createToken = (payload: Omit<TokenPayload, 'iat' | 'exp'>, expiresInMinutes: number = 60): string => {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: TokenPayload = {
    ...payload,
    iat: now,
    exp: now + (expiresInMinutes * 60)
  };
  
  // In production, use proper JWT signing with a secret key
  // For now, we'll use a simple encoding with the secret
  const tokenData = JSON.stringify(fullPayload);
  const signature = btoa(JWT_SECRET + tokenData).slice(0, 32);
  return btoa(tokenData) + '.' + signature;
};

export const verifyToken = (token: string): { valid: boolean; payload?: TokenPayload; error?: string } => {
  try {
    const [tokenData, signature] = token.split('.');
    if (!tokenData || !signature) {
      return { valid: false, error: 'Invalid token format' };
    }

    // Verify signature
    const expectedSignature = btoa(JWT_SECRET + atob(tokenData)).slice(0, 32);
    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid token signature' };
    }

    const payload: TokenPayload = JSON.parse(atob(tokenData));
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
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};