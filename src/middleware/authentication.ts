import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDatabaseManager } from '@/database/connection';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

/**
 * Production Authentication Middleware
 * IMMEDIATE DEPLOYMENT - Complete security implementation
 * NO PLACEHOLDERS - Full production-grade authentication
 */

export interface AuthenticatedUser {
  id: string;
  email: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  permissions: string[];
}

export interface AuthenticationResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
  rateLimited?: boolean;
}

// Redis client for rate limiting
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3
});

// Rate limiter configuration
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'sovren_api_limit',
  points: parseInt(process.env.RATE_LIMIT_MAX || '100'), // Number of requests
  duration: parseInt(process.env.RATE_LIMIT_WINDOW || '900'), // Per 15 minutes
  blockDuration: 900, // Block for 15 minutes if limit exceeded
});

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

/**
 * Extract JWT token from request
 */
function extractToken(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookie
  const tokenCookie = request.cookies.get('auth_token');
  if (tokenCookie) {
    return tokenCookie.value;
  }

  // Check query parameter (less secure, for specific use cases)
  const tokenParam = request.nextUrl.searchParams.get('token');
  if (tokenParam) {
    return tokenParam;
  }

  return null;
}

/**
 * Verify JWT token
 */
async function verifyToken(token: string): Promise<any> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as any;
    
    // Check token expiration
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      throw new Error('Token expired');
    }

    return decoded;
    
  } catch (error) {
    throw new Error(`Invalid token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get user from database
 */
async function getUserFromDatabase(userId: string): Promise<AuthenticatedUser | null> {
  try {
    const db = getDatabaseManager();
    const result = await db.query(`
      SELECT id, email, subscription_tier, subscription_status, metadata
      FROM users 
      WHERE id = $1 AND subscription_status = 'active'
    `, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    
    // Determine permissions based on subscription tier
    const permissions = getPermissionsForTier(user.subscription_tier);

    return {
      id: user.id,
      email: user.email,
      subscriptionTier: user.subscription_tier,
      subscriptionStatus: user.subscription_status,
      permissions
    };

  } catch (error) {
    console.error('❌ Database error in getUserFromDatabase:', error);
    return null;
  }
}

/**
 * Get permissions for subscription tier
 */
function getPermissionsForTier(tier: string): string[] {
  const basePermissions = [
    'shadowboard:basic',
    'executives:cfo',
    'executives:cmo',
    'executives:cto',
    'voice:synthesis',
    'analytics:basic'
  ];

  const plusPermissions = [
    ...basePermissions,
    'executives:clo',
    'executives:coo',
    'executives:chro',
    'executives:cso',
    'coordination:multi_executive',
    'features:advanced',
    'analytics:advanced',
    'performance:optimization'
  ];

  switch (tier) {
    case 'sovren_proof_plus':
      return plusPermissions;
    case 'sovren_proof':
    default:
      return basePermissions;
  }
}

/**
 * Check rate limiting
 */
async function checkRateLimit(identifier: string): Promise<boolean> {
  try {
    await rateLimiter.consume(identifier);
    return true;
  } catch (rateLimiterRes) {
    // Rate limit exceeded
    return false;
  }
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(request: NextRequest, user?: AuthenticatedUser): string {
  // Use user ID if authenticated, otherwise use IP
  if (user) {
    return `user:${user.id}`;
  }

  // Get IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  
  return `ip:${ip}`;
}

/**
 * Log authentication attempt
 */
async function logAuthAttempt(
  request: NextRequest, 
  success: boolean, 
  userId?: string, 
  error?: string
): Promise<void> {
  try {
    const db = getDatabaseManager();
    
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const endpoint = request.nextUrl.pathname;

    await db.query(`
      INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id, 
        new_values, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      userId || null,
      success ? 'auth_success' : 'auth_failure',
      'authentication',
      endpoint,
      JSON.stringify({ success, error: error || null }),
      ip,
      userAgent
    ]);

  } catch (logError) {
    console.error('❌ Failed to log auth attempt:', logError);
  }
}

/**
 * Main authentication function
 */
export async function authenticate(request: NextRequest): Promise<AuthenticationResult> {
  try {
    // Extract token
    const token = extractToken(request);
    if (!token) {
      await logAuthAttempt(request, false, undefined, 'No token provided');
      return { success: false, error: 'No authentication token provided' };
    }

    // Verify token
    let decoded;
    try {
      decoded = await verifyToken(token);
    } catch (tokenError) {
      const errorMessage = tokenError instanceof Error ? tokenError.message : 'Token verification failed';
      await logAuthAttempt(request, false, undefined, errorMessage);
      return { success: false, error: errorMessage };
    }

    // Get user from database
    const user = await getUserFromDatabase(decoded.userId);
    if (!user) {
      await logAuthAttempt(request, false, decoded.userId, 'User not found or inactive');
      return { success: false, error: 'User not found or subscription inactive' };
    }

    // Check rate limiting
    const clientId = getClientIdentifier(request, user);
    const rateLimitOk = await checkRateLimit(clientId);
    if (!rateLimitOk) {
      await logAuthAttempt(request, false, user.id, 'Rate limit exceeded');
      return { success: false, error: 'Rate limit exceeded', rateLimited: true };
    }

    // Log successful authentication
    await logAuthAttempt(request, true, user.id);

    return { success: true, user };

  } catch (error: unknown) {
    console.error('❌ Authentication error:', error);
    await logAuthAttempt(request, false, undefined, error instanceof Error ? error.message : 'Authentication failed');
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Check if user has required permission
 */
export function hasPermission(user: AuthenticatedUser, permission: string): boolean {
  return user.permissions.includes(permission);
}

/**
 * Middleware wrapper for Next.js API routes
 */
export function withAuth(
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>,
  requiredPermission?: string
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const authResult = await authenticate(request);

      if (!authResult.success) {
        const status = authResult.rateLimited ? 429 : 401;
        return NextResponse.json(
          { error: authResult.error },
          { status }
        );
      }

      const user = authResult.user!;

      // Check required permission
      if (requiredPermission && !hasPermission(user, requiredPermission)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      // Call the actual handler
      return await handler(request, user);

    } catch (error: unknown) {
      console.error('❌ Auth middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Generate JWT token for user
 */
export function generateToken(user: { id: string; email: string }): string {
  const payload = {
    userId: user.id,
    email: user.email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };

  return jwt.sign(payload, JWT_SECRET!);
}

/**
 * Refresh token
 */
export async function refreshToken(oldToken: string): Promise<string | null> {
  try {
    const decoded = jwt.verify(oldToken, JWT_SECRET!, { ignoreExpiration: true }) as any;
    
    // Check if token is not too old (max 7 days)
    const tokenAge = Date.now() / 1000 - decoded.iat;
    if (tokenAge > 7 * 24 * 60 * 60) {
      return null;
    }

    // Get fresh user data
    const user = await getUserFromDatabase(decoded.userId);
    if (!user) {
      return null;
    }

    // Generate new token
    return generateToken({ id: user.id, email: user.email });

  } catch (error: unknown) {
    console.error('❌ Token refresh error:', error);
    return null;
  }
}
