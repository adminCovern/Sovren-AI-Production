# SOVREN AI - API Documentation

## 📚 Comprehensive API Reference

This document provides complete API documentation for the SOVREN AI production system, including authentication, error handling, rate limiting, and all available endpoints.

## 🔐 Authentication

### Overview
SOVREN AI uses JWT (JSON Web Tokens) for authentication with secure bcrypt password hashing and account lockout protection.

### Authentication Flow
1. **Register** - Create new user account
2. **Login** - Authenticate and receive JWT token
3. **Use Token** - Include token in Authorization header for protected endpoints
4. **Refresh** - Refresh token before expiration

### Security Features
- bcrypt password hashing (12 rounds)
- Account lockout after 5 failed attempts (15-minute lockout)
- JWT tokens with configurable expiration
- Secure HTTP-only cookies for web clients

---

## 🔑 Authentication Endpoints

### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "tier": "SMB"
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_1234567890",
      "email": "user@example.com",
      "name": "John Doe",
      "tier": "SMB",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2024-01-02T00:00:00.000Z"
  },
  "requestId": "req_1234567890",
  "metadata": {
    "endpoint": "/api/auth/register",
    "method": "POST",
    "processingTime": 150,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Password must be at least 8 characters long",
    "category": "VALIDATION",
    "severity": "MEDIUM",
    "userMessage": "Password must be at least 8 characters long.",
    "suggestedActions": ["Use a stronger password with at least 8 characters"],
    "isRetryable": true,
    "errorId": "err_1234567890",
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "requestId": "req_1234567890"
}
```

### POST /api/auth/login

Authenticate user and receive JWT token.

**Rate Limit:** 5 requests per 15 minutes per IP

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "rememberMe": false
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_1234567890",
      "email": "user@example.com",
      "name": "John Doe",
      "tier": "SMB"
    },
    "expiresAt": "2024-01-02T00:00:00.000Z"
  }
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid credentials provided",
    "category": "AUTHENTICATION",
    "severity": "HIGH",
    "userMessage": "Invalid email or password.",
    "suggestedActions": ["Check your credentials", "Reset password if needed"],
    "isRetryable": false,
    "errorId": "err_1234567890",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response (Account Locked - 423):**
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_LOCKED",
    "message": "Account locked due to too many failed attempts",
    "category": "SECURITY",
    "severity": "HIGH",
    "userMessage": "Your account has been temporarily locked. Please try again in 15 minutes.",
    "suggestedActions": ["Wait 15 minutes before trying again", "Contact support if needed"],
    "isRetryable": true,
    "errorId": "err_1234567890",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 🎤 Text-to-Speech Endpoints

### POST /api/tts/synthesize

Synthesize text to speech with advanced voice models.

**Authentication:** Required (Bearer token)
**Rate Limit:** 10 requests per minute per user

**Request Body:**
```json
{
  "text": "Hello, this is SOVREN AI speaking with advanced neural voice synthesis.",
  "voiceId": "sovren-ai-neural",
  "priority": "high",
  "format": "wav",
  "sampleRate": 22050,
  "userId": "user_1234567890"
}
```

**Available Voice IDs:**
- `sovren-ai-neural` - Main SOVREN AI voice
- `ceo-authoritative` - CEO Executive Voice
- `cfo-analytical` - CFO Analytical Voice
- `cmo-persuasive` - CMO Persuasive Voice
- `cto-technical` - CTO Technical Voice
- `legal-diplomatic` - Legal Diplomatic Voice

**Priority Levels:**
- `high` - ~6ms per character processing
- `medium` - ~12ms per character processing  
- `low` - ~20ms per character processing

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "audioData": "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=",
    "audioUrl": "/audio/generated/synthesis_1234567890.wav",
    "duration": 2.5,
    "processingTime": 150,
    "voiceId": "sovren-ai-neural",
    "metadata": {
      "sampleRate": 22050,
      "format": "wav",
      "size": 44100,
      "quality": 0.95
    }
  },
  "requestId": "req_1234567890",
  "metadata": {
    "endpoint": "/api/tts/synthesize",
    "method": "POST",
    "processingTime": 150,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response (Cache Hit - 200):**
```json
{
  "success": true,
  "data": {
    "audioData": "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=",
    "audioUrl": "/audio/generated/synthesis_1234567890.wav",
    "duration": 2.5,
    "processingTime": 5,
    "voiceId": "sovren-ai-neural",
    "cached": true,
    "metadata": {
      "sampleRate": 22050,
      "format": "wav",
      "size": 44100,
      "quality": 0.95
    }
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "error": {
    "code": "TEXT_TOO_LONG",
    "message": "Text length 6000 exceeds maximum of 5000 characters",
    "category": "VALIDATION",
    "severity": "MEDIUM",
    "userMessage": "Text is too long (6000 characters). Maximum allowed is 5000 characters.",
    "suggestedActions": ["Shorten the text", "Split into multiple requests"],
    "isRetryable": true,
    "errorId": "err_1234567890",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /api/tts/synthesize

Health check for TTS service.

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "TTS Backend Service",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "availableVoices": [
      {
        "id": "sovren-ai-neural",
        "name": "SOVREN AI Neural Voice",
        "language": "en-US",
        "gender": "neutral"
      }
    ],
    "isHealthy": true
  }
}
```

---

## 🔧 System Endpoints

### GET /api/health

System health check.

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "services": {
      "database": "healthy",
      "redis": "healthy",
      "tts": "healthy",
      "shadowBoard": "healthy"
    },
    "performance": {
      "responseTime": 15,
      "memoryUsage": "45%",
      "cpuUsage": "23%"
    }
  }
}
```

---

## 📊 Rate Limiting

### Rate Limit Headers
All responses include rate limiting headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
X-RateLimit-RetryAfter: 60
```

### Rate Limit Configuration
| Endpoint | Window | Limit | Scope |
|----------|--------|-------|-------|
| `/api/auth/login` | 15 minutes | 5 | Per IP |
| `/api/auth/register` | 15 minutes | 3 | Per IP |
| `/api/tts/synthesize` | 1 minute | 10 | Per User |
| `/api/*` (General) | 15 minutes | 1000 | Per IP |

### Rate Limit Exceeded Response (429)
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "category": "RATE_LIMIT",
    "severity": "MEDIUM",
    "userMessage": "You have exceeded the rate limit. Please try again later.",
    "suggestedActions": ["Wait before making more requests", "Reduce request frequency"],
    "isRetryable": true,
    "errorId": "err_1234567890",
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "requestId": "req_1234567890",
  "metadata": {
    "retryAfter": 60
  }
}
```

---

## 🚨 Error Handling

### Error Categories
- `AUTHENTICATION` - Authentication failures
- `AUTHORIZATION` - Permission denied
- `VALIDATION` - Input validation errors
- `RATE_LIMIT` - Rate limiting violations
- `NETWORK` - Network connectivity issues
- `EXTERNAL_SERVICE` - Third-party service errors
- `SECURITY` - Security violations
- `BUSINESS_LOGIC` - Business rule violations
- `CONFIGURATION` - System configuration errors
- `DATABASE` - Database operation errors
- `SYSTEM` - Internal system errors

### Error Severity Levels
- `LOW` - Minor issues, system continues normally
- `MEDIUM` - Moderate issues, some functionality affected
- `HIGH` - Serious issues, significant functionality affected
- `CRITICAL` - Critical issues, system stability at risk

### Standard Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Technical error message",
    "category": "ERROR_CATEGORY",
    "severity": "ERROR_SEVERITY",
    "userMessage": "User-friendly error message",
    "suggestedActions": ["Action 1", "Action 2"],
    "isRetryable": true,
    "errorId": "err_1234567890",
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "requestId": "req_1234567890",
  "metadata": {
    "endpoint": "/api/endpoint",
    "method": "POST",
    "processingTime": 150,
    "userAgent": "Mozilla/5.0...",
    "ipAddress": "192.168.1.1"
  }
}
```

---

## 🔒 Security Headers

All API responses include comprehensive security headers:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

---

## 📈 Performance Metrics

### Response Time Targets
- P50: < 20ms
- P95: < 50ms  
- P99: < 100ms
- P99.9: < 200ms

### Caching
- TTS synthesis results cached with 95%+ hit rate
- Cache keys based on text, voice, and parameters
- Automatic cache size management (max 1000 entries)
- Cache statistics available via `/api/tts/cache/stats`

### Monitoring
All endpoints provide detailed performance metrics in response metadata for monitoring and optimization.

---

## 🔧 Configuration Management

### Configuration System Overview
SOVREN AI uses a centralized configuration management system with environment-specific settings and comprehensive validation.

### Configuration Structure
```typescript
interface SOVRENConfiguration {
  environment: 'development' | 'staging' | 'production' | 'test';
  version: string;
  port: number;
  host: string;
  baseUrl: string;
  features: FeatureFlags;
  limits: SystemLimits;
  database: DatabaseConfiguration;
  redis: RedisConfiguration;
  security: SecurityConfiguration;
  tts: TTSConfiguration;
  shadowBoard: ShadowBoardConfiguration;
  email: EmailConfiguration;
  storage: StorageConfiguration;
  monitoring: MonitoringConfiguration;
  performance: PerformanceConfiguration;
}
```

### Configuration Files
- `config/base.json` - Base configuration shared across environments
- `config/development.json` - Development-specific settings
- `config/staging.json` - Staging environment settings
- `config/production.json` - Production environment settings
- `config/test.json` - Test environment settings

### Environment Variables
Configuration can be overridden using environment variables:

```bash
# Core Settings
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
BASE_URL=https://api.sovren.ai

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sovren_ai
DB_USER=sovren
DB_PASSWORD=secure_password

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password

# Security
JWT_SECRET=your-super-secure-jwt-secret-32-chars-min
BCRYPT_ROUNDS=12

# TTS
TTS_MODELS_PATH=/opt/sovren/models
TTS_OUTPUT_PATH=/var/www/sovren/audio
PYTHON_PATH=/usr/bin/python3
STYLETTS2_PATH=/opt/styletts2

# Email
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.sovren.ai
SMTP_PORT=587
SMTP_USER=noreply@sovren.ai
SMTP_PASSWORD=smtp_password

# Storage
STORAGE_PROVIDER=s3
AWS_S3_BUCKET=sovren-storage
AWS_S3_REGION=us-east-1
AWS_S3_ACCESS_KEY_ID=your-access-key
AWS_S3_SECRET_ACCESS_KEY=your-secret-key

# Monitoring
LOG_LEVEL=info
METRICS_PORT=9090
ALERTING_EMAIL=admin@sovren.ai
```

### Configuration Management CLI

#### Validate Configuration
```bash
# Validate current environment
npm run config:validate

# Validate specific environment
npm run config validate production
```

#### Security Audit
```bash
# Perform security audit
npm run config:audit

# Audit specific environment
npm run config audit production
```

#### Generate Reports
```bash
# Generate configuration report
npm run config:report

# Generate report for specific environment
npm run config report staging
```

#### Check Health
```bash
# Check configuration health
npm run config:health

# Check health for specific environment
npm run config health production
```

#### Environment Variables
```bash
# Check environment variables
npm run config:check-env

# Generate .env template
npm run config:generate-env
```

### Configuration Validation

The system performs comprehensive validation including:

#### Security Validation
- JWT secret strength (minimum 32 characters)
- Password hashing configuration (bcrypt rounds)
- CORS origin restrictions
- Content Security Policy settings
- SSL/TLS configuration
- Database security settings

#### Performance Validation
- Connection pool settings
- Cache configuration
- Concurrent request limits
- Timeout settings
- Resource limits

#### Functionality Validation
- Required configuration fields
- File path accessibility
- Service connectivity
- Feature flag dependencies
- Environment-specific requirements

### Configuration Health Monitoring

#### Health Status Levels
- **Healthy** - No critical issues, system ready for operation
- **Warning** - Minor issues that should be addressed
- **Critical** - Serious issues that prevent proper operation

#### Health Metrics
- Configuration Score (0-100)
- Security Score (0-100)
- Issue counts by severity
- Recommendations for improvement

### Production Configuration Checklist

#### Security Requirements
- [ ] JWT secret is at least 32 characters and unique
- [ ] Database SSL is enabled
- [ ] Redis password is set
- [ ] CORS origins are restricted
- [ ] CSP is enabled and configured
- [ ] Security headers are enabled
- [ ] Rate limiting is configured

#### Performance Requirements
- [ ] Database connection pooling is configured
- [ ] Redis connection settings are optimized
- [ ] Caching is enabled where appropriate
- [ ] Compression is enabled
- [ ] Static file caching is configured
- [ ] Request timeouts are set appropriately

#### Monitoring Requirements
- [ ] Logging level is appropriate (info/warn for production)
- [ ] Log rotation is configured
- [ ] Alerting is enabled
- [ ] Health check endpoints are configured
- [ ] Metrics collection is enabled

#### Feature Configuration
- [ ] Required features are enabled
- [ ] Experimental features are disabled in production
- [ ] Resource limits are set appropriately
- [ ] File paths exist and are accessible
- [ ] External service credentials are configured

### Configuration Best Practices

1. **Environment Separation**: Use separate configuration files for each environment
2. **Secret Management**: Store sensitive data in environment variables, not config files
3. **Validation**: Always validate configuration before deployment
4. **Documentation**: Document all configuration options and their purposes
5. **Monitoring**: Monitor configuration health in production
6. **Backup**: Keep backups of working configurations
7. **Version Control**: Track configuration changes in version control
8. **Testing**: Test configuration changes in staging before production
