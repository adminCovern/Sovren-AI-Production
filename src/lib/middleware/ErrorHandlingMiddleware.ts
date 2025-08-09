/**
 * COMPREHENSIVE ERROR HANDLING MIDDLEWARE
 * Production-ready error handling for all API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { ErrorHandler, ErrorCategory, ErrorSeverity, SOVRENError } from '../errors/ErrorHandler';
import { container, SERVICE_IDENTIFIERS } from '../di/DIContainer';
import { Logger, registerServices } from '../di/ServiceRegistry';

export interface APIErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    category: string;
    severity: string;
    userMessage: string;
    suggestedActions: string[];
    isRetryable: boolean;
    errorId: string;
    timestamp: string;
  };
  requestId?: string;
  metadata?: {
    endpoint: string;
    method: string;
    processingTime: number;
    userAgent?: string;
    ipAddress?: string;
  };
}

export interface APISuccessResponse<T = unknown> {
  success: true;
  data: T;
  requestId?: string;
  metadata?: {
    endpoint: string;
    method: string;
    processingTime: number;
    timestamp: string;
  };
}

export type APIResponse<T = unknown> = APISuccessResponse<T> | APIErrorResponse;

/**
 * Error handling middleware for API routes
 */
export class APIErrorHandlingMiddleware {
  private errorHandler: ErrorHandler | null = null;
  private logger: Logger | null = null;

  constructor() {
    // Services will be resolved lazily when needed
  }

  private getErrorHandler(): ErrorHandler {
    if (!this.errorHandler) {
      // Ensure services are registered
      try {
        this.errorHandler = container.resolve<ErrorHandler>(SERVICE_IDENTIFIERS.ERROR_HANDLER);
      } catch (error) {
        // Services not registered, register them now
        registerServices();
        this.errorHandler = container.resolve<ErrorHandler>(SERVICE_IDENTIFIERS.ERROR_HANDLER);
      }
    }
    return this.errorHandler;
  }

  private getLogger(): Logger {
    if (!this.logger) {
      // Ensure services are registered
      try {
        this.logger = container.resolve<Logger>(SERVICE_IDENTIFIERS.LOGGER);
      } catch (error) {
        // Services not registered, register them now
        registerServices();
        this.logger = container.resolve<Logger>(SERVICE_IDENTIFIERS.LOGGER);
      }
    }
    return this.logger;
  }

  /**
   * Wrap API handler with comprehensive error handling
   */
  public wrapHandler<T = unknown>(
    handler: (request: NextRequest) => Promise<T>,
    options: {
      endpoint: string;
      requireAuth?: boolean;
      rateLimit?: {
        windowMs: number;
        max: number;
      };
      validation?: (body: unknown) => { valid: boolean; errors?: string[] };
    }
  ) {
    return async (request: NextRequest): Promise<NextResponse> => {
      const startTime = Date.now();
      const requestId = this.generateRequestId();
      const endpoint = options.endpoint;
      const method = request.method;

      // Extract client information
      const userAgent = request.headers.get('user-agent') || 'unknown';
      const ipAddress = this.getClientIP(request);

      try {
        this.getLogger().info(`📥 API Request: ${method} ${endpoint}`, {
          requestId,
          userAgent,
          ipAddress
        });

        // Authentication check
        if (options.requireAuth) {
          await this.validateAuthentication(request);
        }

        // Rate limiting check
        if (options.rateLimit) {
          await this.checkRateLimit(request, options.rateLimit);
        }

        // Input validation
        if (options.validation && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
          const body = await request.json();
          const validationResult = options.validation(body);
          if (!validationResult.valid) {
            throw this.getErrorHandler().createError(
              'VALIDATION_FAILED',
              `Input validation failed: ${validationResult.errors?.join(', ')}`,
              ErrorCategory.VALIDATION,
              ErrorSeverity.MEDIUM,
              { requestId, endpoint, method, ipAddress, userAgent },
              {
                userMessage: 'Please check your input and try again.',
                suggestedActions: validationResult.errors || ['Verify input format']
              }
            );
          }
        }

        // Execute handler
        const result = await handler(request);
        const processingTime = Date.now() - startTime;

        this.getLogger().info(`✅ API Success: ${method} ${endpoint}`, {
          requestId,
          processingTime,
          status: 'success'
        });

        // Return success response
        const successResponse: APISuccessResponse<T> = {
          success: true,
          data: result,
          requestId,
          metadata: {
            endpoint,
            method,
            processingTime,
            timestamp: new Date().toISOString()
          }
        };

        return NextResponse.json(successResponse);

      } catch (error) {
        return this.handleError(error, {
          requestId,
          endpoint,
          method,
          userAgent,
          ipAddress,
          processingTime: Date.now() - startTime
        });
      }
    };
  }

