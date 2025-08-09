/**
 * COMPREHENSIVE ERROR HANDLING SYSTEM
 * Production-ready error handling with categorization, logging, and recovery
 */

import { Logger } from '../di/ServiceRegistry';

export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  SYSTEM = 'SYSTEM',
  SECURITY = 'SECURITY',
  RATE_LIMIT = 'RATE_LIMIT',
  CONFIGURATION = 'CONFIGURATION',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  ipAddress?: string;
  endpoint?: string;
  method?: string;
  timestamp: Date;
  stackTrace?: string;
  additionalData?: Record<string, any>;
}

export interface SOVRENError {
  id: string;
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context: ErrorContext;
  isRetryable: boolean;
  userMessage: string;
  internalMessage: string;
  suggestedActions: string[];
  originalError?: Error;
}

export class ErrorHandler {
  private logger: Logger;
  private errorStore: Map<string, SOVRENError> = new Map();
  private errorCounts: Map<string, number> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Create a standardized error
   */
  createError(
    code: string,
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context: Partial<ErrorContext> = {},
    options: {
      isRetryable?: boolean;
      userMessage?: string;
      suggestedActions?: string[];
      originalError?: Error;
    } = {}
  ): SOVRENError {
    const errorId = this.generateErrorId();
    
    const error: SOVRENError = {
      id: errorId,
      code,
      message,
      category,
      severity,
      context: {
        timestamp: new Date(),
        ...context
      },
      isRetryable: options.isRetryable ?? this.isRetryableByCategory(category),
      userMessage: options.userMessage ?? this.generateUserMessage(category, message),
      internalMessage: message,
      suggestedActions: options.suggestedActions ?? this.generateSuggestedActions(category),
      originalError: options.originalError
    };

    // Store error for tracking
    this.errorStore.set(errorId, error);
    this.incrementErrorCount(code);

    // Log error
    this.logError(error);

    return error;
  }

  /**
   * Handle and process an error
   */
  handleError(error: Error | SOVRENError, context: Partial<ErrorContext> = {}): SOVRENError {
    if (this.isSOVRENError(error)) {
      return error;
    }

    // Convert regular Error to SOVRENError
    const category = this.categorizeError(error);
    const severity = this.determineSeverity(error, category);

    return this.createError(
      this.generateErrorCode(category),
      error.message,
      category,
      severity,
      {
        ...context,
        stackTrace: error.stack
      },
      {
        originalError: error
      }
    );
  }

