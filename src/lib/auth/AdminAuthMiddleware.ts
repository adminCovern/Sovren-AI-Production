import { AdminUserRegistry, AdminAuthService, AdminUser } from './AdminUserConfig';
import { ShadowBoardManager } from '../shadowboard/ShadowBoardManager';

/**
 * Admin Authentication Middleware
 * Handles admin login, session management, and access control
 */

export interface AdminSession {
  user: AdminUser;
  token: string;
  loginTime: Date;
  lastActivity: Date;
  shadowBoardInitialized: boolean;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  success: boolean;
  session?: AdminSession;
  error?: string;
  shadowBoardAccess?: {
    allExecutives: boolean;
    executiveList: string[];
    sovrenAI: boolean;
  };
}

/**
 * Admin Authentication and Session Manager
 */
export class AdminAuthMiddleware {
  private static activeSessions: Map<string, AdminSession> = new Map();
  private static shadowBoardInstances: Map<string, ShadowBoardManager> = new Map();

  /**
   * Admin login with Shadow Board initialization
   */
  public static async adminLogin(request: AdminLoginRequest): Promise<AdminLoginResponse> {
    try {
      console.log(`🔐 Admin login attempt: ${request.email}`);

      // Authenticate admin user
      const authResult = await AdminAuthService.authenticateAdmin(request.email, request.password);
      
      if (!authResult.success || !authResult.user || !authResult.token) {
        console.log(`❌ Admin login failed: ${request.email}`);
        return {
          success: false,
          error: authResult.error || 'Authentication failed'
        };
      }

      const adminUser = authResult.user;
      console.log(`✅ Admin authenticated: ${adminUser.name} (${adminUser.email})`);

      // Create admin session
      const session: AdminSession = {
        user: adminUser,
        token: authResult.token,
        loginTime: new Date(),
        lastActivity: new Date(),
        shadowBoardInitialized: false
      };

      // Store session
      this.activeSessions.set(adminUser.email, session);

      // Initialize Shadow Board for admin if Brian Geary
      if (adminUser.email === 'admin@sovrenai.app') {
        await this.initializeAdminShadowBoard(adminUser);
        session.shadowBoardInitialized = true;
      }

      console.log(`🎯 Admin session created for: ${adminUser.name}`);
      console.log(`🏢 Shadow Board initialized: ${session.shadowBoardInitialized ? 'YES' : 'NO'}`);

      return {
        success: true,
        session,
        shadowBoardAccess: {
          allExecutives: adminUser.shadowBoardAccess.allExecutives,
          executiveList: adminUser.shadowBoardAccess.executiveList,
          sovrenAI: adminUser.shadowBoardAccess.sovrenAI
        }
      };

    } catch (error) {
      console.error('❌ Admin login error:', error);
      return {
        success: false,
        error: 'Login failed due to system error'
      };
    }
  }

  /**
   * Initialize Shadow Board for admin user
   */
  private static async initializeAdminShadowBoard(adminUser: AdminUser): Promise<void> {
    try {
      console.log(`🚀 Initializing Shadow Board for admin: ${adminUser.name}`);

      // Create Shadow Board Manager instance
      const shadowBoard = new ShadowBoardManager();

      // Initialize with full admin access
      await shadowBoard.initializeForAdmin(adminUser.id, adminUser.email);

      // Store Shadow Board instance
      this.shadowBoardInstances.set(adminUser.email, shadowBoard);

      console.log(`✅ Shadow Board initialized for admin: ${adminUser.name}`);
      console.log(`👥 Executives available: ${shadowBoard.getExecutives().size}`);
      console.log(`🧠 SOVREN-AI access: ${adminUser.shadowBoardAccess.sovrenAI ? 'YES' : 'NO'}`);

    } catch (error) {
      console.error(`❌ Failed to initialize Shadow Board for admin: ${adminUser.name}`, error);
      throw error;
    }
  }

  /**
   * Get admin session
   */
  public static getAdminSession(email: string): AdminSession | null {
    const session = this.activeSessions.get(email);
    if (session) {
      // Update last activity
      session.lastActivity = new Date();
    }
    return session || null;
  }

  /**
   * Get Shadow Board instance for admin
   */
  public static getShadowBoardInstance(email: string): ShadowBoardManager | null {
    return this.shadowBoardInstances.get(email) || null;
  }

  /**
   * Verify admin token and get session
   */
  public static verifyAdminAccess(token: string): {
    valid: boolean;
    session?: AdminSession;
    error?: string;
  } {
    try {
      // Verify token
      const tokenResult = AdminAuthService.verifyAdminToken(token);
      
      if (!tokenResult.valid || !tokenResult.user) {
        return {
          valid: false,
          error: tokenResult.error || 'Invalid token'
        };
      }

      // Get active session
      const session = this.getAdminSession(tokenResult.user.email);
      if (!session) {
        return {
          valid: false,
          error: 'No active session'
        };
      }

      return {
        valid: true,
        session
      };

    } catch (error) {
      return {
        valid: false,
        error: 'Token verification failed'
      };
    }
  }

