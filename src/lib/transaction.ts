// Transaction utility for atomic operations with rollback
export interface TransactionOperation {
  execute: () => Promise<any>;
  rollback: () => Promise<void>;
  description: string;
}

export interface TransactionResult {
  success: boolean;
  error?: string;
  results?: any[];
}

export class TransactionManager {
  private operations: TransactionOperation[] = [];
  private executedOperations: TransactionOperation[] = [];

  addOperation(operation: TransactionOperation) {
    this.operations.push(operation);
  }

  async execute(): Promise<TransactionResult> {
    this.executedOperations = [];
    const results: any[] = [];

    try {
      for (const operation of this.operations) {
        console.log(`Executing: ${operation.description}`);
        const result = await operation.execute();
        results.push(result);
        this.executedOperations.push(operation);
      }

      return { success: true, results };
    } catch (error: any) {
      console.error("Transaction failed, rolling back...", error);
      await this.rollback();
      return { success: false, error: error.message || "Transaction failed" };
    }
  }

  private async rollback(): Promise<void> {
    // Execute rollback operations in reverse order
    for (const operation of this.executedOperations.reverse()) {
      try {
        console.log(`Rolling back: ${operation.description}`);
        await operation.rollback();
      } catch (rollbackError) {
        console.error(`Rollback failed for ${operation.description}:`, rollbackError);
        // Continue with other rollbacks even if one fails
      }
    }
  }

  clear() {
    this.operations = [];
    this.executedOperations = [];
  }
}

// Retry utility with exponential backoff
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(`Operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};