  /**
   * Handle async operation with error handling
   */
  async handleAsync<T>(
    operation: () => Promise<T>,
    context: Partial<ErrorContext> = {},
    options: {
      retries?: number;
      retryDelay?: number;
      fallback?: () => Promise<T>;
    } = {}
  ): Promise<T> {
    const { retries = 0, retryDelay = 1000, fallback } = options;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        const sovrenError = this.handleError(lastError, {
          ...context,
          additionalData: { attempt: attempt + 1, maxRetries: retries + 1 }
        });

        // Don't retry if not retryable or on last attempt
        if (!sovrenError.isRetryable || attempt === retries) {
          break;
        }

        // Wait before retry
        if (retryDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
        }
      }
    }

    // Try fallback if available
    if (fallback) {
      try {
        return await fallback();
      } catch (fallbackError) {
        this.logger.warn('Fallback operation also failed:', fallbackError);
      }
    }

    // Throw the last error
    throw this.handleError(lastError!, context);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    topErrorCodes: Array<{ code: string; count: number }>;
  } {
    const errorsByCategory: Record<ErrorCategory, number> = {} as any;
    const errorsBySeverity: Record<ErrorSeverity, number> = {} as any;

    // Initialize counters
    Object.values(ErrorCategory).forEach(category => {
      errorsByCategory[category] = 0;
    });
    Object.values(ErrorSeverity).forEach(severity => {
      errorsBySeverity[severity] = 0;
    });

    // Count errors
    for (const error of this.errorStore.values()) {
      errorsByCategory[error.category]++;
      errorsBySeverity[error.severity]++;
    }

    // Get top error codes
    const topErrorCodes = Array.from(this.errorCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([code, count]) => ({ code, count }));

    return {
      totalErrors: this.errorStore.size,
      errorsByCategory,
      errorsBySeverity,
      topErrorCodes
    };
  }

  /**
   * Clear old errors (for memory management)
   */
  clearOldErrors(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = new Date(Date.now() - maxAge);
    
    for (const [id, error] of this.errorStore.entries()) {
      if (error.context.timestamp < cutoff) {
        this.errorStore.delete(id);
      }
    }
  }

  // Private methods
  private generateErrorId(): string {
    return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorCode(category: ErrorCategory): string {
    const timestamp = Date.now().toString().slice(-6);
    return `${category}_${timestamp}`;
  }

  private isSOVRENError(error: unknown): error is SOVRENError {
    return !!(error && typeof error === 'object' && error !== null && 'id' in error && 'category' in error);
  }

  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (message.includes('unauthorized') || message.includes('authentication')) {
      return ErrorCategory.AUTHENTICATION;
    }
    if (message.includes('forbidden') || message.includes('permission')) {
      return ErrorCategory.AUTHORIZATION;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorCategory.VALIDATION;
    }
    if (message.includes('network') || message.includes('connection') || name.includes('network')) {
      return ErrorCategory.NETWORK;
    }
    if (message.includes('database') || message.includes('sql') || message.includes('query')) {
      return ErrorCategory.DATABASE;
    }
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return ErrorCategory.RATE_LIMIT;
    }
    if (message.includes('security') || message.includes('malicious')) {
      return ErrorCategory.SECURITY;
    }
    if (message.includes('config') || message.includes('environment')) {
      return ErrorCategory.CONFIGURATION;
    }

    return ErrorCategory.UNKNOWN;
  }

  private determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    // Critical errors
    if (category === ErrorCategory.SECURITY || category === ErrorCategory.SYSTEM) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity errors
    if (category === ErrorCategory.AUTHENTICATION || category === ErrorCategory.DATABASE) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity errors
    if (category === ErrorCategory.NETWORK || category === ErrorCategory.EXTERNAL_SERVICE) {
      return ErrorSeverity.MEDIUM;
    }

    // Default to low
    return ErrorSeverity.LOW;
  }

  private isRetryableByCategory(category: ErrorCategory): boolean {
    const retryableCategories = [
      ErrorCategory.NETWORK,
      ErrorCategory.EXTERNAL_SERVICE,
      ErrorCategory.RATE_LIMIT
    ];
    return retryableCategories.includes(category);
  }

  private generateUserMessage(category: ErrorCategory, internalMessage: string): string {
    const userMessages: Record<ErrorCategory, string> = {
      [ErrorCategory.AUTHENTICATION]: 'Please check your login credentials and try again.',
      [ErrorCategory.AUTHORIZATION]: 'You do not have permission to perform this action.',
      [ErrorCategory.VALIDATION]: 'Please check your input and try again.',
      [ErrorCategory.NETWORK]: 'Network connection issue. Please try again.',
      [ErrorCategory.DATABASE]: 'A temporary issue occurred. Please try again later.',
      [ErrorCategory.EXTERNAL_SERVICE]: 'External service is temporarily unavailable.',
      [ErrorCategory.BUSINESS_LOGIC]: 'Unable to complete the requested operation.',
      [ErrorCategory.SYSTEM]: 'A system error occurred. Please contact support.',
      [ErrorCategory.SECURITY]: 'Security validation failed.',
      [ErrorCategory.RATE_LIMIT]: 'Too many requests. Please wait and try again.',
      [ErrorCategory.CONFIGURATION]: 'System configuration issue. Please contact support.',
      [ErrorCategory.UNKNOWN]: 'An unexpected error occurred. Please try again.'
    };

    return userMessages[category] ?? userMessages[ErrorCategory.UNKNOWN];
  }

  private generateSuggestedActions(category: ErrorCategory): string[] {
    const actions: Record<ErrorCategory, string[]> = {
      [ErrorCategory.AUTHENTICATION]: ['Verify credentials', 'Reset password if needed'],
      [ErrorCategory.AUTHORIZATION]: ['Contact administrator for access'],
      [ErrorCategory.VALIDATION]: ['Check input format', 'Verify required fields'],
      [ErrorCategory.NETWORK]: ['Check internet connection', 'Retry request'],
      [ErrorCategory.DATABASE]: ['Retry operation', 'Contact support if persistent'],
      [ErrorCategory.EXTERNAL_SERVICE]: ['Wait and retry', 'Check service status'],
      [ErrorCategory.BUSINESS_LOGIC]: ['Review request parameters', 'Contact support'],
      [ErrorCategory.SYSTEM]: ['Contact technical support'],
      [ErrorCategory.SECURITY]: ['Review security settings', 'Contact administrator'],
      [ErrorCategory.RATE_LIMIT]: ['Wait before retrying', 'Reduce request frequency'],
      [ErrorCategory.CONFIGURATION]: ['Contact system administrator'],
      [ErrorCategory.UNKNOWN]: ['Retry operation', 'Contact support if persistent']
    };

    return actions[category] ?? actions[ErrorCategory.UNKNOWN];
  }

  private logError(error: SOVRENError): void {
    const logData = {
      errorId: error.id,
      code: error.code,
      category: error.category,
      severity: error.severity,
      message: error.internalMessage,
      context: error.context,
      isRetryable: error.isRetryable
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        this.logger.error(`CRITICAL ERROR: ${error.message}`, logData);
        break;
      case ErrorSeverity.HIGH:
        this.logger.error(`HIGH SEVERITY: ${error.message}`, logData);
        break;
      case ErrorSeverity.MEDIUM:
        this.logger.warn(`MEDIUM SEVERITY: ${error.message}`, logData);
        break;
      case ErrorSeverity.LOW:
        this.logger.info(`LOW SEVERITY: ${error.message}`, logData);
        break;
    }
  }

  private incrementErrorCount(code: string): void {
    const current = this.errorCounts.get(code) || 0;
    this.errorCounts.set(code, current + 1);
  }
}

// Global error handler instance
let globalErrorHandler: ErrorHandler | null = null;

export function initializeErrorHandler(logger: Logger): ErrorHandler {
  globalErrorHandler = new ErrorHandler(logger);
  return globalErrorHandler;
}

export function getErrorHandler(): ErrorHandler {
  if (!globalErrorHandler) {
    throw new Error('Error handler not initialized. Call initializeErrorHandler first.');
  }
  return globalErrorHandler;
}
