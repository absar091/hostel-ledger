// Verification code storage system
// In production, this should be stored in a database like Redis or Firebase

interface VerificationRecord {
  code: string;
  email: string;
  userId?: string;
  type: 'signup' | 'password_reset' | 'email_change';
  attempts: number;
  createdAt: number;
  expiresAt: number;
}

class VerificationStore {
  private store = new Map<string, VerificationRecord>();
  private readonly MAX_ATTEMPTS = 3;
  private readonly EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes
  
  // Generate and store verification code
  generateCode(email: string, type: VerificationRecord['type'], userId?: string): string {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const now = Date.now();
    
    const record: VerificationRecord = {
      code,
      email: email.toLowerCase(),
      userId,
      type,
      attempts: 0,
      createdAt: now,
      expiresAt: now + this.EXPIRY_TIME
    };
    
    // Use email as key for easy lookup
    this.store.set(email.toLowerCase(), record);
    
    // Clean up expired codes periodically
    this.cleanupExpired();
    
    return code;
  }
  
  // Verify code
  verifyCode(email: string, inputCode: string): {
    success: boolean;
    error?: string;
    attemptsLeft?: number;
  } {
    const record = this.store.get(email.toLowerCase());
    
    if (!record) {
      return { success: false, error: 'No verification code found. Please request a new one.' };
    }
    
    // Check if expired
    if (Date.now() > record.expiresAt) {
      this.store.delete(email.toLowerCase());
      return { success: false, error: 'Verification code has expired. Please request a new one.' };
    }
    
    // Check attempts
    if (record.attempts >= this.MAX_ATTEMPTS) {
      this.store.delete(email.toLowerCase());
      return { success: false, error: 'Too many failed attempts. Please request a new verification code.' };
    }
    
    // Increment attempts
    record.attempts++;
    
    // Check code
    if (record.code !== inputCode) {
      const attemptsLeft = this.MAX_ATTEMPTS - record.attempts;
      return { 
        success: false, 
        error: `Invalid verification code. ${attemptsLeft} attempts remaining.`,
        attemptsLeft 
      };
    }
    
    // Success - remove the code
    this.store.delete(email.toLowerCase());
    return { success: true };
  }
  
  // Check if code exists and is valid
  hasValidCode(email: string): boolean {
    const record = this.store.get(email.toLowerCase());
    return record ? Date.now() <= record.expiresAt : false;
  }
  
  // Get remaining time for code
  getRemainingTime(email: string): number {
    const record = this.store.get(email.toLowerCase());
    if (!record) return 0;
    
    return Math.max(0, record.expiresAt - Date.now());
  }
  
  // Remove code (for cleanup or manual removal)
  removeCode(email: string): void {
    this.store.delete(email.toLowerCase());
  }
  
  // Clean up expired codes
  private cleanupExpired(): void {
    const now = Date.now();
    for (const [email, record] of this.store.entries()) {
      if (now > record.expiresAt) {
        this.store.delete(email);
      }
    }
  }
  
  // Get code info (for debugging/admin purposes)
  getCodeInfo(email: string): Partial<VerificationRecord> | null {
    const record = this.store.get(email.toLowerCase());
    if (!record) return null;
    
    return {
      type: record.type,
      attempts: record.attempts,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt
    };
  }
  
  // Resend code (generates new code, resets attempts)
  resendCode(email: string): string | null {
    const record = this.store.get(email.toLowerCase());
    if (!record) return null;
    
    // Generate new code with same type
    return this.generateCode(email, record.type, record.userId);
  }
}

// Export singleton instance
export const verificationStore = new VerificationStore();

// Helper functions
export const generateVerificationCode = (email: string, type: VerificationRecord['type'], userId?: string): string => {
  return verificationStore.generateCode(email, type, userId);
};

export const verifyVerificationCode = (email: string, code: string) => {
  return verificationStore.verifyCode(email, code);
};

export const hasValidVerificationCode = (email: string): boolean => {
  return verificationStore.hasValidCode(email);
};

export const getVerificationTimeRemaining = (email: string): number => {
  return verificationStore.getRemainingTime(email);
};

export const resendVerificationCode = (email: string): string | null => {
  return verificationStore.resendCode(email);
};