import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryOperation, TransactionManager, TransactionOperation } from '../transaction';

describe('retryOperation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should succeed immediately if the operation does not fail', async () => {
    const mockOperation = vi.fn().mockResolvedValue('success');
    const result = await retryOperation(mockOperation);

    expect(result).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const mockOperation = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');

    // Start the promise
    const promise = retryOperation(mockOperation, 3, 100);

    // Fast-forward time to bypass delays
    // 1st retry: delay ~100 + random(0-1000)
    // 2nd retry: delay ~200 + random(0-1000)
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(3);
  });

  it('should throw the last error after max retries are exceeded', async () => {
    const error = new Error('permanent failure');
    const mockOperation = vi.fn().mockRejectedValue(error);

    const promise = retryOperation(mockOperation, 2, 100);

    // Attach the catch handler immediately to avoid "Unhandled Rejection"
    // during the runAllTimersAsync execution.
    const expectPromise = expect(promise).rejects.toThrow('permanent failure');

    // Fast-forward all timers
    await vi.runAllTimersAsync();

    await expectPromise;
    // Initial attempt + 2 retries = 3 calls total
    expect(mockOperation).toHaveBeenCalledTimes(3);
  });

  it('should use exponential backoff with jitter', async () => {
    const mockOperation = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockResolvedValue('success');

    const baseDelay = 1000;
    const promise = retryOperation(mockOperation, 3, baseDelay);

    // Advance time just a little bit, check not called yet
    await vi.advanceTimersByTimeAsync(100);
    // It should have been called once (initial attempt) and failed, now waiting.
    expect(mockOperation).toHaveBeenCalledTimes(1);

    // The delay is at least baseDelay * 2^0 = 1000ms.
    // So if we advance by 500ms more (total 600ms), it should still be waiting.
    await vi.advanceTimersByTimeAsync(500);
    expect(mockOperation).toHaveBeenCalledTimes(1);

    // Now run all timers to complete the delay
    await vi.runAllTimersAsync();

    await promise;
    expect(mockOperation).toHaveBeenCalledTimes(2);
  });
});

describe('TransactionManager', () => {
  it('should execute operations successfully', async () => {
    const manager = new TransactionManager();
    const op1: TransactionOperation = {
      execute: vi.fn().mockResolvedValue('result1'),
      rollback: vi.fn(),
      description: 'op1'
    };
    const op2: TransactionOperation = {
      execute: vi.fn().mockResolvedValue('result2'),
      rollback: vi.fn(),
      description: 'op2'
    };

    manager.addOperation(op1);
    manager.addOperation(op2);

    const result = await manager.execute();

    expect(result.success).toBe(true);
    expect(result.results).toEqual(['result1', 'result2']);
    expect(op1.execute).toHaveBeenCalled();
    expect(op2.execute).toHaveBeenCalled();
  });

  it('should rollback operations in reverse order on failure', async () => {
    const manager = new TransactionManager();
    const op1: TransactionOperation = {
      execute: vi.fn().mockResolvedValue('result1'),
      rollback: vi.fn().mockResolvedValue(undefined),
      description: 'op1'
    };
    const op2: TransactionOperation = {
      execute: vi.fn().mockRejectedValue(new Error('fail')),
      rollback: vi.fn(),
      description: 'op2'
    };
    const op3: TransactionOperation = {
      execute: vi.fn(),
      rollback: vi.fn(),
      description: 'op3'
    };

    manager.addOperation(op1);
    manager.addOperation(op2); // This one fails
    manager.addOperation(op3); // Should not run

    const result = await manager.execute();

    expect(result.success).toBe(false);
    expect(result.error).toBe('fail');

    // Check execution order
    expect(op1.execute).toHaveBeenCalled();
    expect(op2.execute).toHaveBeenCalled();
    expect(op3.execute).not.toHaveBeenCalled();

    // Check rollback
    // op2 failed, so it might not be in executedOperations depending on implementation.
    // Let's check the implementation:
    // try {
    //   for (const operation of this.operations) {
    //     console.log(`Executing: ${operation.description}`);
    //     const result = await operation.execute();
    //     results.push(result);
    //     this.executedOperations.push(operation); // Pushed AFTER success
    //   }
    // }

    // So op2 fails, it is NOT pushed to executedOperations. Only op1 is rolled back.
    expect(op1.rollback).toHaveBeenCalled();
    expect(op2.rollback).not.toHaveBeenCalled();
    expect(op3.rollback).not.toHaveBeenCalled();
  });
});
