/**
 * SECURITY UTILITIES
 * Real cryptographic functions for production use
 * Replaces fake quantum-resistant code with actual security implementations
 */

import { randomBytes, createHash, createHmac, scrypt, createCipheriv, createDecipheriv } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export interface SecurityReport {
  securityLevel: 'High' | 'Medium' | 'Low';
  algorithms: string[];
  keyStrengths: number[];
  recommendations: string[];
  timestamp: Date;
}

export interface EncryptedData {
  data: string;
  iv: string;
  salt: string;
  tag: string;
  algorithm: string;
  timestamp: number;
}

/**
 * Production Security Utilities
 * Real cryptographic functions for secure data handling
 */
export class SecurityUtils {
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly KEY_LENGTH = 32; // 256 bits
  private readonly IV_LENGTH = 16; // 128 bits
  private readonly SALT_LENGTH = 32; // 256 bits
  private readonly TAG_LENGTH = 16; // 128 bits

  /**
   * Generate cryptographically secure random bytes
   */
  public generateSecureRandom(length: number): Buffer {
    return randomBytes(length);
  }

  /**
   * Generate secure password hash using scrypt
   */
  public async hashPassword(password: string, salt?: Buffer): Promise<{ hash: string; salt: string }> {
    const passwordSalt = salt || randomBytes(this.SALT_LENGTH);
    const hash = await scryptAsync(password, passwordSalt, 64) as Buffer;
    
    return {
      hash: hash.toString('hex'),
      salt: passwordSalt.toString('hex')
    };
  }

  /**
   * Verify password against hash
   */
  public async verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
    const saltBuffer = Buffer.from(salt, 'hex');
    const hashBuffer = Buffer.from(hash, 'hex');
    const derivedHash = await scryptAsync(password, saltBuffer, 64) as Buffer;
    
    return hashBuffer.equals(derivedHash);
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  public async encryptData(data: string, password: string): Promise<EncryptedData> {
    const salt = randomBytes(this.SALT_LENGTH);
    const iv = randomBytes(this.IV_LENGTH);
    
    // Derive key from password using scrypt
    const key = await scryptAsync(password, salt, this.KEY_LENGTH) as Buffer;
    
    // Create cipher
    const cipher = createCipheriv(this.ALGORITHM, key, iv);
    
    // Encrypt data
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag
    const tag = cipher.getAuthTag();
    
    return {
      data: encrypted,
      iv: iv.toString('hex'),
      salt: salt.toString('hex'),
      tag: tag.toString('hex'),
      algorithm: this.ALGORITHM,
      timestamp: Date.now()
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  public async decryptData(encryptedData: EncryptedData, password: string): Promise<string> {
    const salt = Buffer.from(encryptedData.salt, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');
    
    // Derive key from password using scrypt
    const key = await scryptAsync(password, salt, this.KEY_LENGTH) as Buffer;
    
    // Create decipher
    const decipher = createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    // Decrypt data
    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Create HMAC signature
   */
  public createHMAC(data: string, secret: string): string {
    return createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  public verifyHMAC(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.createHMAC(data, secret);
    return expectedSignature === signature;
  }

  /**
   * Create secure hash
   */
  public createHash(data: string, algorithm: 'sha256' | 'sha512' = 'sha256'): string {
    return createHash(algorithm).update(data).digest('hex');
  }

  /**
   * Generate security report
   */
  public generateSecurityReport(): SecurityReport {
    return {
      securityLevel: 'High',
      algorithms: ['AES-256-GCM', 'scrypt', 'HMAC-SHA256', 'SHA-256'],
      keyStrengths: [256, 256, 256, 256],
      recommendations: [
        'Use strong passwords with high entropy',
        'Rotate encryption keys regularly',
        'Store keys securely using environment variables',
        'Use HTTPS for all communications'
      ],
      timestamp: new Date()
    };
  }

  /**
   * Validate security configuration
   */
  public validateSecurityConfig(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check JWT secret
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      issues.push('JWT_SECRET must be at least 32 characters long');
    }

    // Check database password
    if (!process.env.DB_PASSWORD) {
      issues.push('DB_PASSWORD environment variable is required');
    }

    // Check Redis configuration
    if (!process.env.REDIS_URL) {
      issues.push('REDIS_URL environment variable is required');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Generate secure JWT secret
   */
  public generateJWTSecret(): string {
    return randomBytes(64).toString('hex');
  }

  /**
   * Generate secure API key
   */
  public generateAPIKey(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Sanitize input to prevent XSS
   */
  public sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Validate email format
   */
  public isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check password strength
   */
  public checkPasswordStrength(password: string): { score: number; feedback: string[] } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score += 1;
    else feedback.push('Password should be at least 8 characters long');

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Password should contain lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Password should contain uppercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Password should contain numbers');

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    else feedback.push('Password should contain special characters');

    return { score, feedback };
  }
}

// Export singleton instance
export const securityUtils = new SecurityUtils();
