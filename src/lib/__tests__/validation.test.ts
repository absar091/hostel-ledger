import { describe, it, expect } from 'vitest';
import { signupSchema } from '../validation';

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
