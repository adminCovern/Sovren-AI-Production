import { ShadowBoardManager } from '../shadowboard/ShadowBoardManager';
import { ShadowBoardExecutive } from '../shadowboard/ShadowBoardExecutive';

/**
 * Executive Access Manager
 * CRITICAL SECURITY COMPONENT: Ensures proper executive name isolation per user
 * 
 * This is the ONLY way components should access executive information.
 * Prevents multiple users from having executives with the same names.
 */

export interface UserExecutiveInfo {
  userId: string;
  executiveId: string;
  name: string;
  title: string;
  role: string;
  isActive: boolean;
}

export interface ExecutiveAccessValidation {
  isValid: boolean;
  userId: string;
  executiveId: string;
  error?: string;
}

export class ExecutiveAccessManager {
  private shadowBoardManager: ShadowBoardManager;
  private userExecutiveCache: Map<string, Map<string, UserExecutiveInfo>> = new Map();
  private accessLog: Array<{ userId: string; executiveId: string; timestamp: Date; action: string }> = [];

  constructor() {
    this.shadowBoardManager = new ShadowBoardManager();
  }

  /**
   * Get user's executives - THE ONLY WAY TO ACCESS EXECUTIVE INFO
   */
  public async getUserExecutives(userId: string): Promise<Map<string, UserExecutiveInfo>> {
    if (!userId) {
      throw new Error('SECURITY VIOLATION: userId is required for executive access');
    }

    // Check cache first
    if (this.userExecutiveCache.has(userId)) {
      return this.userExecutiveCache.get(userId)!;
    }

    try {
      // Get user's actual Shadow Board
      const shadowBoard = await this.shadowBoardManager.getShadowBoard(userId);
      if (!shadowBoard) {
        throw new Error(`No Shadow Board found for user: ${userId}`);
      }

      const userExecutives = new Map<string, UserExecutiveInfo>();

      // Get all executives for this user
      for (const [role, executive] of shadowBoard.executives.entries()) {
        const executiveInfo: UserExecutiveInfo = {
          userId,
          executiveId: executive.id,
          name: executive.name,
          title: executive.title,
          role,
          isActive: executive.isActive
        };
        userExecutives.set(role, executiveInfo);
      }

      // Cache the result
      this.userExecutiveCache.set(userId, userExecutives);

      this.logAccess(userId, 'ALL_EXECUTIVES', 'GET_USER_EXECUTIVES');
      return userExecutives;

    } catch (error) {
      console.error(`❌ SECURITY ERROR: Failed to get executives for user ${userId}:`, error);
      throw new Error(`Executive access denied for user: ${userId}`);
    }
  }

  /**
   * Get specific executive for user - SECURE ACCESS ONLY
   */
  public async getUserExecutive(userId: string, role: string): Promise<UserExecutiveInfo | null> {
    if (!userId || !role) {
      throw new Error('SECURITY VIOLATION: userId and role are required');
    }

    const userExecutives = await this.getUserExecutives(userId);
    const executive = userExecutives.get(role);

    if (executive) {
      this.logAccess(userId, executive.executiveId, `GET_EXECUTIVE_${role.toUpperCase()}`);
    }

    return executive || null;
  }

  /**
   * Get executive names for user - SECURE NAME ACCESS
   */
  public async getUserExecutiveNames(userId: string): Promise<Map<string, string>> {
    const userExecutives = await this.getUserExecutives(userId);
    const names = new Map<string, string>();

    for (const [role, executive] of userExecutives.entries()) {
      names.set(role, executive.name);
    }

    this.logAccess(userId, 'ALL_EXECUTIVES', 'GET_EXECUTIVE_NAMES');
    return names;
  }

  /**
   * Get executive IDs for user - SECURE ID ACCESS
   */
  public async getUserExecutiveIds(userId: string): Promise<string[]> {
    const userExecutives = await this.getUserExecutives(userId);
    const ids = Array.from(userExecutives.values()).map(exec => exec.executiveId);

    this.logAccess(userId, 'ALL_EXECUTIVES', 'GET_EXECUTIVE_IDS');
    return ids;
  }

  /**
   * Validate executive access - SECURITY CHECK
   */
  public async validateExecutiveAccess(
    userId: string, 
    executiveId: string
  ): Promise<ExecutiveAccessValidation> {
    try {
      const userExecutives = await this.getUserExecutives(userId);
      
      for (const executive of userExecutives.values()) {
        if (executive.executiveId === executiveId) {
          this.logAccess(userId, executiveId, 'VALIDATE_ACCESS_SUCCESS');
          return {
            isValid: true,
            userId,
            executiveId
          };
        }
      }

      this.logAccess(userId, executiveId, 'VALIDATE_ACCESS_FAILED');
      return {
        isValid: false,
        userId,
        executiveId,
        error: `Executive ${executiveId} does not belong to user ${userId}`
      };

    } catch (error) {
      this.logAccess(userId, executiveId, 'VALIDATE_ACCESS_ERROR');
      return {
        isValid: false,
        userId,
        executiveId,
        error: error instanceof Error ? error.message : 'Unknown validation error'
      };
    }
  }