  /**
   * Admin logout
   */
  public static adminLogout(email: string): boolean {
    try {
      // Remove session
      const sessionRemoved = this.activeSessions.delete(email);
      
      // Clean up Shadow Board instance
      const shadowBoard = this.shadowBoardInstances.get(email);
      if (shadowBoard) {
        // Gracefully shutdown Shadow Board if needed
        this.shadowBoardInstances.delete(email);
      }

      console.log(`🔐 Admin logout: ${email} - Session removed: ${sessionRemoved}`);
      return sessionRemoved;

    } catch (error) {
      console.error(`❌ Admin logout error for ${email}:`, error);
      return false;
    }
  }

  /**
   * Check if admin can access specific executive
   */
  public static canAccessExecutive(email: string, executiveRole: string): boolean {
    const session = this.getAdminSession(email);
    if (!session) return false;

    return AdminUserRegistry.canAccessExecutive(email, executiveRole);
  }

  /**
   * Check if admin can access SOVREN-AI
   */
  public static canAccessSOVRENAI(email: string): boolean {
    const session = this.getAdminSession(email);
    if (!session) return false;

    return AdminUserRegistry.canAccessSOVRENAI(email);
  }

  /**
   * Get admin dashboard data
   */
  public static getAdminDashboard(email: string): any {
    const session = this.getAdminSession(email);
    if (!session) return null;

    const shadowBoard = this.getShadowBoardInstance(email);
    const executives = shadowBoard ? Array.from(shadowBoard.getExecutives().keys()) : [];

    return {
      user: {
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        loginTime: session.loginTime,
        lastActivity: session.lastActivity
      },
      shadowBoard: {
        initialized: session.shadowBoardInitialized,
        executiveCount: executives.length,
        executives: executives,
        sovrenAI: executives.includes('SOVREN-AI')
      },
      permissions: session.user.permissions,
      access: session.user.shadowBoardAccess
    };
  }

  /**
   * Execute executive command as admin
   */
  public static async executeExecutiveCommand(
    email: string,
    executiveRole: string,
    command: string,
    parameters: any
  ): Promise<any> {
    // Verify admin access
    const session = this.getAdminSession(email);
    if (!session) {
      throw new Error('No active admin session');
    }

    // Check executive access
    if (!this.canAccessExecutive(email, executiveRole)) {
      throw new Error(`Access denied to executive: ${executiveRole}`);
    }

    // Get Shadow Board instance
    const shadowBoard = this.getShadowBoardInstance(email);
    if (!shadowBoard) {
      throw new Error('Shadow Board not initialized');
    }

    // Execute command
    const executive = shadowBoard.getExecutive(executiveRole);
    if (!executive) {
      throw new Error(`Executive not found: ${executiveRole}`);
    }

    console.log(`🎯 Admin ${email} executing ${command} on ${executiveRole}`);
    
    // This would route to the specific executive's methods
    // For now, return success confirmation
    return {
      success: true,
      executive: executiveRole,
      command,
      parameters,
      timestamp: new Date(),
      executedBy: session.user.name
    };
  }

  /**
   * Get all active admin sessions (for monitoring)
   */
  public static getActiveAdminSessions(): AdminSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Clean up expired sessions
   */
  public static cleanupExpiredSessions(): void {
    const now = Date.now();
    const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours

    for (const [email, session] of this.activeSessions.entries()) {
      const sessionAge = now - session.lastActivity.getTime();
      if (sessionAge > sessionTimeout) {
        console.log(`🧹 Cleaning up expired admin session: ${email}`);
        this.adminLogout(email);
      }
    }
  }
}

/**
 * Brian Geary Admin Quick Access
 * Convenience functions for the main admin user
 */
export class BrianGearyAdminAccess {
  private static readonly BRIAN_EMAIL = 'admin@sovrenai.app';
  private static readonly BRIAN_PASSWORD = 'Rocco2025%$$';

  /**
   * Quick admin login for Brian Geary
   */
  public static async quickLogin(): Promise<AdminLoginResponse> {
    return AdminAuthMiddleware.adminLogin({
      email: this.BRIAN_EMAIL,
      password: this.BRIAN_PASSWORD
    });
  }

  /**
   * Get Brian's Shadow Board instance
   */
  public static getShadowBoard(): ShadowBoardManager | null {
    return AdminAuthMiddleware.getShadowBoardInstance(this.BRIAN_EMAIL);
  }

  /**
   * Get Brian's admin dashboard
   */
  public static getDashboard(): any {
    return AdminAuthMiddleware.getAdminDashboard(this.BRIAN_EMAIL);
  }

  /**
   * Execute command as Brian
   */
  public static async executeCommand(
    executiveRole: string,
    command: string,
    parameters: any = {}
  ): Promise<any> {
    return AdminAuthMiddleware.executeExecutiveCommand(
      this.BRIAN_EMAIL,
      executiveRole,
      command,
      parameters
    );
  }
}

// Initialize cleanup interval
setInterval(() => {
  AdminAuthMiddleware.cleanupExpiredSessions();
}, 60 * 60 * 1000); // Every hour

console.log('🔐 Admin Authentication Middleware initialized');
console.log('👤 Brian Geary admin access configured');
console.log('🏢 Shadow Board admin integration ready');
