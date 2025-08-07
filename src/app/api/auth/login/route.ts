/**
 * SOVREN AI AUTHENTICATION LOGIN ENDPOINT
 * Secure login with comprehensive error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { authSystem } from '@/lib/auth/AuthenticationSystem';
import { withErrorHandling } from '@/lib/middleware/ErrorHandlingMiddleware';
import { ErrorHandler, ErrorCategory, ErrorSeverity } from '@/lib/errors/ErrorHandler';
import { container, SERVICE_IDENTIFIERS } from '@/lib/di/DIContainer';

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    tier: 'SMB' | 'ENTERPRISE' | 'FOUNDER';
  };
  expiresAt?: string;
  error?: string;
}

// Login handler with comprehensive error handling
async function loginHandler(request: NextRequest): Promise<LoginResponse> {
  const errorHandler = container.resolve<ErrorHandler>(SERVICE_IDENTIFIERS.ERROR_HANDLER);

  // Parse and validate request
  const body: LoginRequest = await request.json();

  // Validate required fields
  if (!body.email || !body.password) {
    throw errorHandler.createError(
      'MISSING_CREDENTIALS',
      'Email and password are required',
      ErrorCategory.VALIDATION,
      ErrorSeverity.MEDIUM,
      {},
      {
        userMessage: 'Please provide both email and password.',
        suggestedActions: ['Enter your email address', 'Enter your password']
      }
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    throw errorHandler.createError(
      'INVALID_EMAIL_FORMAT',
      'Invalid email format provided',
      ErrorCategory.VALIDATION,
      ErrorSeverity.MEDIUM,
      {},
      {
        userMessage: 'Please enter a valid email address.',
        suggestedActions: ['Check email format (example@domain.com)']
      }
    );
  }

  // Validate password strength (basic check)
  if (body.password.length < 8) {
    throw errorHandler.createError(
      'WEAK_PASSWORD',
      'Password must be at least 8 characters long',
      ErrorCategory.VALIDATION,
      ErrorSeverity.MEDIUM,
      {},
      {
        userMessage: 'Password must be at least 8 characters long.',
        suggestedActions: ['Use a stronger password with at least 8 characters']
      }
    );
  }

  // Authenticate user with comprehensive error handling
  const authResult = await errorHandler.handleAsync(
    () => authSystem.authenticate(body.email, body.password),
    { additionalData: { email: body.email } },
    {
      retries: 2,
      retryDelay: 1000,
      fallback: async () => {
        throw errorHandler.createError(
          'AUTH_SERVICE_UNAVAILABLE',
          'Authentication service is temporarily unavailable',
          ErrorCategory.EXTERNAL_SERVICE,
          ErrorSeverity.HIGH,
          {},
          {
            userMessage: 'Authentication service is temporarily unavailable. Please try again later.',
            suggestedActions: ['Wait a few minutes and try again', 'Contact support if problem persists']
          }
        );
      }
    }
  );

  if (!authResult.success) {
    throw errorHandler.createError(
      'AUTHENTICATION_FAILED',
      authResult.error || 'Invalid credentials provided',
      ErrorCategory.AUTHENTICATION,
      ErrorSeverity.HIGH,
      { additionalData: { email: body.email } },
      {
        userMessage: 'Invalid email or password.',
        suggestedActions: ['Check your credentials', 'Reset password if needed']
      }
    );
  }

  // Calculate token expiration
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + (body.rememberMe ? 24 * 7 : 24));

  return {
    success: true,
    token: authResult.token!,
    user: {
      id: authResult.user!.id,
      email: authResult.user!.email,
      name: authResult.user!.name,
      tier: authResult.user!.tier
    },
    expiresAt: expiresAt.toISOString()
  };
}

// Validation function for login requests
function validateLoginRequest(body: unknown): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    errors.push('Request body must be a valid JSON object');
    return { valid: false, errors };
  }

  const loginBody = body as Partial<LoginRequest>;

  if (!loginBody.email) {
    errors.push('Email is required');
  } else if (typeof loginBody.email !== 'string') {
    errors.push('Email must be a string');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginBody.email)) {
    errors.push('Email must be a valid email address');
  }

  if (!loginBody.password) {
    errors.push('Password is required');
  } else if (typeof loginBody.password !== 'string') {
    errors.push('Password must be a string');
  } else if (loginBody.password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (loginBody.rememberMe !== undefined && typeof loginBody.rememberMe !== 'boolean') {
    errors.push('RememberMe must be a boolean');
  }

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

// Export POST handler with comprehensive error handling
export const POST = withErrorHandling(loginHandler, {
  endpoint: '/api/auth/login',
  requireAuth: false,
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5 // 5 attempts per 15 minutes
  },
  validation: validateLoginRequest
});

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}