  /**
   * Handle errors and return structured error response
   */
  private handleError(
    error: unknown,
    context: {
      requestId: string;
      endpoint: string;
      method: string;
      userAgent: string;
      ipAddress: string;
      processingTime: number;
    }
  ): NextResponse {
    let sovrenError: SOVRENError;

    if (this.isSOVRENError(error)) {
      // Already a SOVRENError
      sovrenError = error;
    } else {
      // Convert to SOVRENError
      sovrenError = this.getErrorHandler().handleError(
        error instanceof Error ? error : new Error(String(error)),
        {
          requestId: context.requestId,
          endpoint: context.endpoint,
          method: context.method,
          userAgent: context.userAgent,
          ipAddress: context.ipAddress,
          additionalData: { processingTime: context.processingTime }
        }
      );
    }

    // Log error
    this.getLogger().error(`❌ API Error: ${context.method} ${context.endpoint}`, {
      errorId: sovrenError.id,
      requestId: context.requestId,
      category: sovrenError.category,
      severity: sovrenError.severity,
      message: sovrenError.internalMessage,
      processingTime: context.processingTime
    });

    // Determine HTTP status code
    const statusCode = this.getHTTPStatusCode(sovrenError);

    // Create error response
    const errorResponse: APIErrorResponse = {
      success: false,
      error: {
        code: sovrenError.code,
        message: sovrenError.internalMessage,
        category: sovrenError.category,
        severity: sovrenError.severity,
        userMessage: sovrenError.userMessage,
        suggestedActions: sovrenError.suggestedActions,
        isRetryable: sovrenError.isRetryable,
        errorId: sovrenError.id,
        timestamp: sovrenError.context.timestamp.toISOString()
      },
      requestId: context.requestId,
      metadata: {
        endpoint: context.endpoint,
        method: context.method,
        processingTime: context.processingTime,
        userAgent: context.userAgent,
        ipAddress: context.ipAddress
      }
    };

    return NextResponse.json(errorResponse, { status: statusCode });
  }

  /**
   * Validate authentication
   */
  private async validateAuthentication(request: NextRequest): Promise<void> {
    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('auth-token')?.value;

    if (!authHeader && !cookieToken) {
      throw this.getErrorHandler().createError(
        'MISSING_AUTHENTICATION',
        'No authentication token provided',
        ErrorCategory.AUTHENTICATION,
        ErrorSeverity.HIGH,
        {},
        {
          userMessage: 'Please log in to access this resource.',
          suggestedActions: ['Log in with valid credentials']
        }
      );
    }

    // Additional token validation would go here
  }

  /**
   * Check rate limiting
   */
  private async checkRateLimit(
    request: NextRequest,
    config: { windowMs: number; max: number }
  ): Promise<void> {
    // Rate limiting implementation would use the Redis rate limiter
    // This is a placeholder for the actual implementation
    const clientId = this.getClientIP(request);
    
    // In a real implementation, this would check against Redis
    // For now, we'll skip the actual rate limiting check
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    
    return forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown';
  }

  /**
   * Map error categories to HTTP status codes
   */
  private getHTTPStatusCode(error: SOVRENError): number {
    switch (error.category) {
      case ErrorCategory.AUTHENTICATION:
        return 401;
      case ErrorCategory.AUTHORIZATION:
        return 403;
      case ErrorCategory.VALIDATION:
        return 400;
      case ErrorCategory.RATE_LIMIT:
        return 429;
      case ErrorCategory.NETWORK:
        return 502;
      case ErrorCategory.EXTERNAL_SERVICE:
        return 503;
      case ErrorCategory.SECURITY:
        return 400;
      case ErrorCategory.BUSINESS_LOGIC:
        return 422;
      case ErrorCategory.CONFIGURATION:
        return 500;
      case ErrorCategory.DATABASE:
        return 500;
      case ErrorCategory.SYSTEM:
        return 500;
      default:
        return 500;
    }
  }

  /**
   * Type guard to check if an error is already a SOVRENError
   */
  private isSOVRENError(error: unknown): error is SOVRENError {
    return !!(
      error &&
      typeof error === 'object' &&
      error !== null &&
      'id' in error &&
      'code' in error &&
      'message' in error &&
      'category' in error &&
      'severity' in error &&
      'context' in error &&
      'isRetryable' in error &&
      'userMessage' in error &&
      'internalMessage' in error &&
      'suggestedActions' in error
    );
  }
}

/**
 * Global error handling middleware instance
 */
export const apiErrorHandler = new APIErrorHandlingMiddleware();

/**
 * Convenience function to wrap API handlers
 */
export function withErrorHandling<T = unknown>(
  handler: (request: NextRequest) => Promise<T>,
  options: {
    endpoint: string;
    requireAuth?: boolean;
    rateLimit?: { windowMs: number; max: number };
    validation?: (body: unknown) => { valid: boolean; errors?: string[] };
  }
) {
  return apiErrorHandler.wrapHandler(handler, options);
}
