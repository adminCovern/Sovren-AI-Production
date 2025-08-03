/**
 * SOVREN AI PRODUCTION MIDDLEWARE
 * Next.js middleware for security, rate limiting, and request processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { securityMiddleware } from './middleware/security';
import { rateLimiters, getClientId } from './middleware/rateLimit';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log(`🔒 Middleware processing: ${request.method} ${pathname}`);

  try {
    // 1. Security middleware
    const securityResult = await securityMiddleware.handle(request);
    if (securityResult) {
      console.log(`🚫 Security middleware blocked request: ${pathname}`);
      return securityResult;
    }

    // 2. Route-specific rate limiting
    const rateLimitResult = await handleRateLimiting(request);
    if (rateLimitResult) {
      console.log(`⏱️ Rate limit exceeded for: ${pathname}`);
      return rateLimitResult;
    }

    // 3. API route processing
    if (pathname.startsWith('/api/')) {
      return await handleAPIRoute(request);
    }

    // 4. Static asset optimization
    if (pathname.startsWith('/_next/') || pathname.includes('.')) {
      return await handleStaticAssets(request);
    }

    // 5. Page route processing
    return await handlePageRoute(request);

  } catch (error) {
    console.error('❌ Middleware error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * Handle rate limiting for different endpoints
 */
async function handleRateLimiting(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  const clientId = getClientId(request);

  let rateLimiter;
  
  // Select appropriate rate limiter
  if (pathname.startsWith('/api/tts')) {
    rateLimiter = rateLimiters.tts;
  } else if (pathname.startsWith('/api/auth')) {
    rateLimiter = rateLimiters.auth;
  } else if (pathname.startsWith('/api/email')) {
    rateLimiter = rateLimiters.email;
  } else if (pathname.startsWith('/api/crm')) {
    rateLimiter = rateLimiters.crm;
  } else if (pathname.startsWith('/api/')) {
    rateLimiter = rateLimiters.api;
  } else {
    return null; // No rate limiting for non-API routes
  }

  const { allowed, info } = await rateLimiter.checkLimit(clientId);

  if (!allowed) {
    return new NextResponse('Rate limit exceeded', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': info.limit.toString(),
        'X-RateLimit-Remaining': info.remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(info.resetTime.getTime() / 1000).toString(),
        'Retry-After': Math.ceil((info.resetTime.getTime() - Date.now()) / 1000).toString()
      }
    });
  }

  // Add rate limit headers to successful requests
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', info.limit.toString());
  response.headers.set('X-RateLimit-Remaining', info.remaining.toString());
  response.headers.set('X-RateLimit-Reset', Math.ceil(info.resetTime.getTime() / 1000).toString());

  return null;
}

/**
 * Handle API route requests
 */
async function handleAPIRoute(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  // Add API-specific headers
  const response = NextResponse.next();
  
  // CORS headers for API routes
  const origin = request.headers.get('origin');
  if (origin && isAllowedOrigin(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // API versioning header
  response.headers.set('X-API-Version', '1.0');
  
  // Request ID for tracing
  const requestId = generateRequestId();
  response.headers.set('X-Request-ID', requestId);

  // Log API request
  console.log(`📡 API Request: ${request.method} ${pathname} [${requestId}]`);

  return null;
}

/**
 * Handle static asset requests
 */
async function handleStaticAssets(request: NextRequest): Promise<NextResponse | null> {
  const response = NextResponse.next();

  // Cache headers for static assets
  if (request.nextUrl.pathname.includes('/_next/static/')) {
    // Long cache for Next.js static assets (immutable)
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (request.nextUrl.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    // Medium cache for other static assets
    response.headers.set('Cache-Control', 'public, max-age=86400');
  }

  // Security headers for assets
  response.headers.set('X-Content-Type-Options', 'nosniff');

  return null;
}

/**
 * Handle page route requests
 */
async function handlePageRoute(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  // Redirect root to app
  if (pathname === '/') {
    // Allow root access - it's the main app
    return null;
  }

  // Protected page routes
  const protectedPages = ['/dashboard', '/settings', '/admin'];
  
  if (protectedPages.some(page => pathname.startsWith(page))) {
    // Check authentication for protected pages
    const authHeader = request.headers.get('authorization');
    const authCookie = request.cookies.get('auth-token');
    
    if (!authHeader && !authCookie) {
      // Redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return null;
}

/**
 * Check if origin is allowed
 */
function isAllowedOrigin(origin: string): boolean {
  const allowedOrigins = [
    'https://sovren.ai',
    'https://app.sovren.ai',
    'https://api.sovren.ai'
  ];

  // Allow localhost in development
  if (process.env.NODE_ENV === 'development' && 
      origin.startsWith('http://localhost')) {
    return true;
  }

  return allowedOrigins.includes(origin);
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Middleware configuration
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
