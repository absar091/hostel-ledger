import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateOfflinePayment, OfflinePayment, initDB } from '../offlineDB';
import { openDB } from 'idb';

// Mock idb
vi.mock('idb', () => ({
  openDB: vi.fn(),
}));

describe('offlineDB', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updateOfflinePayment should update payment in offline-payments store', async () => {
    const mockPut = vi.fn();
    const mockDb = {
      put: mockPut,
      close: vi.fn(),
    };
    (openDB as any).mockResolvedValue(mockDb);

    const payment: OfflinePayment = {
      id: 'pay_123',
      groupId: 'group_1',
      fromMember: 'user_1',
      toMember: 'user_2',
      amount: 50,
      method: 'cash',
      timestamp: 1625000000000,
      createdOffline: true,
      syncAttempts: 1,
    };

    // We need to cast because updateOfflinePayment might not exist yet during type checking if I run tsc
    // But since this is a test file running with vitest, it might be fine if I implement it soon.
    // However, for strict type checking, I'll need to implement it first.
    // Let's assume the function exists or will exist.
    await updateOfflinePayment(payment);

    expect(openDB).toHaveBeenCalledWith('hostel-ledger-db', 3, expect.any(Object));
    expect(mockPut).toHaveBeenCalledWith('offline-payments', payment);
  });
});
