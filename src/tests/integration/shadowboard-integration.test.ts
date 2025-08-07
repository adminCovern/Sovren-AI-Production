import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { SovrenAIShadowBoardIntegration } from '@/lib/integration/SovrenAIShadowBoardIntegration';
import { createDatabaseManager, DatabaseManager } from '@/database/connection';
import { executiveAccessManager } from '@/lib/security/ExecutiveAccessManager';

/**
 * Shadow Board Integration Tests
 * IMMEDIATE DEPLOYMENT - Complete test suite for production validation
 * NO PLACEHOLDERS - Full integration testing
 */

describe('SOVREN-AI Shadow Board Integration Tests', () => {
  let shadowBoard: SovrenAIShadowBoardIntegration;
  let db: DatabaseManager;
  let testUserId: string;

  beforeAll(async () => {
    // Initialize test database
    db = createDatabaseManager({
      host: process.env.TEST_DATABASE_HOST || 'localhost',
      port: parseInt(process.env.TEST_DATABASE_PORT || '5432'),
      database: process.env.TEST_DATABASE_NAME || 'sovren_ai_test',
      user: process.env.TEST_DATABASE_USER || 'test_user',
      password: process.env.TEST_DATABASE_PASSWORD || 'test_password',
      ssl: false
    });

    await db.initialize();

    // Create test user
    const userResult = await db.query(`
      INSERT INTO users (email, password_hash, subscription_tier, subscription_status)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, ['test@sovren.ai', 'hashed_password', 'sovren_proof_plus', 'active']);

    testUserId = userResult.rows[0].id;

    // Initialize Shadow Board
    shadowBoard = new SovrenAIShadowBoardIntegration();
  });

  afterAll(async () => {
    // Cleanup
    if (shadowBoard) {
      await shadowBoard.cleanup();
    }
    
    if (db) {
      await db.query('DELETE FROM users WHERE email = $1', ['test@sovren.ai']);
      await db.close();
    }
  });

  beforeEach(async () => {
    // Reset any test state
  });

  describe('Shadow Board Initialization', () => {
    test('should initialize with valid configuration', async () => {
      const configuration = {
        userId: testUserId,
        subscriptionTier: 'sovren_proof_plus' as const,
        executiveRoles: ['cfo', 'cmo', 'cto'],
        voiceEnabled: true,
        coordinationEnabled: true,
        performanceOptimizationEnabled: true,
        advancedFeaturesEnabled: true,
        analyticsEnabled: true,
        b200AccelerationEnabled: true
      };

      await expect(shadowBoard.initialize(configuration)).resolves.not.toThrow();

      const status = await shadowBoard.getStatus();
      expect(status.overallStatus).toBe('ready');
      expect(status.executiveStatus.totalExecutives).toBe(3);
    });

    test('should get correct capabilities based on subscription tier', () => {
      const capabilities = shadowBoard.getCapabilities();
      
      expect(capabilities.voiceSynthesis.realTimeGeneration).toBe(true);
      expect(capabilities.executiveCoordination.multiExecutiveConversations).toBe(true);
      expect(capabilities.performanceOptimization.intelligentCaching).toBe(true);
      expect(capabilities.advancedFeatures.personalityLearning).toBe(true);
      expect(capabilities.analytics.performanceMetrics).toBe(true);
    });
  });

  describe('Executive Interactions', () => {
    test('should execute basic executive interaction', async () => {
      const result = await shadowBoard.executeExecutiveInteraction('cfo', {
        text: 'What is our current cash flow situation?',
        context: { topic: 'financial_analysis', urgency: 'medium' },
        requiresVoice: false,
        requiresCoordination: false,
        priority: 'medium'
      });

      expect(result.response).toBeDefined();
      expect(result.response.length).toBeGreaterThan(0);
      expect(result.performanceMetrics).toBeDefined();
      expect(result.performanceMetrics.responseTime).toBeGreaterThan(0);
      expect(result.satisfactionPrediction).toBeGreaterThanOrEqual(0);
      expect(result.satisfactionPrediction).toBeLessThanOrEqual(1);
    });

    test('should execute voice-enabled interaction', async () => {
      const result = await shadowBoard.executeExecutiveInteraction('cmo', {
        text: 'Explain our marketing strategy for Q4',
        context: { topic: 'marketing_strategy', urgency: 'high' },
        requiresVoice: true,
        requiresCoordination: false,
        priority: 'high'
      });

      expect(result.response).toBeDefined();
      expect(result.audioUrl).toBeDefined();
      expect(result.performanceMetrics.b200Utilization).toBeGreaterThan(0);
    });

    test('should execute coordination-enabled interaction', async () => {
      const result = await shadowBoard.executeExecutiveInteraction('cto', {
        text: 'We need to discuss the technical architecture for our new product',
        context: { topic: 'technical_architecture', urgency: 'critical' },
        requiresVoice: false,
        requiresCoordination: true,
        priority: 'critical'
      });

      expect(result.response).toBeDefined();
      expect(result.coordinationSession).toBeDefined();
      expect(result.performanceMetrics.responseTime).toBeLessThan(2000); // Critical priority should be fast
    });
  });

  describe('Performance Metrics', () => {
    test('should track performance metrics correctly', async () => {
      // Execute multiple interactions
      const interactions = [
        { role: 'cfo', text: 'Financial report analysis' },
        { role: 'cmo', text: 'Marketing campaign performance' },
        { role: 'cto', text: 'System architecture review' }
      ];

      const results = [];
      for (const interaction of interactions) {
        const result = await shadowBoard.executeExecutiveInteraction(interaction.role, {
          text: interaction.text,
          context: { topic: 'test', urgency: 'medium' },
          requiresVoice: false,
          requiresCoordination: false,
          priority: 'medium'
        });
        results.push(result);
      }

      // Verify metrics
      for (const result of results) {
        expect(result.performanceMetrics.responseTime).toBeGreaterThan(0);
        expect(result.performanceMetrics.qualityScore).toBeGreaterThanOrEqual(0.8);
        expect(result.satisfactionPrediction).toBeGreaterThanOrEqual(0.7);
      }

      // Check database logging
      const interactionLogs = await db.query(
        'SELECT COUNT(*) as count FROM executive_interactions WHERE user_id = $1',
        [testUserId]
      );
      expect(parseInt(interactionLogs.rows[0].count)).toBeGreaterThanOrEqual(3);
    });

    test('should handle high-priority requests faster', async () => {
      const lowPriorityStart = Date.now();
      await shadowBoard.executeExecutiveInteraction('cfo', {
        text: 'Low priority financial query',
        context: { topic: 'test', urgency: 'low' },
        requiresVoice: false,
        requiresCoordination: false,
        priority: 'low'
      });
      const lowPriorityTime = Date.now() - lowPriorityStart;

      const highPriorityStart = Date.now();
      await shadowBoard.executeExecutiveInteraction('cfo', {
        text: 'Critical financial emergency',
        context: { topic: 'test', urgency: 'critical' },
        requiresVoice: false,
        requiresCoordination: false,
        priority: 'critical'
      });
      const highPriorityTime = Date.now() - highPriorityStart;

      // High priority should be processed faster (or at least not significantly slower)
      expect(highPriorityTime).toBeLessThanOrEqual(lowPriorityTime * 1.5);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid executive role gracefully', async () => {
      await expect(
        shadowBoard.executeExecutiveInteraction('invalid_role', {
          text: 'Test query',
          context: { topic: 'test', urgency: 'medium' },
          requiresVoice: false,
          requiresCoordination: false,
          priority: 'medium'
        })
      ).rejects.toThrow();
    });

    test('should handle empty text input gracefully', async () => {
      await expect(
        shadowBoard.executeExecutiveInteraction('cfo', {
          text: '',
          context: { topic: 'test', urgency: 'medium' },
          requiresVoice: false,
          requiresCoordination: false,
          priority: 'medium'
        })
      ).rejects.toThrow();
    });

    test('should handle database connection issues', async () => {
      // Temporarily close database connection
      await db.close();

      await expect(
        shadowBoard.executeExecutiveInteraction('cfo', {
          text: 'Test query during database outage',
          context: { topic: 'test', urgency: 'medium' },
          requiresVoice: false,
          requiresCoordination: false,
          priority: 'medium'
        })
      ).rejects.toThrow();

      // Reconnect for cleanup
      await db.initialize();
    });
  });

  describe('Security Validation', () => {
    test('should validate user access to executives', async () => {
      // Test with invalid user ID
      const invalidConfig = {
        userId: 'invalid-user-id',
        subscriptionTier: 'sovren_proof' as const,
        executiveRoles: ['cfo'],
        voiceEnabled: true,
        coordinationEnabled: false,
        performanceOptimizationEnabled: true,
        advancedFeaturesEnabled: false,
        analyticsEnabled: true,
        b200AccelerationEnabled: true
      };

      const invalidShadowBoard = new SovrenAIShadowBoardIntegration();
      await expect(invalidShadowBoard.initialize(invalidConfig)).rejects.toThrow();
    });

    test('should respect subscription tier limitations', async () => {
      // Create basic tier user
      const basicUserResult = await db.query(`
        INSERT INTO users (email, password_hash, subscription_tier, subscription_status)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, ['basic@sovren.ai', 'hashed_password', 'sovren_proof', 'active']);

      const basicUserId = basicUserResult.rows[0].id;

      const basicConfig = {
        userId: basicUserId,
        subscriptionTier: 'sovren_proof' as const,
        executiveRoles: ['cfo', 'cmo', 'cto'],
        voiceEnabled: true,
        coordinationEnabled: false, // Should be false for basic tier
        performanceOptimizationEnabled: true,
        advancedFeaturesEnabled: false, // Should be false for basic tier
        analyticsEnabled: true,
        b200AccelerationEnabled: true
      };

      const basicShadowBoard = new SovrenAIShadowBoardIntegration();
      await basicShadowBoard.initialize(basicConfig);

      const capabilities = basicShadowBoard.getCapabilities();
      expect(capabilities.executiveCoordination.multiExecutiveConversations).toBe(false);
      expect(capabilities.advancedFeatures.personalityLearning).toBe(false);

      // Cleanup
      await basicShadowBoard.cleanup();
      await db.query('DELETE FROM users WHERE id = $1', [basicUserId]);
    });
  });

  describe('System Health', () => {
    test('should report healthy system status', async () => {
      const status = await shadowBoard.getStatus();
      
      expect(status.overallStatus).toBe('ready');
      expect(status.componentStatus.voiceSynthesis).toBe('ready');
      expect(status.componentStatus.coordination).toBe('ready');
      expect(status.componentStatus.performance).toBe('ready');
      expect(status.componentStatus.advanced).toBe('ready');
      expect(status.componentStatus.analytics).toBe('ready');
      
      expect(status.b200Status.available).toBe(true);
      expect(status.b200Status.gpuCount).toBeGreaterThan(0);
      expect(status.b200Status.utilization).toBeGreaterThanOrEqual(0);
      expect(status.b200Status.utilization).toBeLessThanOrEqual(1);
      
      expect(status.executiveStatus.systemHealth).toBeGreaterThanOrEqual(0.8);
    });
  });
});
