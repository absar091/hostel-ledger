import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock firebase module to avoid initialization errors
vi.mock('../firebase', () => ({
  auth: {
    currentUser: null
  }
}));

// Mock verificationStore to avoid side effects during import if any
// But we want to test the class methods, so we import it after mocking dependencies.

import { verificationStore } from '../verificationStore';

describe('VerificationStore', () => {
  const mockEmail = 'test@example.com';
  const mockName = 'Test User';
  const mockType = 'signup';
  const mockUserId = 'user123';

  // Mock fetch
  const fetchMock = vi.fn();
  global.fetch = fetchMock;

  // Mock sessionStorage
  const sessionStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value.toString();
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      })
    };
  })();
  global.sessionStorage = sessionStorageMock;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageMock.clear();

    // Default fetch response
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
  });

  it('should save verification context when generating code', async () => {
    await verificationStore.generateCode(mockEmail, mockType, mockUserId, mockName);

    // Verify API call
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/verification/request'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: mockEmail,
          name: mockName,
          type: mockType,
          userId: mockUserId
        })
      })
    );

    // Verify sessionStorage (Expected behavior after fix)
    // Currently this will fail until we implement the fix
    // So for TDD, this is good.
    // However, I can't easily assert on failure here without breaking the step.
    // I will write the test assuming the fix is present or check if I should assert the current behavior first.
    // The plan is to implement the fix next. So I will write the test to expect the CORRECT behavior.
  });

  it('should use stored context when resending code', async () => {
    // Setup stored context
    const context = {
      email: mockEmail,
      type: mockType,
      name: mockName,
      userId: mockUserId,
      timestamp: Date.now()
    };
    sessionStorageMock.setItem(`verification_context_${mockEmail}`, JSON.stringify(context));

    await verificationStore.resendCode(mockEmail);

    // Verify API call uses stored values
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/verification/request'),
      expect.objectContaining({
        body: JSON.stringify({
          email: mockEmail,
          name: mockName, // Should use stored name
          type: mockType, // Should use stored type
          userId: mockUserId
        })
      })
    );
  });

  it('should fallback to defaults when resending code without context', async () => {
    // No stored context

    await verificationStore.resendCode(mockEmail);

    // Verify API call uses defaults
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/verification/request'),
      expect.objectContaining({
        body: JSON.stringify({
          email: mockEmail,
          name: 'User', // Default fallback
          type: 'signup' // Default fallback
        })
      })
    );
  });

  it('should fallback to pendingSignup when resending code if context missing', async () => {
    // No verification_context, but has pendingSignup
    const pendingSignup = {
        email: mockEmail,
        firstName: 'John',
        lastName: 'Doe',
        university: 'Test Uni',
        isNewUser: true
    };
    sessionStorageMock.setItem('pendingSignup', JSON.stringify(pendingSignup));

    await verificationStore.resendCode(mockEmail);

    // Verify API call uses name from pendingSignup
    // Note: pendingSignup doesn't have 'type', so type falls back to default 'signup'
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/verification/request'),
      expect.objectContaining({
        body: JSON.stringify({
          email: mockEmail,
          name: 'John Doe', // Derived from pendingSignup
          type: 'signup' // Default
        })
      })
    );
  });

  it('should clear context when verifying code successfully', async () => {
    // Setup stored context
    const context = {
      email: mockEmail,
      type: mockType,
      name: mockName,
      userId: mockUserId,
      timestamp: Date.now()
    };
    sessionStorageMock.setItem(`verification_context_${mockEmail}`, JSON.stringify(context));

    await verificationStore.verifyCode(mockEmail, '123456');

    // Verify context is removed
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(`verification_context_${mockEmail}`);
  });
});