  /**
   * Get executive by role with security validation
   */
  public async getExecutiveByRole(userId: string, role: string): Promise<ShadowBoardExecutive | null> {
    const validation = await this.validateUserAccess(userId);
    if (!validation.isValid) {
      throw new Error(`SECURITY VIOLATION: ${validation.error}`);
    }

    const shadowBoard = await this.shadowBoardManager.getShadowBoard(userId);
    if (!shadowBoard) {
      return null;
    }

    const executive = shadowBoard.executives.get(role);
    if (executive) {
      this.logAccess(userId, executive.id, `GET_EXECUTIVE_BY_ROLE_${role.toUpperCase()}`);
    }

    return executive || null;
  }

  /**
   * Validate user access - SECURITY GATE
   */
  private async validateUserAccess(userId: string): Promise<{ isValid: boolean; error?: string }> {
    if (!userId) {
      return { isValid: false, error: 'User ID is required' };
    }

    try {
      const shadowBoard = await this.shadowBoardManager.getShadowBoard(userId);
      if (!shadowBoard) {
        return { isValid: false, error: `No Shadow Board found for user: ${userId}` };
      }

      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Unknown validation error' 
      };
    }
  }

  /**
   * Clear user cache - SECURITY CLEANUP
   */
  public clearUserCache(userId: string): void {
    this.userExecutiveCache.delete(userId);
    this.logAccess(userId, 'CACHE', 'CLEAR_USER_CACHE');
  }

  /**
   * Clear all caches - SECURITY RESET
   */
  public clearAllCaches(): void {
    this.userExecutiveCache.clear();
    this.accessLog.push({
      userId: 'SYSTEM',
      executiveId: 'ALL_CACHES',
      timestamp: new Date(),
      action: 'CLEAR_ALL_CACHES'
    });
  }

  /**
   * Get access log for security auditing
   */
  public getAccessLog(userId?: string): Array<{ userId: string; executiveId: string; timestamp: Date; action: string }> {
    if (userId) {
      return this.accessLog.filter(log => log.userId === userId);
    }
    return [...this.accessLog];
  }

  /**
   * Log access for security auditing
   */
  private logAccess(userId: string, executiveId: string, action: string): void {
    this.accessLog.push({
      userId,
      executiveId,
      timestamp: new Date(),
      action
    });

    // Keep only last 1000 log entries
    if (this.accessLog.length > 1000) {
      this.accessLog.shift();
    }
  }

  /**
   * SECURITY VALIDATION: Detect hardcoded executive names
   */
  public static validateNoHardcodedNames(componentName: string, codeContent: string): void {
    const FORBIDDEN_HARDCODED_NAMES = [
      'Sarah Chen', 'Marcus Rivera', 'Alex Kim', 'Diana Blackstone',
      'James Wright', 'Lisa Martinez', 'Robert Taylor', 'Jennifer Walsh',
      'Michael Torres', 'Carlos Mendez', 'Ahmed Hassan', 'Elena Volkov'
    ];

    for (const forbiddenName of FORBIDDEN_HARDCODED_NAMES) {
      if (codeContent.includes(forbiddenName)) {
        throw new Error(
          `SECURITY VIOLATION: Component ${componentName} contains hardcoded executive name "${forbiddenName}". ` +
          `Use ExecutiveAccessManager.getUserExecutives() instead.`
        );
      }
    }
  }

  /**
   * Get system status for monitoring
   */
  public getSystemStatus(): any {
    return {
      cachedUsers: this.userExecutiveCache.size,
      totalAccessLogs: this.accessLog.length,
      lastAccess: this.accessLog.length > 0 ? this.accessLog[this.accessLog.length - 1] : null,
      securityStatus: 'ACTIVE'
    };
  }

  /**
   * Initialize user's Shadow Board if not exists
   */
  public async ensureUserShadowBoard(userId: string, subscriptionTier: string = 'SMB'): Promise<void> {
    try {
      let shadowBoard = await this.shadowBoardManager.getShadowBoard(userId);
      
      if (!shadowBoard) {
        console.log(`🔐 Initializing Shadow Board for user: ${userId}`);
        
        switch (subscriptionTier.toLowerCase()) {
          case 'enterprise':
            await this.shadowBoardManager.initializeForEnterprise(userId);
            break;
          case 'admin':
            await this.shadowBoardManager.initializeForAdmin(userId, `${userId}@company.com`);
            break;
          default:
            await this.shadowBoardManager.initializeForSMB(userId, subscriptionTier);
        }

        // Clear cache to force reload
        this.clearUserCache(userId);
      }

      this.logAccess(userId, 'SHADOW_BOARD', 'ENSURE_INITIALIZED');
    } catch (error) {
      console.error(`❌ Failed to ensure Shadow Board for user ${userId}:`, error);
      throw error;
    }
  }
}

// Global instance - SINGLE SOURCE OF TRUTH for executive access
export const executiveAccessManager = new ExecutiveAccessManager();
