import { z } from 'zod';

// Enhanced validation schemas
export const signupSchema = z.object({
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'First name can only contain letters and spaces'),
  
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Last name can only contain letters and spaces'),
  
  email: z.string()
    .email('Please enter a valid email address')
    .min(5, 'Email must be at least 5 characters')
    .max(100, 'Email must be less than 100 characters')
    .toLowerCase(),
  
  phone: z.string()
    .optional()
    .refine((val) => !val || val === '' || /^(\+92|0)?3[0-9]{9}$/.test(val), 'Please enter a valid Pakistani phone number (e.g., 03XX-XXXXXXX)'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  confirmPassword: z.string(),
  
  dateOfBirth: z.string()
    .min(1, 'Date of birth is required')
    .refine((date) => {
      if (!date) return false;
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();
      
      // Adjust age if birthday hasn't occurred this year
      const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
      
      return actualAge >= 13 && actualAge <= 100;
    }, 'You must be between 13 and 100 years old'),
  
  university: z.string()
    .min(2, 'University name must be at least 2 characters')
    .max(100, 'University name must be less than 100 characters'),
  
  hostelName: z.string()
    .optional()
    .refine((val) => !val || val === '' || (val.length >= 2 && val.length <= 100), 'Hostel name must be between 2 and 100 characters'),
  
  roomNumber: z.string()
    .optional()
    .refine((val) => !val || val === '' || (val.length >= 1 && val.length <= 20), 'Room number must be between 1 and 20 characters'),
  
  termsAccepted: z.boolean()
    .refine((val) => val === true, 'You must accept the terms and conditions'),
  
  privacyAccepted: z.boolean()
    .refine((val) => val === true, 'You must accept the privacy policy'),
  
  marketingEmails: z.boolean().optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Legacy schema with emergency contact (kept for backward compatibility)
export const signupSchemaWithEmergencyContact = z.object({
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'First name can only contain letters and spaces'),
  
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Last name can only contain letters and spaces'),
  
  email: z.string()
    .email('Please enter a valid email address')
    .min(5, 'Email must be at least 5 characters')
    .max(100, 'Email must be less than 100 characters')
    .toLowerCase(),
  
  phone: z.string()
    .regex(/^(\+92|0)?3[0-9]{9}$/, 'Please enter a valid Pakistani phone number (e.g., 03XX-XXXXXXX)')
    .optional(),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  confirmPassword: z.string(),
  
  dateOfBirth: z.string()
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 13 && age <= 100;
    }, 'You must be between 13 and 100 years old'),
  
  university: z.string()
    .min(2, 'University name must be at least 2 characters')
    .max(100, 'University name must be less than 100 characters'),
  
  hostelName: z.string()
    .min(2, 'Hostel name must be at least 2 characters')
    .max(100, 'Hostel name must be less than 100 characters')
    .optional(),
  
  roomNumber: z.string()
    .min(1, 'Room number is required')
    .max(20, 'Room number must be less than 20 characters')
    .optional(),
  
  emergencyContact: z.object({
    name: z.string()
      .min(2, 'Emergency contact name must be at least 2 characters')
      .max(50, 'Emergency contact name must be less than 50 characters'),
    phone: z.string()
      .regex(/^(\+92|0)?3[0-9]{9}$/, 'Please enter a valid Pakistani phone number'),
    relation: z.string()
      .min(2, 'Relation must be at least 2 characters')
      .max(30, 'Relation must be less than 30 characters')
  }),
  
  termsAccepted: z.boolean()
    .refine((val) => val === true, 'You must accept the terms and conditions'),
  
  privacyAccepted: z.boolean()
    .refine((val) => val === true, 'You must accept the privacy policy'),
  
  marketingEmails: z.boolean().optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  
  password: z.string()
    .min(1, 'Password is required'),
  
  rememberMe: z.boolean().optional()
});

export const verificationSchema = z.object({
  code: z.string()
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only numbers')
});

export const forgotPasswordSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required')
});

export const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  confirmPassword: z.string(),
  
  token: z.string().min(1, 'Reset token is required')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Security utilities
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>\"']/g, '');
};

// Additional validation utilities for expense tracking
export const validateAmount = (amount: number): { isValid: boolean; error?: string } => {
  if (isNaN(amount) || amount <= 0) {
    return { isValid: false, error: 'Amount must be a positive number' };
  }
  if (amount > 1000000) {
    return { isValid: false, error: 'Amount cannot exceed 1,000,000' };
  }
  return { isValid: true };
};

