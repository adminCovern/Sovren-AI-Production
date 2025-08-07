/**
 * Admin User Configuration
 * Defines admin users with full system access
 */

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin';
  hashedPassword: string;
  permissions: AdminPermissions;
  shadowBoardAccess: ShadowBoardAccess;
  createdAt: Date;
  lastLogin?: Date;
}

export interface AdminPermissions {
  fullSystemAccess: boolean;
  bypassSubscriptionLimits: boolean;
  accessAllExecutives: boolean;
  accessSOVRENAI: boolean;
  manageUsers: boolean;
  viewAnalytics: boolean;
  systemConfiguration: boolean;
  b200ResourceManagement: boolean;
}

export interface ShadowBoardAccess {
  allExecutives: boolean;
  executiveList: string[];
  sovrenAI: boolean;
  unlimitedUsage: boolean;
  priorityAccess: boolean;
}

/**
 * Admin User Registry
 * Secure configuration for admin users
 */
export class AdminUserRegistry {
  private static readonly ADMIN_USERS: Record<string, AdminUser> = {
    'admin@sovrenai.app': {
      id: 'admin_brian_geary_001',
      email: 'admin@sovrenai.app',
      name: 'Brian Geary',
      role: 'super_admin',
      hashedPassword: '$2b$12$8K9vXzF2mN4pQ7rS1tU6vO.wE3yR5gH8jL9kM2nP6qT4uI7oA0sC1', // Rocco2025%$$
      permissions: {
        fullSystemAccess: true,
        bypassSubscriptionLimits: true,
        accessAllExecutives: true,
        accessSOVRENAI: true,
        manageUsers: true,
        viewAnalytics: true,
        systemConfiguration: true,
        b200ResourceManagement: true
      },
      shadowBoardAccess: {
        allExecutives: true,
        executiveList: ['CFO', 'CMO', 'CTO', 'CLO', 'COO', 'CHRO', 'CSO', 'SOVREN-AI'],
        sovrenAI: true,
        unlimitedUsage: true,
        priorityAccess: true
      },
      createdAt: new Date('2024-01-01T00:00:00Z')
    }
  };

  /**
   * Check if user is admin
   */
  public static isAdminUser(email: string): boolean {
    return email in this.ADMIN_USERS;
  }

  /**
   * Get admin user by email
   */
  public static getAdminUser(email: string): AdminUser | null {
    return this.ADMIN_USERS[email] || null;
  }

  /**
   * Verify admin password
   */
  public static async verifyAdminPassword(email: string, password: string): Promise<boolean> {
    const adminUser = this.getAdminUser(email);
    if (!adminUser) return false;

    // In production, use bcrypt to verify hashed password
    // For now, direct comparison (NEVER do this in production)
    const bcrypt = await import('bcrypt');
    return bcrypt.compare(password, adminUser.hashedPassword);
  }

  /**
   * Get admin permissions
   */
  public static getAdminPermissions(email: string): AdminPermissions | null {
    const adminUser = this.getAdminUser(email);
    return adminUser?.permissions || null;
  }

  /**
   * Get admin Shadow Board access
   */
  public static getAdminShadowBoardAccess(email: string): ShadowBoardAccess | null {
    const adminUser = this.getAdminUser(email);
    return adminUser?.shadowBoardAccess || null;
  }

  /**
   * Update last login
   */
  public static updateLastLogin(email: string): void {
    const adminUser = this.ADMIN_USERS[email];
    if (adminUser) {
      adminUser.lastLogin = new Date();
    }
  }

  /**
   * Get all admin users (for management)
   */
  public static getAllAdminUsers(): AdminUser[] {
    return Object.values(this.ADMIN_USERS);
  }

  /**
   * Check specific admin permission
   */
  public static hasPermission(email: string, permission: keyof AdminPermissions): boolean {
    const adminUser = this.getAdminUser(email);
    return adminUser?.permissions[permission] || false;
  }

  /**
   * Check if admin can access specific executive
   */
  public static canAccessExecutive(email: string, executiveRole: string): boolean {
    const adminUser = this.getAdminUser(email);
    if (!adminUser) return false;

    return adminUser.shadowBoardAccess.allExecutives || 
           adminUser.shadowBoardAccess.executiveList.includes(executiveRole);
  }

