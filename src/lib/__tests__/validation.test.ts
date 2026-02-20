import { describe, it, expect } from 'vitest';
import { signupSchema } from '../validation';

describe('signupSchema', () => {
  const validData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    dateOfBirth: '2000-01-01',
    university: 'University of Punjab',
    termsAccepted: true,
    privacyAccepted: true,
  };

  it('should validate correct data', () => {
    const result = signupSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  // firstName tests
  it('should invalidate firstName shorter than 2 characters', () => {
    const result = signupSchema.safeParse({ ...validData, firstName: 'A' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('First name must be at least 2 characters');
    }
  });

  it('should invalidate firstName longer than 50 characters', () => {
    const result = signupSchema.safeParse({ ...validData, firstName: 'A'.repeat(51) });
    expect(result.success).toBe(false);
     if (!result.success) {
      expect(result.error.issues[0].message).toContain('First name must be less than 50 characters');
    }
  });

  it('should invalidate firstName with special characters', () => {
    const result = signupSchema.safeParse({ ...validData, firstName: 'John123' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('First name can only contain letters and spaces');
    }
  });

  // lastName tests
  it('should invalidate lastName shorter than 2 characters', () => {
    const result = signupSchema.safeParse({ ...validData, lastName: 'D' });
    expect(result.success).toBe(false);
    if (!result.success) {
        expect(result.error.issues[0].message).toContain('Last name must be at least 2 characters');
    }
  });

  it('should invalidate lastName longer than 50 characters', () => {
    const result = signupSchema.safeParse({ ...validData, lastName: 'D'.repeat(51) });
    expect(result.success).toBe(false);
     if (!result.success) {
        expect(result.error.issues[0].message).toContain('Last name must be less than 50 characters');
    }
  });

  it('should invalidate lastName with special characters', () => {
    const result = signupSchema.safeParse({ ...validData, lastName: 'Doe@' });
    expect(result.success).toBe(false);
    if (!result.success) {
        expect(result.error.issues[0].message).toContain('Last name can only contain letters and spaces');
    }
  });

  // email tests
  it('should invalidate invalid email format', () => {
    const result = signupSchema.safeParse({ ...validData, email: 'invalid-email' });
    expect(result.success).toBe(false);
    if (!result.success) {
         expect(result.error.issues[0].message).toContain('Please enter a valid email address');
    }
  });

  // phone tests
  it('should validate optional phone number correctly', () => {
      // Empty/undefined is valid because optional
      expect(signupSchema.safeParse({ ...validData, phone: '' }).success).toBe(true);
      expect(signupSchema.safeParse({ ...validData, phone: undefined }).success).toBe(true);

      // Valid Pakistani number
      expect(signupSchema.safeParse({ ...validData, phone: '03001234567' }).success).toBe(true);
      expect(signupSchema.safeParse({ ...validData, phone: '+923001234567' }).success).toBe(true);
  });

  it('should invalidate invalid phone number format', () => {
    const result = signupSchema.safeParse({ ...validData, phone: '12345' });
    expect(result.success).toBe(false);
    if (!result.success) {
        expect(result.error.issues[0].message).toContain('Please enter a valid Pakistani phone number');
    }
  });

  // password tests
  it('should invalidate weak password', () => {
      // Too short
      expect(signupSchema.safeParse({ ...validData, password: 'Pass1!', confirmPassword: 'Pass1!' }).success).toBe(false);
      // Missing uppercase
      expect(signupSchema.safeParse({ ...validData, password: 'password1!', confirmPassword: 'password1!' }).success).toBe(false);
      // Missing lowercase
      expect(signupSchema.safeParse({ ...validData, password: 'PASSWORD1!', confirmPassword: 'PASSWORD1!' }).success).toBe(false);
      // Missing number
      expect(signupSchema.safeParse({ ...validData, password: 'Password!!', confirmPassword: 'Password!!' }).success).toBe(false);
      // Missing special char
      expect(signupSchema.safeParse({ ...validData, password: 'Password12', confirmPassword: 'Password12' }).success).toBe(false);
  });

  it('should invalidate if passwords do not match', () => {
    const result = signupSchema.safeParse({ ...validData, confirmPassword: 'DifferentPassword123!' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Passwords don't match");
    }
  });

  // dateOfBirth tests
  it('should invalidate underage (<13)', () => {
    const today = new Date();
    const underageDate = new Date(today.getFullYear() - 12, today.getMonth(), today.getDate()).toISOString().split('T')[0];
    const result = signupSchema.safeParse({ ...validData, dateOfBirth: underageDate });
    expect(result.success).toBe(false);
    if (!result.success) {
        expect(result.error.issues[0].message).toContain('You must be between 13 and 100 years old');
    }
  });

  it('should invalidate overage (>100)', () => {
    const today = new Date();
    const overageDate = new Date(today.getFullYear() - 101, today.getMonth(), today.getDate()).toISOString().split('T')[0];
    const result = signupSchema.safeParse({ ...validData, dateOfBirth: overageDate });
    expect(result.success).toBe(false);
     if (!result.success) {
        expect(result.error.issues[0].message).toContain('You must be between 13 and 100 years old');
    }
  });

  // university tests
  it('should invalidate university name shorter than 2 characters', () => {
      const result = signupSchema.safeParse({ ...validData, university: 'A' });
      expect(result.success).toBe(false);
      if (!result.success) {
          expect(result.error.issues[0].message).toContain('University name must be at least 2 characters');
      }
  });

  // hostelName tests
  it('should validate optional hostelName', () => {
      expect(signupSchema.safeParse({ ...validData, hostelName: '' }).success).toBe(true);
      expect(signupSchema.safeParse({ ...validData, hostelName: undefined }).success).toBe(true);
      expect(signupSchema.safeParse({ ...validData, hostelName: 'Hostel A' }).success).toBe(true);
  });

  it('should invalidate hostelName with invalid length', () => {
      const result = signupSchema.safeParse({ ...validData, hostelName: 'A' }); // Too short if provided
      expect(result.success).toBe(false);
       if (!result.success) {
          expect(result.error.issues[0].message).toContain('Hostel name must be between 2 and 100 characters');
      }
  });

  // roomNumber tests
  it('should validate optional roomNumber', () => {
       expect(signupSchema.safeParse({ ...validData, roomNumber: '' }).success).toBe(true);
       expect(signupSchema.safeParse({ ...validData, roomNumber: undefined }).success).toBe(true);
       expect(signupSchema.safeParse({ ...validData, roomNumber: '101' }).success).toBe(true);
  });

  it('should invalidate roomNumber > 20 chars', () => {
      const result = signupSchema.safeParse({ ...validData, roomNumber: 'A'.repeat(21) });
      expect(result.success).toBe(false);
       if (!result.success) {
          expect(result.error.issues[0].message).toContain('Room number must be between 1 and 20 characters');
      }
  });

  // terms and privacy tests
  it('should invalidate if terms not accepted', () => {
    const result = signupSchema.safeParse({ ...validData, termsAccepted: false });
    expect(result.success).toBe(false);
    if (!result.success) {
        expect(result.error.issues[0].message).toContain('You must accept the terms and conditions');
    }
  });

  it('should invalidate if privacy not accepted', () => {
    const result = signupSchema.safeParse({ ...validData, privacyAccepted: false });
    expect(result.success).toBe(false);
    if (!result.success) {
        expect(result.error.issues[0].message).toContain('You must accept the privacy policy');
    }
  });

  it('should validate marketingEmails as optional boolean', () => {
    expect(signupSchema.safeParse({ ...validData, marketingEmails: true }).success).toBe(true);
    expect(signupSchema.safeParse({ ...validData, marketingEmails: false }).success).toBe(true);
    expect(signupSchema.safeParse({ ...validData, marketingEmails: undefined }).success).toBe(true);
  });
});
