import { describe, it, expect } from 'vitest';
import { signupSchema, validatePasswordStrength, loginSchema } from '../validation';

describe('signupSchema', () => {
  const validData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@gmail.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    dateOfBirth: '2000-01-01',
    university: 'Test University',
    termsAccepted: true,
    privacyAccepted: true,
    // Optional fields
    phone: '03001234567',
    hostelName: 'Hostel A',
    roomNumber: '101',
    marketingEmails: false
  };

  it('validates a correct signup object', () => {
    const result = signupSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('validates a correct signup object without optional fields', () => {
    const { phone, hostelName, roomNumber, marketingEmails, ...requiredData } = validData;
    const result = signupSchema.safeParse(requiredData);
    expect(result.success).toBe(true);
  });

  describe('firstName', () => {
    it('fails if too short', () => {
      const result = signupSchema.safeParse({ ...validData, firstName: 'A' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.firstName).toContain('First name must be at least 2 characters');
      }
    });

    it('fails if too long', () => {
      const result = signupSchema.safeParse({ ...validData, firstName: 'A'.repeat(51) });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.firstName).toContain('First name must be less than 50 characters');
      }
    });

    it('fails if contains numbers', () => {
        const result = signupSchema.safeParse({ ...validData, firstName: 'John1' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.flatten().fieldErrors.firstName).toContain('First name can only contain letters and spaces');
        }
    });
  });

  describe('lastName', () => {
    it('fails if too short', () => {
      const result = signupSchema.safeParse({ ...validData, lastName: 'D' });
      expect(result.success).toBe(false);
       if (!result.success) {
        expect(result.error.flatten().fieldErrors.lastName).toContain('Last name must be at least 2 characters');
      }
    });

     it('fails if too long', () => {
      const result = signupSchema.safeParse({ ...validData, lastName: 'A'.repeat(51) });
      expect(result.success).toBe(false);
       if (!result.success) {
        expect(result.error.flatten().fieldErrors.lastName).toContain('Last name must be less than 50 characters');
      }
    });

     it('fails if contains symbols', () => {
        const result = signupSchema.safeParse({ ...validData, lastName: 'Doe!' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.flatten().fieldErrors.lastName).toContain('Last name can only contain letters and spaces');
        }
    });
  });

  describe('email', () => {
    it('fails if invalid email format', () => {
      const result = signupSchema.safeParse({ ...validData, email: 'not-an-email' });
      expect(result.success).toBe(false);
      if (!result.success) {
         expect(result.error.flatten().fieldErrors.email).toContain('Please enter a valid email address');
      }
    });
  });

  describe('phone', () => {
      it('fails if invalid Pakistani format', () => {
          const result = signupSchema.safeParse({ ...validData, phone: '123456' });
          expect(result.success).toBe(false);
           if (!result.success) {
              expect(result.error.flatten().fieldErrors.phone).toContain('Please enter a valid Pakistani phone number (e.g., 03XX-XXXXXXX)');
           }
      });

      it('passes with +92 prefix', () => {
           const result = signupSchema.safeParse({ ...validData, phone: '+923001234567' });
           expect(result.success).toBe(true);
      });

      it('passes with 03 prefix', () => {
           const result = signupSchema.safeParse({ ...validData, phone: '03001234567' });
           expect(result.success).toBe(true);
      });
  });

  describe('password', () => {
    it('fails if too short', () => {
      const result = signupSchema.safeParse({ ...validData, password: 'Pass1!', confirmPassword: 'Pass1!' });
      expect(result.success).toBe(false);
       if (!result.success) {
          expect(result.error.flatten().fieldErrors.password).toContain('Password must be at least 8 characters');
       }
    });

    it('fails if missing uppercase', () => {
       const result = signupSchema.safeParse({ ...validData, password: 'password123!', confirmPassword: 'password123!' });
       expect(result.success).toBe(false);
    });

    it('fails if missing lowercase', () => {
       const result = signupSchema.safeParse({ ...validData, password: 'PASSWORD123!', confirmPassword: 'PASSWORD123!' });
       expect(result.success).toBe(false);
    });

    it('fails if missing number', () => {
       const result = signupSchema.safeParse({ ...validData, password: 'Password!', confirmPassword: 'Password!' });
       expect(result.success).toBe(false);
    });

    it('fails if missing special char', () => {
       const result = signupSchema.safeParse({ ...validData, password: 'Password123', confirmPassword: 'Password123' });
       expect(result.success).toBe(false);
    });

    it('fails if passwords do not match', () => {
        const result = signupSchema.safeParse({ ...validData, confirmPassword: 'DifferentPassword123!' });
        expect(result.success).toBe(false);
         if (!result.success) {
            expect(result.error.flatten().fieldErrors.confirmPassword).toContain("Passwords don't match");
         }
    });
  });

  describe('dateOfBirth', () => {
      it('fails if under 13', () => {
          const today = new Date();
          const underAgeDate = new Date(today.getFullYear() - 12, today.getMonth(), today.getDate()).toISOString().split('T')[0];
          const result = signupSchema.safeParse({ ...validData, dateOfBirth: underAgeDate });
          expect(result.success).toBe(false);
           if (!result.success) {
              expect(result.error.flatten().fieldErrors.dateOfBirth).toContain('You must be between 13 and 100 years old');
           }
      });

      it('fails if over 100', () => {
          const today = new Date();
          const overAgeDate = new Date(today.getFullYear() - 101, today.getMonth(), today.getDate()).toISOString().split('T')[0];
          const result = signupSchema.safeParse({ ...validData, dateOfBirth: overAgeDate });
          expect(result.success).toBe(false);
           if (!result.success) {
              expect(result.error.flatten().fieldErrors.dateOfBirth).toContain('You must be between 13 and 100 years old');
           }
      });
  });

  describe('university', () => {
      it('fails if too short', () => {
          const result = signupSchema.safeParse({ ...validData, university: 'A' });
          expect(result.success).toBe(false);
      });
  });

  describe('hostelName', () => {
      it('fails if too short when provided', () => {
          const result = signupSchema.safeParse({ ...validData, hostelName: 'A' });
          expect(result.success).toBe(false);
      });

       it('passes if empty string', () => {
           const result = signupSchema.safeParse({ ...validData, hostelName: '' });
           expect(result.success).toBe(true);
       });
  });

  describe('roomNumber', () => {
      it('fails if too long', () => {
          const result = signupSchema.safeParse({ ...validData, roomNumber: '1'.repeat(21) });
          expect(result.success).toBe(false);
      });
  });

  describe('terms and privacy', () => {
      it('fails if terms not accepted', () => {
          const result = signupSchema.safeParse({ ...validData, termsAccepted: false });
          expect(result.success).toBe(false);
      });

      it('fails if privacy not accepted', () => {
          const result = signupSchema.safeParse({ ...validData, privacyAccepted: false });
          expect(result.success).toBe(false);
      });
  });
});

