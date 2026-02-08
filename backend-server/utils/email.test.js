import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import { loadEmailTemplate } from './email';

describe('loadEmailTemplate', () => {
  beforeEach(() => {
    // Clean up spies
    vi.restoreAllMocks();
  });

  it('should load template and replace variables', async () => {
    const templateContent = 'Hello {{USER_NAME}}, welcome to {{APP_NAME}}!';
    const variables = { USER_NAME: 'Alice', APP_NAME: 'Hostel Ledger' };

    // Spy on fs.promises.readFile
    // Note: fs.promises is an object. We spy on its readFile method.
    const readFileSpy = vi.spyOn(fs.promises, 'readFile').mockResolvedValue(templateContent);

    const result = await loadEmailTemplate('welcome', variables);

    expect(readFileSpy).toHaveBeenCalledTimes(1);

    // Verify path construction
    const calledPath = readFileSpy.mock.calls[0][0];
    expect(calledPath).toContain('email-templates');
    expect(calledPath).toContain('welcome.html');

    expect(result).toBe('Hello Alice, welcome to Hostel Ledger!');
  });

  it('should return null on error', async () => {
    const readFileSpy = vi.spyOn(fs.promises, 'readFile').mockRejectedValue(new Error('File not found'));

    // Suppress console.error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await loadEmailTemplate('nonexistent');

    expect(result).toBeNull();
    expect(readFileSpy).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
  });
});