export const sanitizeString = (input: string): string => {
  return input.trim().replace(/[<>\"'&]/g, '').substring(0, 200);
};

export const sanitizeAmount = (amount: string | number): number => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return isNaN(num) ? 0 : Math.max(0, Math.min(num, 1000000));
};

export const validateExpenseData = (data: {
  groupId: string;
  amount: number;
  paidBy: string;
  participants: string[];
  note: string;
  place: string;
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.groupId || data.groupId.trim() === '') {
    errors.push('Group is required');
  }

  const amountValidation = validateAmount(data.amount);
  if (!amountValidation.isValid) {
    errors.push(amountValidation.error || 'Invalid amount');
  }

  if (!data.paidBy || data.paidBy.trim() === '') {
    errors.push('Please select who paid');
  }

  if (!data.participants || data.participants.length === 0) {
    errors.push('Please select at least one participant');
  }

  if (data.note && data.note.length > 200) {
    errors.push('Note must be less than 200 characters');
  }

  if (data.place && data.place.length > 100) {
    errors.push('Place must be less than 100 characters');
  }

  return { isValid: errors.length === 0, errors };
};

export const validatePaymentData = (data: {
  groupId: string;
  fromMember: string;
  amount: number;
  method: string;
  note: string;
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.groupId || data.groupId.trim() === '') {
    errors.push('Group is required');
  }

  if (!data.fromMember || data.fromMember.trim() === '') {
    errors.push('Please select who paid you');
  }

  const amountValidation = validateAmount(data.amount);
  if (!amountValidation.isValid) {
    errors.push(amountValidation.error || 'Invalid amount');
  }

  if (!data.method || !['cash', 'online'].includes(data.method)) {
    errors.push('Please select a payment method');
  }

  if (data.note && data.note.length > 200) {
    errors.push('Note must be less than 200 characters');
  }

  return { isValid: errors.length === 0, errors };
};

export const validateGroupData = (data: {
  name: string;
  emoji: string;
  members: { name: string; phone?: string }[];
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.name || data.name.trim() === '') {
    errors.push('Group name is required');
  } else if (data.name.length > 50) {
    errors.push('Group name must be less than 50 characters');
  }

  if (!data.emoji || data.emoji.trim() === '') {
    errors.push('Please select an emoji for the group');
  }

  if (!data.members || data.members.length === 0) {
    errors.push('Please add at least one member');
  } else {
    data.members.forEach((member, index) => {
      if (!member.name || member.name.trim() === '') {
        errors.push(`Member ${index + 1} name is required`);
      } else if (member.name.length > 50) {
        errors.push(`Member ${index + 1} name must be less than 50 characters`);
      }

      if (member.phone && !/^(\+92|0)?3[0-9]{9}$/.test(member.phone)) {
        errors.push(`Member ${index + 1} phone number is invalid`);
      }
    });

    // Check for duplicate names
    const names = data.members.map(m => m.name.toLowerCase().trim());
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicates.length > 0) {
      errors.push('Member names must be unique');
    }
  }

  return { isValid: errors.length === 0, errors };
};

export const validatePasswordStrength = (password: string): {
  score: number;
  feedback: string[];
  isStrong: boolean;
} => {
  const feedback: string[] = [];
  let score = 0;
  
  // Length check
  if (password.length >= 8) score += 1;
  else feedback.push('Use at least 8 characters');
  
  if (password.length >= 12) score += 1;
  else if (password.length >= 8) feedback.push('Consider using 12+ characters for better security');
  
  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Include lowercase letters');
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Include uppercase letters');
  
  if (/\d/.test(password)) score += 1;
  else feedback.push('Include numbers');
  
  if (/[@$!%*?&]/.test(password)) score += 1;
  else feedback.push('Include special characters (@$!%*?&)');
  
  // Common patterns check
  if (!/(.)\1{2,}/.test(password)) score += 1;
  else feedback.push('Avoid repeating characters');
  
  const isStrong = score >= 5;
  
  return { score, feedback, isStrong };
};

export const checkEmailDomain = (email: string): boolean => {
  const allowedDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'edu.pk', 'student.edu.pk', 'pu.edu.pk', 'lums.edu.pk',
    'nust.edu.pk', 'comsats.edu.pk', 'fast.edu.pk' , 'cuvas.edu.pk'
  ];
  
  const domain = email.split('@')[1]?.toLowerCase();
  return allowedDomains.includes(domain) || domain?.endsWith('.edu.pk') || false;
};

// Rate limiting utilities (client-side tracking)
export const rateLimiter = {
  attempts: new Map<string, { count: number; lastAttempt: number }>(),
  
  canAttempt(key: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);
    
    if (!record) {
      this.attempts.set(key, { count: 1, lastAttempt: now });
      return true;
    }
    
    // Reset if window has passed
    if (now - record.lastAttempt > windowMs) {
      this.attempts.set(key, { count: 1, lastAttempt: now });
      return true;
    }
    
    // Check if under limit
    if (record.count < maxAttempts) {
      record.count++;
      record.lastAttempt = now;
      return true;
    }
    
    return false;
  },
  
  getRemainingTime(key: string, windowMs: number = 15 * 60 * 1000): number {
    const record = this.attempts.get(key);
    if (!record) return 0;
    
    const elapsed = Date.now() - record.lastAttempt;
    return Math.max(0, windowMs - elapsed);
  }
};

export type SignupFormData = z.infer<typeof signupSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type VerificationFormData = z.infer<typeof verificationSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;