describe('validatePasswordStrength', () => {
  it('returns low score for empty password', () => {
    const result = validatePasswordStrength('');
    // Score is 1 because it satisfies "no repeating characters" check (which checks negation of regex)
    expect(result.score).toBe(1);
    expect(result.isStrong).toBe(false);
    expect(result.feedback).toContain('Use at least 8 characters');
  });

  it('returns low score for short passwords', () => {
    const result = validatePasswordStrength('short');
    expect(result.score).toBeLessThan(5);
    expect(result.feedback).toContain('Use at least 8 characters');
    expect(result.isStrong).toBe(false);
  });

  it('rewards length >= 8', () => {
    const result = validatePasswordStrength('abcdefgh');
    // score: 1(len8) + 1(low) + 1(no-repeat) = 3
    expect(result.feedback).not.toContain('Use at least 8 characters');
  });

  it('rewards length >= 12', () => {
    const result = validatePasswordStrength('abcdefghijkl');
    // score: 1(len8) + 1(len12) + 1(low) + 1(no-repeat) = 4
    expect(result.feedback).not.toContain('Consider using 12+ characters for better security');
  });

  it('checks for lowercase letters', () => {
    const result = validatePasswordStrength('PASSWORD123!');
    expect(result.feedback).toContain('Include lowercase letters');
  });

  it('checks for uppercase letters', () => {
    const result = validatePasswordStrength('password123!');
    expect(result.feedback).toContain('Include uppercase letters');
  });

  it('checks for numbers', () => {
    const result = validatePasswordStrength('Password!');
    expect(result.feedback).toContain('Include numbers');
  });

  it('checks for special characters', () => {
    const result = validatePasswordStrength('Password123');
    expect(result.feedback).toContain('Include special characters (@$!%*?&)');
  });

  it('detects repeating characters', () => {
    const result = validatePasswordStrength('aaabbbccc');
    expect(result.feedback).toContain('Avoid repeating characters');
  });

  it('recognizes a strong password', () => {
    const result = validatePasswordStrength('StrongP@ssw0rd!');
    // Length > 12: +2
    // Lower: +1
    // Upper: +1
    // Number: +1
    // Special: +1
    // No repeats: +1
    // Total: 7
    expect(result.score).toBeGreaterThanOrEqual(5);
    expect(result.isStrong).toBe(true);
    expect(result.feedback).toHaveLength(0);
  });

  it('calculates score correctly for "Abcdef1@"', () => {
     // Length 8: +1
     // Length 12: 0
     // Lower: +1
     // Upper: +1
     // Number: +1
     // Special: +1
     // No repeats: +1
     // Total: 6
     const result = validatePasswordStrength('Abcdef1@');
     expect(result.score).toBe(6);
     expect(result.isStrong).toBe(true);
  });
});

describe('loginSchema', () => {
  const validData = {
    email: 'test@example.com',
    password: 'Password123!',
    rememberMe: true
  };

  it('validates a correct login object', () => {
    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('validates a correct login object without rememberMe', () => {
    const { rememberMe, ...requiredData } = validData;
    const result = loginSchema.safeParse(requiredData);
    expect(result.success).toBe(true);
  });

  it('fails with an invalid email', () => {
    const result = loginSchema.safeParse({ ...validData, email: 'invalid-email' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toContain('Please enter a valid email address');
    }
  });

  it('fails with an empty email', () => {
    const result = loginSchema.safeParse({ ...validData, email: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toContain('Email is required');
    }
  });

  it('fails with an empty password', () => {
    const result = loginSchema.safeParse({ ...validData, password: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toContain('Password is required');
    }
  });
});