  /**
   * Check if admin can access SOVREN-AI
   */
  public static canAccessSOVRENAI(email: string): boolean {
    const adminUser = this.getAdminUser(email);
    return adminUser?.shadowBoardAccess.sovrenAI || false;
  }

  /**
   * Get admin subscription tier (always unlimited for admins)
   */
  public static getAdminSubscriptionTier(email: string): string {
    const adminUser = this.getAdminUser(email);
    if (!adminUser) return 'none';

    // Admin users get unlimited access
    return 'admin_unlimited';
  }
}

/**
 * Admin Authentication Service
 */
export class AdminAuthService {
  /**
   * Authenticate admin user
   */
  public static async authenticateAdmin(email: string, password: string): Promise<{
    success: boolean;
    user?: AdminUser;
    token?: string;
    error?: string;
  }> {
    try {
      // Check if user is admin
      if (!AdminUserRegistry.isAdminUser(email)) {
        return {
          success: false,
          error: 'Invalid admin credentials'
        };
      }

      // Verify password
      const isValidPassword = await AdminUserRegistry.verifyAdminPassword(email, password);
      if (!isValidPassword) {
        return {
          success: false,
          error: 'Invalid admin credentials'
        };
      }

      // Get admin user
      const adminUser = AdminUserRegistry.getAdminUser(email);
      if (!adminUser) {
        return {
          success: false,
          error: 'Admin user not found'
        };
      }

      // Update last login
      AdminUserRegistry.updateLastLogin(email);

      // Generate admin token (in production, use JWT)
      const token = this.generateAdminToken(adminUser);

      return {
        success: true,
        user: adminUser,
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
   * Generate admin token
   */
  private static generateAdminToken(adminUser: AdminUser): string {
    // In production, use JWT with proper signing
    const tokenData = {
      userId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      permissions: adminUser.permissions,
      timestamp: Date.now()
    };

    // For now, base64 encode (NEVER do this in production)
    return Buffer.from(JSON.stringify(tokenData)).toString('base64');
  }

  /**
   * Verify admin token
   */
  public static verifyAdminToken(token: string): {
    valid: boolean;
    user?: AdminUser;
    error?: string;
  } {
    try {
      // Decode token (in production, verify JWT signature)
      const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
      
      // Check if user still exists and is admin
      const adminUser = AdminUserRegistry.getAdminUser(tokenData.email);
      if (!adminUser) {
        return {
          valid: false,
          error: 'Admin user no longer exists'
        };
      }

      // Check token age (24 hours)
      const tokenAge = Date.now() - tokenData.timestamp;
      if (tokenAge > 24 * 60 * 60 * 1000) {
        return {
          valid: false,
          error: 'Token expired'
        };
      }

      return {
        valid: true,
        user: adminUser
      };

    } catch (error) {
      return {
        valid: false,
        error: 'Invalid token'
      };
    }
  }
}

/**
 * Password hashing utility (for setup)
 */
export class PasswordHasher {
  /**
   * Hash password for storage
   */
  public static async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcrypt');
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  public static async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcrypt');
    return bcrypt.compare(password, hash);
  }
}

// Export admin user configuration
export const BRIAN_GEARY_ADMIN: AdminUser = AdminUserRegistry.getAdminUser('admin@sovrenai.app')!;

console.log('🔐 Admin User Configuration Loaded');
console.log(`👤 Super Admin: ${BRIAN_GEARY_ADMIN.name} (${BRIAN_GEARY_ADMIN.email})`);
console.log(`🎯 Full Shadow Board Access: ${BRIAN_GEARY_ADMIN.shadowBoardAccess.allExecutives ? 'YES' : 'NO'}`);
console.log(`🧠 SOVREN-AI Access: ${BRIAN_GEARY_ADMIN.shadowBoardAccess.sovrenAI ? 'YES' : 'NO'}`);
console.log(`⚡ B200 Resource Management: ${BRIAN_GEARY_ADMIN.permissions.b200ResourceManagement ? 'YES' : 'NO'}`);
