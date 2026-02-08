import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, LogLevel } from '../logger';

describe('Logger', () => {
  beforeEach(() => {
    // Reset console spies
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('should verify Sentry integration in production', () => {
    vi.stubEnv('MODE', 'production');

    const sentryCaptureMessage = vi.fn();
    const sentryCaptureException = vi.fn();

    vi.stubGlobal('window', {
      Sentry: {
        captureMessage: sentryCaptureMessage,
        captureException: sentryCaptureException
      }
    });

    logger.warn('Test warning');
    expect(sentryCaptureMessage).toHaveBeenCalled();
    expect(sentryCaptureMessage).toHaveBeenCalledWith('Test warning', expect.objectContaining({
      level: 'warn'
    }));

    logger.error('Test error', { foo: 'bar' });
    expect(sentryCaptureException).toHaveBeenCalled();
    expect(sentryCaptureException).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({
      extra: expect.objectContaining({ foo: 'bar' })
    }));
  });

  it('should verify LogRocket integration in production', () => {
    vi.stubEnv('MODE', 'production');

    const logRocketCaptureException = vi.fn();

    vi.stubGlobal('window', {
      LogRocket: {
        captureException: logRocketCaptureException,
        log: vi.fn()
      }
    });

    const context = { userId: '123' };
    logger.error('Test error for LogRocket', context);
    expect(logRocketCaptureException).toHaveBeenCalled();
    expect(logRocketCaptureException).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({
      extra: context
    }));
  });

  it('should not throw if external service is missing in production', () => {
    vi.stubEnv('MODE', 'production');
    vi.stubGlobal('window', {});

    expect(() => logger.warn('Warning with no service')).not.toThrow();
    expect(() => logger.error('Error with no service')).not.toThrow();
  });
});
