import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionManager } from '../transaction';
// We need to import firebase functions to mock their implementations for specific tests
import { get, set, remove, ref } from 'firebase/database';

// Mock firebase/database
vi.mock('firebase/database', () => ({
  ref: vi.fn((_, path) => ({ path })), // Mock ref object containing path
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
  push: vi.fn(),
  update: vi.fn(),
  onValue: vi.fn(),
  off: vi.fn(),
}));

describe('TransactionManager Rollback Pattern', () => {
  let transactionManager: TransactionManager;

  beforeEach(() => {
    transactionManager = new TransactionManager();
    vi.clearAllMocks();
  });

  it('should restore data using fetch-before-delete pattern when subsequent operation fails', async () => {
    // Setup mock data
    const mockData = { id: 'group1', name: 'Test Group' };
    const mockPath = 'groups/group1';

    // Mock get to return data
    (get as any).mockResolvedValue({
      exists: () => true,
      val: () => mockData
    });

    // Operation 1: Delete Group (with rollback logic)
    let groupBackup: any = null;
    const op1 = {
      execute: async () => {
        // Simulate fetch
        const groupRef = ref({} as any, mockPath);
        const snapshot = await get(groupRef);
        if (snapshot.exists()) {
          groupBackup = snapshot.val();
        }
        // Simulate delete
        await remove(groupRef);
        return true;
      },
      rollback: async () => {
        if (groupBackup) {
          const groupRef = ref({} as any, mockPath);
          await set(groupRef, groupBackup);
        }
      },
      description: 'Delete group'
    };

    // Operation 2: Fail
    const op2 = {
      execute: async () => {
        throw new Error('Simulated Failure');
      },
      rollback: async () => {},
      description: 'Fail operation'
    };

    transactionManager.addOperation(op1);
    transactionManager.addOperation(op2);

    // Execute
    const result = await transactionManager.execute();

    // Verify failure
    expect(result.success).toBe(false);
    expect(result.error).toBe('Simulated Failure');

    // Verify rollback happened
    // 1. fetch happened
    expect(get).toHaveBeenCalled();
    // 2. delete happened
    expect(remove).toHaveBeenCalled();

    // 3. set happened (rollback)
    // We expect set to be called with a ref having path='groups/group1' and the mockData
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ path: mockPath }),
      mockData
    );
  });
});
