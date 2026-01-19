// Comprehensive logging utility
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: any;
  userId?: string;
  sessionId?: string;
}

class Logger {
  private logLevel: LogLevel;
  private sessionId: string;
  private userId?: string;

  constructor() {
    this.logLevel = import.meta.env.MODE === 'production' ? LogLevel.WARN : LogLevel.DEBUG;
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  private createLogEntry(level: LogLevel, message: string, context?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      userId: this.userId,
      sessionId: this.sessionId,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const userInfo = entry.userId ? ` [User: ${entry.userId}]` : '';
    const contextInfo = entry.context ? ` [Context: ${JSON.stringify(entry.context)}]` : '';
    return `[${entry.timestamp}] ${levelName}${userInfo}: ${entry.message}${contextInfo}`;
  }

  private sendToExternalService(entry: LogEntry) {
    // In production, send to external logging service
    if (import.meta.env.MODE === 'production') {
      // TODO: Integrate with logging service (e.g., LogRocket, Sentry, etc.)
      // Example: logService.send(entry);
    }
  }

  debug(message: string, context?: any) {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
    console.debug(this.formatMessage(entry));
  }

  info(message: string, context?: any) {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const entry = this.createLogEntry(LogLevel.INFO, message, context);
    console.info(this.formatMessage(entry));
  }

  warn(message: string, context?: any) {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const entry = this.createLogEntry(LogLevel.WARN, message, context);
    console.warn(this.formatMessage(entry));
    this.sendToExternalService(entry);
  }

  error(message: string, context?: any) {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const entry = this.createLogEntry(LogLevel.ERROR, message, context);
    console.error(this.formatMessage(entry));
    this.sendToExternalService(entry);
  }

  // Specialized logging methods
  logUserAction(action: string, details?: any) {
    this.info(`User Action: ${action}`, details);
  }

  logApiCall(endpoint: string, method: string, duration?: number) {
    this.debug(`API Call: ${method} ${endpoint}`, { duration });
  }

  logError(error: Error, context?: any) {
    this.error(`Error: ${error.message}`, {
      stack: error.stack,
      name: error.name,
      ...context,
    });
  }

  logTransaction(type: string, amount: number, success: boolean) {
    this.info(`Transaction: ${type}`, {
      amount,
      success,
      timestamp: new Date().toISOString(),
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const logUserAction = (action: string, details?: any) => logger.logUserAction(action, details);
export const logError = (error: Error, context?: any) => logger.logError(error, context);
export const logTransaction = (type: string, amount: number, success: boolean) => logger.logTransaction(type, amount, success);