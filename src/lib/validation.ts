// Comprehensive validation utilities
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateAmount = (amount: any): ValidationResult => {
  const errors: string[] = [];
  
  if (amount === null || amount === undefined || amount === '') {
    errors.push("Amount is required");
  } else {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) {
      errors.push("Amount must be a valid number");
    } else if (numAmount <= 0) {
      errors.push("Amount must be greater than 0");
    } else if (numAmount > 1000000) {
      errors.push("Amount cannot exceed Rs 10,00,000");
    }
  }
  
  return { isValid: errors.length === 0, errors };
};

export const validateExpenseData = (data: {
  groupId?: string;
  amount?: any;
  paidBy?: string;
  participants?: string[];
  note?: string;
  place?: string;
}): ValidationResult => {
  const errors: string[] = [];
  
  if (!data.groupId || data.groupId.trim() === '') {
    errors.push("Group selection is required");
  }
  
  const amountValidation = validateAmount(data.amount);
  if (!amountValidation.isValid) {
    errors.push(...amountValidation.errors);
  }
  
  if (!data.paidBy || data.paidBy.trim() === '') {
    errors.push("Payer selection is required");
  }
  
  if (!data.participants || data.participants.length === 0) {
    errors.push("At least one participant is required");
  }
  
  if (data.note && data.note.length > 200) {
    errors.push("Note cannot exceed 200 characters");
  }
  
  if (data.place && data.place.length > 100) {
    errors.push("Place cannot exceed 100 characters");
  }
  
  return { isValid: errors.length === 0, errors };
};

export const validatePaymentData = (data: {
  groupId?: string;
  fromMember?: string;
  toMember?: string;
  amount?: any;
  method?: string;
  note?: string;
}): ValidationResult => {
  const errors: string[] = [];
  
  if (!data.groupId || data.groupId.trim() === '') {
    errors.push("Group selection is required");
  }
  
  if (!data.fromMember || data.fromMember.trim() === '') {
    errors.push("From member selection is required");
  }
  
  if (!data.toMember || data.toMember.trim() === '') {
    errors.push("To member selection is required");
  }
  
  if (data.fromMember === data.toMember) {
    errors.push("From and To members cannot be the same");
  }
  
  const amountValidation = validateAmount(data.amount);
  if (!amountValidation.isValid) {
    errors.push(...amountValidation.errors);
  }
  
  if (!data.method || !['cash', 'online'].includes(data.method)) {
    errors.push("Payment method must be either 'cash' or 'online'");
  }
  
  if (data.note && data.note.length > 200) {
    errors.push("Note cannot exceed 200 characters");
  }
  
  return { isValid: errors.length === 0, errors };
};

export const validateGroupData = (data: {
  name?: string;
  emoji?: string;
  members?: { name: string; phone?: string }[];
}): ValidationResult => {
  const errors: string[] = [];
  
  if (!data.name || data.name.trim() === '') {
    errors.push("Group name is required");
  } else if (data.name.length > 50) {
    errors.push("Group name cannot exceed 50 characters");
  }
  
  if (!data.emoji || data.emoji.trim() === '') {
    errors.push("Group emoji is required");
  }
  
  if (!data.members || data.members.length === 0) {
    errors.push("At least one member is required");
  } else {
    data.members.forEach((member, index) => {
      if (!member.name || member.name.trim() === '') {
        errors.push(`Member ${index + 1} name is required`);
      } else if (member.name.length > 50) {
        errors.push(`Member ${index + 1} name cannot exceed 50 characters`);
      }
      
      if (member.phone && member.phone.length > 20) {
        errors.push(`Member ${index + 1} phone cannot exceed 20 characters`);
      }
    });
    
    // Check for duplicate member names
    const memberNames = data.members.map(m => m.name.trim().toLowerCase());
    const duplicates = memberNames.filter((name, index) => memberNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      errors.push("Member names must be unique");
    }
  }
  
  return { isValid: errors.length === 0, errors };
};

export const sanitizeString = (input: string): string => {
  if (!input) return '';
  return input.trim().replace(/[<>]/g, ''); // Basic XSS prevention
};

export const sanitizeAmount = (input: any): number => {
  const num = typeof input === 'string' ? parseFloat(input) : input;
  return isNaN(num) ? 0 : Math.max(0, Math.min(num, 1000000)); // Cap at 10 lakh
};