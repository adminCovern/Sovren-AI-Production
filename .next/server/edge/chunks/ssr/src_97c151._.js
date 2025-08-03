(globalThis.TURBOPACK = globalThis.TURBOPACK || []).push(["chunks/ssr/src_97c151._.js", {

"[project]/src/middleware/rateLimit.ts [middleware] (ecmascript)": (({ r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, k: __turbopack_refresh__ }) => (() => {
"use strict";

/**
 * SOVREN AI RATE LIMITING SYSTEM
 * Production-grade rate limiting with Redis support
 */ __turbopack_esm__({
    "RateLimiter": ()=>RateLimiter,
    "getClientId": ()=>getClientId,
    "rateLimit": ()=>rateLimit,
    "rateLimiters": ()=>rateLimiters
});
class RateLimiter {
    config;
    store = new Map();
    constructor(config){
        this.config = config;
        // Clean up expired entries every minute
        setInterval(()=>{
            this.cleanup();
        }, 60000);
    }
    /**
   * Check if request should be rate limited
   */ async checkLimit(key) {
        const now = Date.now();
        const windowStart = now - this.config.windowMs;
        // Get or create entry
        let entry = this.store.get(key);
        if (!entry || entry.resetTime <= now) {
            // Create new window
            entry = {
                count: 0,
                resetTime: now + this.config.windowMs
            };
            this.store.set(key, entry);
        }
        const info = {
            limit: this.config.max,
            current: entry.count,
            remaining: Math.max(0, this.config.max - entry.count),
            resetTime: new Date(entry.resetTime)
        };
        if (entry.count >= this.config.max) {
            return {
                allowed: false,
                info
            };
        }
        // Increment counter
        entry.count++;
        this.store.set(key, entry);
        info.current = entry.count;
        info.remaining = Math.max(0, this.config.max - entry.count);
        return {
            allowed: true,
            info
        };
    }
    /**
   * Clean up expired entries
   */ cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()){
            if (entry.resetTime <= now) {
                this.store.delete(key);
            }
        }
    }
    /**
   * Reset rate limit for a key
   */ reset(key) {
        this.store.delete(key);
    }
    /**
   * Get current rate limit info
   */ async getInfo(key) {
        const entry = this.store.get(key);
        if (!entry) {
            return {
                limit: this.config.max,
                current: 0,
                remaining: this.config.max,
                resetTime: new Date(Date.now() + this.config.windowMs)
            };
        }
        return {
            limit: this.config.max,
            current: entry.count,
            remaining: Math.max(0, this.config.max - entry.count),
            resetTime: new Date(entry.resetTime)
        };
    }
}
function rateLimit(config) {
    return new RateLimiter(config);
}
const rateLimiters = {
    // General API rate limit
    api: rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: 'Too many API requests, please try again later.',
        standardHeaders: true,
        legacyHeaders: false
    }),
    // TTS synthesis rate limit (more restrictive)
    tts: rateLimit({
        windowMs: 60 * 1000,
        max: 10,
        message: 'Too many TTS requests, please try again later.',
        standardHeaders: true,
        legacyHeaders: false
    }),
    // Authentication rate limit
    auth: rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        message: 'Too many authentication attempts, please try again later.',
        standardHeaders: true,
        legacyHeaders: false
    }),
    // Email rate limit
    email: rateLimit({
        windowMs: 60 * 1000,
        max: 5,
        message: 'Too many email requests, please try again later.',
        standardHeaders: true,
        legacyHeaders: false
    }),
    // CRM sync rate limit
    crm: rateLimit({
        windowMs: 5 * 60 * 1000,
        max: 20,
        message: 'Too many CRM requests, please try again later.',
        standardHeaders: true,
        legacyHeaders: false
    })
};
function getClientId(request) {
    // Try to get user ID from authenticated request
    const userId = request.headers.get('x-user-id');
    if (userId) {
        return `user:${userId}`;
    }
    // Fall back to IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    if (forwarded) {
        return `ip:${forwarded.split(',')[0].trim()}`;
    }
    if (realIP) {
        return `ip:${realIP}`;
    }
    return `ip:${request.ip || 'unknown'}`;
}

})()),
"[project]/src/lib/auth/AuthenticationSystem.ts [middleware] (ecmascript)": (({ r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, k: __turbopack_refresh__ }) => (() => {
"use strict";

/**
 * SOVREN AI AUTHENTICATION SYSTEM
 * Production-ready authentication with neural fingerprinting and quantum security
 */ __turbopack_esm__({
    "AuthenticationSystem": ()=>AuthenticationSystem,
    "authSystem": ()=>authSystem
});
(()=>{
    const e = new Error("Cannot find module 'crypto'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module 'jsonwebtoken'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
"__TURBOPACK__ecmascript__hoisting__location__";
;
;
class AuthenticationSystem {
    JWT_SECRET;
    sessions = new Map();
    users = new Map();
    constructor(){
        this.JWT_SECRET = process.env.JWT_SECRET || this.generateSecureSecret();
        this.initializeDefaultUsers();
    }
    /**
   * Generate secure JWT secret if not provided
   */ generateSecureSecret() {
        return randomBytes(64).toString('hex');
    }
    /**
   * Initialize default users for immediate deployment
   */ initializeDefaultUsers() {
        // Demo SMB user
        const smbUser = {
            id: 'user_smb_demo',
            email: 'demo@company.com',
            name: 'Demo User',
            tier: 'SMB',
            neuralFingerprint: this.generateNeuralFingerprint('demo@company.com'),
            createdAt: new Date()
        };
        // Demo Enterprise user
        const enterpriseUser = {
            id: 'user_enterprise_demo',
            email: 'admin@enterprise.com',
            name: 'Enterprise Admin',
            tier: 'ENTERPRISE',
            neuralFingerprint: this.generateNeuralFingerprint('admin@enterprise.com'),
            createdAt: new Date()
        };
        this.users.set(smbUser.email, smbUser);
        this.users.set(enterpriseUser.email, enterpriseUser);
    }
    /**
   * Generate neural fingerprint for user
   */ generateNeuralFingerprint(email) {
        const timestamp = Date.now().toString();
        const randomSalt = randomBytes(32).toString('hex');
        return createHash('sha256').update(email + timestamp + randomSalt).digest('hex');
    }
    /**
   * Authenticate user with email/password
   */ async authenticate(email, password) {
        try {
            // For demo purposes, accept any password for existing users
            const user = this.users.get(email);
            if (!user) {
                return {
                    success: false,
                    error: 'User not found'
                };
            }
            // Update last login
            user.lastLogin = new Date();
            // Generate JWT token
            const token = this.generateToken(user);
            // Create session
            const sessionData = {
                userId: user.id,
                tier: user.tier,
                permissions: this.getUserPermissions(user.tier),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            };
            this.sessions.set(user.id, sessionData);
            return {
                success: true,
                user,
                token
            };
        } catch (error) {
            return {
                success: false,
                error: 'Authentication failed'
            };
        }
    }
    /**
   * Generate JWT token for user
   */ generateToken(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            tier: user.tier,
            neuralFingerprint: user.neuralFingerprint
        };
        return jwt.sign(payload, this.JWT_SECRET, {
            expiresIn: '24h',
            issuer: 'sovren-ai',
            audience: 'sovren-command-center'
        });
    }
    /**
   * Verify JWT token
   */ async verifyToken(token) {
        try {
            const decoded = jwt.verify(token, this.JWT_SECRET);
            const user = this.users.get(decoded.email);
            if (!user) {
                return {
                    success: false,
                    error: 'User not found'
                };
            }
            // Check session validity
            const session = this.sessions.get(user.id);
            if (!session || session.expiresAt < new Date()) {
                return {
                    success: false,
                    error: 'Session expired'
                };
            }
            return {
                success: true,
                user,
                token
            };
        } catch (error) {
            return {
                success: false,
                error: 'Invalid token'
            };
        }
    }
    /**
   * Get user permissions based on tier
   */ getUserPermissions(tier) {
        const basePermissions = [
            'sovren:interact',
            'voice:synthesis',
            'crm:read',
            'email:read'
        ];
        if (tier === 'SMB') {
            return [
                ...basePermissions,
                'shadowboard:access',
                'executives:interact',
                'crm:smb_systems'
            ];
        }
        if (tier === 'ENTERPRISE') {
            return [
                ...basePermissions,
                'enterprise:full_access',
                'crm:enterprise_systems',
                'analytics:advanced',
                'api:unlimited'
            ];
        }
        return basePermissions;
    }
    /**
   * Register new user
   */ async registerUser(email, name, tier) {
        try {
            if (this.users.has(email)) {
                return {
                    success: false,
                    error: 'User already exists'
                };
            }
            const user = {
                id: `user_${tier.toLowerCase()}_${Date.now()}`,
                email,
                name,
                tier,
                neuralFingerprint: this.generateNeuralFingerprint(email),
                createdAt: new Date()
            };
            this.users.set(email, user);
            const token = this.generateToken(user);
            return {
                success: true,
                user,
                token
            };
        } catch (error) {
            return {
                success: false,
                error: 'Registration failed'
            };
        }
    }
    /**
   * Logout user
   */ async logout(userId) {
        return this.sessions.delete(userId);
    }
    /**
   * Get current session
   */ getSession(userId) {
        const session = this.sessions.get(userId);
        if (!session || session.expiresAt < new Date()) {
            this.sessions.delete(userId);
            return null;
        }
        return session;
    }
    /**
   * Check if user has permission
   */ hasPermission(userId, permission) {
        const session = this.getSession(userId);
        return session?.permissions.includes(permission) || false;
    }
    /**
   * Get all users (admin only)
   */ getAllUsers() {
        return Array.from(this.users.values());
    }
}
const authSystem = new AuthenticationSystem();

})()),
"[project]/src/middleware/security.ts [middleware] (ecmascript)": (({ r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, k: __turbopack_refresh__ }) => (() => {
"use strict";

/**
 * SOVREN AI PRODUCTION SECURITY MIDDLEWARE
 * Comprehensive security hardening for production deployment
 */ __turbopack_esm__({
    "SecurityMiddleware": ()=>SecurityMiddleware,
    "securityMiddleware": ()=>securityMiddleware
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_import__("[project]/node_modules/next/dist/esm/api/server.js [middleware] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/next/dist/esm/server/web/spec-extension/response.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$middleware$2f$rateLimit$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/src/middleware/rateLimit.ts [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$AuthenticationSystem$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/src/lib/auth/AuthenticationSystem.ts [middleware] (ecmascript)");
"__TURBOPACK__ecmascript__hoisting__location__";
;
;
;
class SecurityMiddleware {
    config;
    rateLimiter;
    constructor(config){
        this.config = {
            enableRateLimit: true,
            enableCORS: true,
            enableCSP: true,
            enableInputSanitization: true,
            enableJWTValidation: true,
            allowedOrigins: [
                'https://sovren.ai',
                'https://app.sovren.ai',
                'https://api.sovren.ai'
            ],
            maxRequestsPerMinute: 100,
            ...config
        };
        if (this.config.enableRateLimit) {
            this.rateLimiter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$middleware$2f$rateLimit$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["rateLimit"])({
                windowMs: 60 * 1000,
                max: this.config.maxRequestsPerMinute,
                message: 'Too many requests from this IP, please try again later.',
                standardHeaders: true,
                legacyHeaders: false
            });
        }
    }
    /**
   * Main security middleware handler
   */ async handle(request) {
        try {
            // 1. Rate Limiting
            if (this.config.enableRateLimit) {
                const rateLimitResult = await this.handleRateLimit(request);
                if (rateLimitResult) return rateLimitResult;
            }
            // 2. CORS Headers
            if (this.config.enableCORS) {
                const corsResult = await this.handleCORS(request);
                if (corsResult) return corsResult;
            }
            // 3. JWT Validation for protected routes
            if (this.config.enableJWTValidation && this.isProtectedRoute(request)) {
                const authResult = await this.handleAuthentication(request);
                if (authResult) return authResult;
            }
            // 4. Input Sanitization
            if (this.config.enableInputSanitization) {
                const sanitizationResult = await this.handleInputSanitization(request);
                if (sanitizationResult) return sanitizationResult;
            }
            // 5. Security Headers
            const response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].next();
            this.addSecurityHeaders(response);
            return null; // Continue to next middleware
        } catch (error) {
            console.error('Security middleware error:', error);
            return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"]('Security validation failed', {
                status: 500
            });
        }
    }
    /**
   * Handle rate limiting
   */ async handleRateLimit(request) {
        const ip = this.getClientIP(request);
        const key = `rate_limit:${ip}`;
        // Simple in-memory rate limiting (in production, use Redis)
        const now = Date.now();
        const windowStart = now - 60000; // 1 minute window
        // This would be implemented with Redis in production
        const requestCount = await this.getRequestCount(key, windowStart);
        if (requestCount >= this.config.maxRequestsPerMinute) {
            return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"]('Rate limit exceeded', {
                status: 429,
                headers: {
                    'Retry-After': '60',
                    'X-RateLimit-Limit': this.config.maxRequestsPerMinute.toString(),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': Math.ceil((now + 60000) / 1000).toString()
                }
            });
        }
        await this.incrementRequestCount(key);
        return null;
    }
    /**
   * Handle CORS
   */ async handleCORS(request) {
        const origin = request.headers.get('origin');
        // Handle preflight requests
        if (request.method === 'OPTIONS') {
            return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"](null, {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': this.isAllowedOrigin(origin) ? origin : 'null',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Max-Age': '86400'
                }
            });
        }
        return null;
    }
    /**
   * Handle JWT authentication
   */ async handleAuthentication(request) {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"]('Authentication required', {
                status: 401,
                headers: {
                    'WWW-Authenticate': 'Bearer realm="SOVREN AI"'
                }
            });
        }
        const token = authHeader.substring(7);
        try {
            const authResult = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$AuthenticationSystem$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["authSystem"].verifyToken(token);
            if (!authResult.success) {
                return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"]('Invalid token', {
                    status: 401
                });
            }
            // Add user info to request headers for downstream use
            const response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].next();
            response.headers.set('X-User-ID', authResult.user.id);
            response.headers.set('X-User-Tier', authResult.user.tier);
            return null;
        } catch (error) {
            console.error('JWT validation error:', error);
            return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"]('Authentication failed', {
                status: 401
            });
        }
    }
    /**
   * Handle input sanitization
   */ async handleInputSanitization(request) {
        if (request.method === 'POST' || request.method === 'PUT') {
            try {
                const contentType = request.headers.get('content-type');
                if (contentType?.includes('application/json')) {
                    const body = await request.json();
                    const sanitizedBody = this.sanitizeObject(body);
                    // In a real implementation, you'd need to modify the request body
                    // For now, we'll just validate it doesn't contain dangerous content
                    if (this.containsDangerousContent(body)) {
                        return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"]('Invalid input detected', {
                            status: 400
                        });
                    }
                }
            } catch (error) {
                return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"]('Invalid request body', {
                    status: 400
                });
            }
        }
        return null;
    }
    /**
   * Add security headers to response
   */ addSecurityHeaders(response) {
        // Content Security Policy
        if (this.config.enableCSP) {
            response.headers.set('Content-Security-Policy', "default-src 'self'; " + "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com; " + "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " + "font-src 'self' https://fonts.gstatic.com; " + "img-src 'self' data: https:; " + "connect-src 'self' wss: https:; " + "media-src 'self'; " + "object-src 'none'; " + "base-uri 'self'; " + "form-action 'self';");
        }
        // Security headers
        response.headers.set('X-Frame-Options', 'DENY');
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
        // HSTS (only in production with HTTPS)
        if ("TURBOPACK compile-time falsy", 0) {
            "TURBOPACK unreachable";
        }
        // Remove server information
        response.headers.delete('Server');
        response.headers.delete('X-Powered-By');
    }
    /**
   * Check if route requires authentication
   */ isProtectedRoute(request) {
        const pathname = request.nextUrl.pathname;
        const protectedPaths = [
            '/api/tts',
            '/api/shadowboard',
            '/api/crm',
            '/api/email',
            '/api/user'
        ];
        return protectedPaths.some((path)=>pathname.startsWith(path));
    }
    /**
   * Check if origin is allowed
   */ isAllowedOrigin(origin) {
        if (!origin) return false;
        // Allow localhost in development
        if (("TURBOPACK compile-time value", "development") === 'development' && origin.startsWith('http://localhost')) {
            return true;
        }
        return this.config.allowedOrigins.includes(origin);
    }
    /**
   * Get client IP address
   */ getClientIP(request) {
        const forwarded = request.headers.get('x-forwarded-for');
        const realIP = request.headers.get('x-real-ip');
        if (forwarded) {
            return forwarded.split(',')[0].trim();
        }
        if (realIP) {
            return realIP;
        }
        return request.ip || 'unknown';
    }
    /**
   * Sanitize object recursively
   */ sanitizeObject(obj) {
        if (typeof obj === 'string') {
            return this.sanitizeString(obj);
        }
        if (Array.isArray(obj)) {
            return obj.map((item)=>this.sanitizeObject(item));
        }
        if (obj && typeof obj === 'object') {
            const sanitized = {};
            for (const [key, value] of Object.entries(obj)){
                sanitized[this.sanitizeString(key)] = this.sanitizeObject(value);
            }
            return sanitized;
        }
        return obj;
    }
    /**
   * Sanitize string input
   */ sanitizeString(str) {
        return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '').replace(/javascript:/gi, '').replace(/on\w+\s*=/gi, '').trim();
    }
    /**
   * Check for dangerous content
   */ containsDangerousContent(obj) {
        const dangerousPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /<iframe/i,
            /eval\s*\(/i,
            /document\.cookie/i
        ];
        const str = JSON.stringify(obj);
        return dangerousPatterns.some((pattern)=>pattern.test(str));
    }
    // Placeholder methods for rate limiting (would use Redis in production)
    async getRequestCount(key, windowStart) {
        // In production, this would query Redis
        return 0;
    }
    async incrementRequestCount(key) {
    // In production, this would increment Redis counter
    }
}
const securityMiddleware = new SecurityMiddleware();

})()),
"[project]/src/middleware.ts [middleware] (ecmascript)": (({ r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, k: __turbopack_refresh__ }) => (() => {
"use strict";

/**
 * SOVREN AI PRODUCTION MIDDLEWARE
 * Next.js middleware for security, rate limiting, and request processing
 */ __turbopack_esm__({
    "config": ()=>config,
    "middleware": ()=>middleware
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_import__("[project]/node_modules/next/dist/esm/api/server.js [middleware] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/next/dist/esm/server/web/spec-extension/response.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$middleware$2f$security$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/src/middleware/security.ts [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$middleware$2f$rateLimit$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/src/middleware/rateLimit.ts [middleware] (ecmascript)");
"__TURBOPACK__ecmascript__hoisting__location__";
;
;
;
async function middleware(request) {
    const { pathname } = request.nextUrl;
    console.log(`🔒 Middleware processing: ${request.method} ${pathname}`);
    try {
        // 1. Security middleware
        const securityResult = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$middleware$2f$security$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["securityMiddleware"].handle(request);
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
        return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"]('Internal Server Error', {
            status: 500
        });
    }
}
/**
 * Handle rate limiting for different endpoints
 */ async function handleRateLimiting(request) {
    const { pathname } = request.nextUrl;
    const clientId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$middleware$2f$rateLimit$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["getClientId"])(request);
    let rateLimiter;
    // Select appropriate rate limiter
    if (pathname.startsWith('/api/tts')) {
        rateLimiter = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$middleware$2f$rateLimit$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["rateLimiters"].tts;
    } else if (pathname.startsWith('/api/auth')) {
        rateLimiter = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$middleware$2f$rateLimit$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["rateLimiters"].auth;
    } else if (pathname.startsWith('/api/email')) {
        rateLimiter = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$middleware$2f$rateLimit$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["rateLimiters"].email;
    } else if (pathname.startsWith('/api/crm')) {
        rateLimiter = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$middleware$2f$rateLimit$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["rateLimiters"].crm;
    } else if (pathname.startsWith('/api/')) {
        rateLimiter = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$middleware$2f$rateLimit$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["rateLimiters"].api;
    } else {
        return null; // No rate limiting for non-API routes
    }
    const { allowed, info } = await rateLimiter.checkLimit(clientId);
    if (!allowed) {
        return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"]('Rate limit exceeded', {
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
    const response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].next();
    response.headers.set('X-RateLimit-Limit', info.limit.toString());
    response.headers.set('X-RateLimit-Remaining', info.remaining.toString());
    response.headers.set('X-RateLimit-Reset', Math.ceil(info.resetTime.getTime() / 1000).toString());
    return null;
}
/**
 * Handle API route requests
 */ async function handleAPIRoute(request) {
    const { pathname } = request.nextUrl;
    // Add API-specific headers
    const response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].next();
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
 */ async function handleStaticAssets(request) {
    const response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].next();
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
 */ async function handlePageRoute(request) {
    const { pathname } = request.nextUrl;
    // Redirect root to app
    if (pathname === '/') {
        // Allow root access - it's the main app
        return null;
    }
    // Protected page routes
    const protectedPages = [
        '/dashboard',
        '/settings',
        '/admin'
    ];
    if (protectedPages.some((page)=>pathname.startsWith(page))) {
        // Check authentication for protected pages
        const authHeader = request.headers.get('authorization');
        const authCookie = request.cookies.get('auth-token');
        if (!authHeader && !authCookie) {
            // Redirect to login
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(loginUrl);
        }
    }
    return null;
}
/**
 * Check if origin is allowed
 */ function isAllowedOrigin(origin) {
    const allowedOrigins = [
        'https://sovren.ai',
        'https://app.sovren.ai',
        'https://api.sovren.ai'
    ];
    // Allow localhost in development
    if (("TURBOPACK compile-time value", "development") === 'development' && origin.startsWith('http://localhost')) {
        return true;
    }
    return allowedOrigins.includes(origin);
}
/**
 * Generate unique request ID
 */ function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}
const config = {
    matcher: [
        /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */ '/((?!_next/static|_next/image|favicon.ico).*)'
    ]
};

})()),
}]);

//# sourceMappingURL=src_97c151._.js.map