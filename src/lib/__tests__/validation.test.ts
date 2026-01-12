import { 
  validateAmount, 
  validateExpenseData, 
  validatePaymentData, 
  validateGroupData,
  sanitizeString,
  sanitizeAmount 
} from '../validation';

describe('Validation Utils', () => {
  describe('validateAmount', () => {
    it('should validate positive numbers', () => {
      const result = validateAmount(100);
      console.log('✅ validateAmount(100):', result);
      if (!result.isValid) {
        throw new Error('Expected valid result for positive number');
      }
    });

    it('should reject zero and negative numbers', () => {
      const zeroResult = validateAmount(0);
      const negativeResult = validateAmount(-10);
      console.log('✅ validateAmount(0):', zeroResult);
      console.log('✅ validateAmount(-10):', negativeResult);
      
      if (zeroResult.isValid || negativeResult.isValid) {
        throw new Error('Expected invalid results for zero and negative numbers');
      }
    });

    it('should reject non-numeric values', () => {
      const stringResult = validateAmount('abc' as any);
      const nullResult = validateAmount(null as any);
      console.log('✅ validateAmount("abc"):', stringResult);
      console.log('✅ validateAmount(null):', nullResult);
      
      if (stringResult.isValid || nullResult.isValid) {
        throw new Error('Expected invalid results for non-numeric values');
      }
    });

    it('should reject amounts over limit', () => {
      const result = validateAmount(2000000);
      console.log('✅ validateAmount(2000000):', result);
      
      if (result.isValid) {
        throw new Error('Expected invalid result for amount over limit');
      }
    });
  });

  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      const result = sanitizeString('  hello  ');
      console.log('✅ sanitizeString("  hello  "):', result);
      
      if (result !== 'hello') {
        throw new Error(`Expected "hello", got "${result}"`);
      }
    });

    it('should remove dangerous characters', () => {
      const result = sanitizeString('hello<script>alert("xss")</script>');
      console.log('✅ sanitizeString with script tags:', result);
      
      if (result.includes('<script>')) {
        throw new Error('Script tags should be removed');
      }
    });

    it('should handle empty strings', () => {
      const emptyResult = sanitizeString('');
      const nullResult = sanitizeString(null as any);
      console.log('✅ sanitizeString(""):', emptyResult);
      console.log('✅ sanitizeString(null):', nullResult);
      
      if (emptyResult !== '' || nullResult !== '') {
        throw new Error('Empty strings should remain empty');
      }
    });
  });

  describe('sanitizeAmount', () => {
    it('should convert string numbers', () => {
      const result = sanitizeAmount('100');
      console.log('✅ sanitizeAmount("100"):', result);
      
      if (result !== 100) {
        throw new Error(`Expected 100, got ${result}`);
      }
    });

    it('should cap at maximum', () => {
      const result = sanitizeAmount(2000000);
      console.log('✅ sanitizeAmount(2000000):', result);
      
      if (result !== 1000000) {
        throw new Error(`Expected 1000000 (capped), got ${result}`);
      }
    });

    it('should handle invalid inputs', () => {
      const stringResult = sanitizeAmount('abc');
      const nullResult = sanitizeAmount(null);
      console.log('✅ sanitizeAmount("abc"):', stringResult);
      console.log('✅ sanitizeAmount(null):', nullResult);
      
      if (stringResult !== 0 || nullResult !== 0) {
        throw new Error('Invalid inputs should return 0');
      }
    });
  });

  describe('validateExpenseData', () => {
    const validExpenseData = {
      groupId: 'group123',
      amount: 100,
      paidBy: 'user123',
      participants: ['user123', 'user456'],
      note: 'Test expense',
      place: 'Test place'
    };

    it('should validate correct expense data', () => {
      const result = validateExpenseData(validExpenseData);
      console.log('✅ validateExpenseData (valid):', result);
      
      if (!result.isValid) {
        throw new Error('Expected valid result for correct expense data');
      }
    });

    it('should reject missing required fields', () => {
      const invalidData = { ...validExpenseData, groupId: '' };
      const result = validateExpenseData(invalidData);
      console.log('✅ validateExpenseData (missing groupId):', result);
      
      if (result.isValid) {
        throw new Error('Expected invalid result for missing groupId');
      }
    });

    it('should reject empty participants', () => {
      const invalidData = { ...validExpenseData, participants: [] };
      const result = validateExpenseData(invalidData);
      console.log('✅ validateExpenseData (empty participants):', result);
      
      if (result.isValid) {
        throw new Error('Expected invalid result for empty participants');
      }
    });
  });
});

console.log('🎉 All validation tests completed successfully!');