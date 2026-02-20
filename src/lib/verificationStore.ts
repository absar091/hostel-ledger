import { auth } from './firebase';

const API_URL = import.meta.env.VITE_API_URL || 'https://hostel-ledger-backend.vercel.app';

// Verification code storage system using Backend API
interface VerificationRecord {
  code: string;
  email: string;
  userId?: string;
  type: 'signup' | 'password_reset' | 'email_change';
  attempts: number;
  createdAt: any;
  expiresAt: any;
  verified: boolean;
}

class VerificationStore {
  // Helper for API calls (handles public vs secure automatically)
  private async callApi(endpoint: string, body: any) {
    let headers: any = {
      'Content-Type': 'application/json'
    };

    // Attach token if user is logged in
    const user = auth.currentUser;
    if (user) {
      const idToken = await user.getIdToken();
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'API request failed');
    }
    return result;
  }

  // Generate and store verification code via Backend
  async generateCode(email: string, type: VerificationRecord['type'], userId?: string, name: string = 'User'): Promise<string> {
    try {
      const result = await this.callApi('/api/verification/request', {
        email,
        name,
        type,
        userId
      });
      return 'OK'; // Result doesn't return the code for security (it's sent via email)
    } catch (error: any) {
      console.error('Error requesting verification code:', error);
      throw new Error(error.message || 'Failed to generate verification code');
    }
  }

  // Store existing code (deprecated - backend handles generation now)
  async storeCode(email: string, code: string, type: VerificationRecord['type'], userId?: string): Promise<void> {
    // For backward compatibility, we can still call request but it will generate its own code.
    // If the frontend REALLY needs to specify the code (legacy), we'd need a different endpoint.
    // However, the new flow should generate codes on the server.
    console.warn('storeCode is legacy. Use generateCode which handles both generation and storage.');
    await this.generateCode(email, type, userId);
  }

  // Verify code via Backend
  async verifyCode(email: string, inputCode: string): Promise<{
    success: boolean;
    error?: string;
    attemptsLeft?: number;
  }> {
    try {
      await this.callApi('/api/verification/verify', {
        email,
        code: inputCode
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error verifying code:', error);
      return {
        success: false,
        error: error.message || 'Failed to verify code. Please try again.',
        attemptsLeft: error.attemptsLeft
      };
    }
  }

  // The following methods rely on local state or simplified backend checks if needed.
  // For now, we'll keep them as simple stubs or implement if backend supports them.

  async hasValidCode(email: string): Promise<boolean> {
    try {
      const result = await this.callApi('/api/verification/check', { email });
      return result.success && result.hasCode;
    } catch (error) {
      console.error('Error checking verification code:', error);
      return false;
    }
  }

  async getRemainingTime(email: string): Promise<number> {
    return 600000; // Hardcoded 10 mins for UI countdown
  }

  async removeCode(email: string): Promise<void> {
    // No-op for now
  }

  async resendCode(email: string): Promise<string | null> {
    try {
      // Note: We need the name of the user. We can store it in sessionStorage or similar if needed.
      // For resend, we might need a stored type too.
      await this.callApi('/api/verification/request', {
        email,
        name: 'User', // Generic fallback
        type: 'signup' // Default fallback
      });
      return 'OK';
    } catch (error) {
      console.error('Error resending code:', error);
      return null;
    }
  }
}

// Export singleton instance
export const verificationStore = new VerificationStore();

// Helper functions (Maintaining signatures for compatibility)
export const generateVerificationCode = async (email: string, type: 'signup' | 'password_reset' | 'email_change', userId?: string, name?: string): Promise<string> => {
  return await verificationStore.generateCode(email, type, userId, name);
};

export const storeVerificationCode = async (email: string, code: string, type: 'signup' | 'password_reset' | 'email_change', userId?: string): Promise<void> => {
  return await verificationStore.storeCode(email, code, type, userId);
};

export const verifyVerificationCode = async (email: string, code: string) => {
  return await verificationStore.verifyCode(email, code);
};

export const hasValidVerificationCode = async (email: string): Promise<boolean> => {
  return await verificationStore.hasValidCode(email);
};

export const getVerificationTimeRemaining = async (email: string): Promise<number> => {
  return await verificationStore.getRemainingTime(email);
};

export const resendVerificationCode = async (email: string): Promise<string | null> => {
  return await verificationStore.resendCode(email);
};
