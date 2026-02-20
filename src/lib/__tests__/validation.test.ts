import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signupSchema } from '../validation';

describe('signupSchema', () => {
  beforeEach(() => {
    // Set a fixed date for age calculations: 2024-01-01
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const validData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    dateOfBirth: '2000-01-01', // 24 years old
    university: 'Test University',
    termsAccepted: true,
    privacyAccepted: true,
    // Optional fields
    phone: '03001234567',
    hostelName: 'Hostel A',
    roomNumber: '101',
    marketingEmails: false,
  };

  it('validates a correct signup object', () => {
    const result = signupSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('validates a correct signup object without optional fields', () => {
    const data = { ...validData };
    delete (data as any).phone;
    delete (data as any).hostelName;
    delete (data as any).roomNumber;
    delete (data as any).marketingEmails;

    const result = signupSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  describe('firstName validation', () => {
    it('fails if too short', () => {
      const result = signupSchema.safeParse({ ...validData, firstName: 'A' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 2 characters');
      }
    });

    it('fails if too long', () => {
      const result = signupSchema.safeParse({ ...validData, firstName: 'A'.repeat(51) });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('less than 50 characters');
      }
    });

    it('fails if contains invalid characters', () => {
      const result = signupSchema.safeParse({ ...validData, firstName: 'John123' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('only contain letters and spaces');
      }
    });
  });

  describe('lastName validation', () => {
    it('fails if too short', () => {
      const result = signupSchema.safeParse({ ...validData, lastName: 'A' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 2 characters');
      }
    });

    it('fails if too long', () => {
      const result = signupSchema.safeParse({ ...validData, lastName: 'A'.repeat(51) });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('less than 50 characters');
      }
    });

    it('fails if contains invalid characters', () => {
      const result = signupSchema.safeParse({ ...validData, lastName: 'Doe@' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('only contain letters and spaces');
      }
    });
  });

  describe('email validation', () => {
    it('fails if invalid email format', () => {
      const result = signupSchema.safeParse({ ...validData, email: 'invalid-email' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('valid email address');
      }
    });
  });

  describe('phone validation', () => {
    it('allows empty string or undefined', () => {
      let result = signupSchema.safeParse({ ...validData, phone: '' });
      expect(result.success).toBe(true);

      const dataWithoutPhone = { ...validData };
      delete (dataWithoutPhone as any).phone;
      result = signupSchema.safeParse(dataWithoutPhone);
      expect(result.success).toBe(true);
    });

    it('validates Pakistani phone format', () => {
      const validPhones = ['03001234567', '+923001234567'];
      validPhones.forEach(phone => {
        const result = signupSchema.safeParse({ ...validData, phone });
        expect(result.success).toBe(true);
      });

      const invalidPhones = ['0300123456', '030012345678', '12345678901'];
      invalidPhones.forEach(phone => {
        const result = signupSchema.safeParse({ ...validData, phone });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toContain('valid Pakistani phone number');
        }
      });
    });
  });

  describe('password validation', () => {
    it('fails if too short', () => {
      const result = signupSchema.safeParse({
        ...validData,
        password: 'Pass1!',
        confirmPassword: 'Pass1!'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 8 characters');
      }
    });

    it('fails if missing uppercase', () => {
      const result = signupSchema.safeParse({
        ...validData,
        password: 'password1!',
        confirmPassword: 'password1!'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
         expect(result.error.issues[0].message).toContain('uppercase letter');
      }
    });

    it('fails if missing lowercase', () => {
      const result = signupSchema.safeParse({
        ...validData,
        password: 'PASSWORD1!',
        confirmPassword: 'PASSWORD1!'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('lowercase letter');
      }
    });

    it('fails if missing number', () => {
      const result = signupSchema.safeParse({
        ...validData,
        password: 'Password!',
        confirmPassword: 'Password!'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('number');
      }
    });

    it('fails if missing special character', () => {
      const result = signupSchema.safeParse({
        ...validData,
        password: 'Password123',
        confirmPassword: 'Password123'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('special character');
      }
    });

    it('fails if passwords do not match', () => {
      const result = signupSchema.safeParse({
        ...validData,
        password: 'Password123!',
        confirmPassword: 'Password123@'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Passwords don't match");
      }
    });

    it('validates password starting with special character', () => {
      // Assuming the regex allows other special characters if they are not explicitly forbidden by the set logic
      // The current regex is ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]
      // It matches the first character being in that set.

      // Let's test a password starting with a character NOT in the set [A-Za-z\d@$!%*?&]
      // e.g. underscore _
      const result = signupSchema.safeParse({
        ...validData,
        password: '_Password1!',
        confirmPassword: '_Password1!'
      });
      // Based on my analysis, this should fail because the first char _ is not in [A-Za-z\d@$!%*?&]
      expect(result.success).toBe(false);
    });

    it('allows password with extra characters at the end', () => {
      // The regex ^(?=.*[a-z])...[class] only asserts the start of the string matches.
      // So trailing characters not in the set should be allowed.
      const result = signupSchema.safeParse({
        ...validData,
        password: 'Password1!_',
        confirmPassword: 'Password1!_'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('dateOfBirth validation', () => {
    // Current date is mocked as 2024-01-01

    it('fails if under 13 years old', () => {
      // Born 2012-01-01 -> 12 years old
      const result = signupSchema.safeParse({ ...validData, dateOfBirth: '2012-01-01' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('between 13 and 100 years old');
      }
    });

    it('fails if over 100 years old', () => {
      // Born 1923-01-01 -> 101 years old
      const result = signupSchema.safeParse({ ...validData, dateOfBirth: '1923-01-01' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('between 13 and 100 years old');
      }
    });

    it('passes if exactly 13 years old', () => {
      // Born 2011-01-01 -> 13 years old
      const result = signupSchema.safeParse({ ...validData, dateOfBirth: '2011-01-01' });
      expect(result.success).toBe(true);
    });

    it('passes if exactly 100 years old', () => {
      // Born 1924-01-01 -> 100 years old
      const result = signupSchema.safeParse({ ...validData, dateOfBirth: '1924-01-01' });
      expect(result.success).toBe(true);
    });
  });

  describe('university validation', () => {
    it('fails if too short', () => {
      const result = signupSchema.safeParse({ ...validData, university: 'A' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 2 characters');
      }
    });
  });

  describe('terms and privacy', () => {
    it('fails if termsAccepted is false', () => {
      const result = signupSchema.safeParse({ ...validData, termsAccepted: false });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('accept the terms');
      }
    });

    it('fails if privacyAccepted is false', () => {
      const result = signupSchema.safeParse({ ...validData, privacyAccepted: false });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('accept the privacy policy');
      }
    });
  });

  describe('hostelName and roomNumber', () => {
    it('fails if hostelName is too short', () => {
        const result = signupSchema.safeParse({ ...validData, hostelName: 'A' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toContain('between 2 and 100 characters');
        }
    });

    it('fails if hostelName is too long', () => {
        const result = signupSchema.safeParse({ ...validData, hostelName: 'A'.repeat(101) });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toContain('between 2 and 100 characters');
        }
    });

    it('fails if roomNumber is too long', () => {
        const result = signupSchema.safeParse({ ...validData, roomNumber: '1'.repeat(21) });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toContain('between 1 and 20 characters');
        }
    });
  });
});
