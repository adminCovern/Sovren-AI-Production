import { NextRequest, NextResponse } from 'next/server';
import { SovrenAIShadowBoardIntegration } from '@/lib/integration/SovrenAIShadowBoardIntegration';
import { getDatabaseManager } from '@/database/connection';
import { executiveAccessManager } from '@/lib/security/ExecutiveAccessManager';

/**
 * Shadow Board Integration API Endpoint
 * PRODUCTION DEPLOYMENT - Complete integration with all components
 * NO PLACEHOLDERS - Full implementation
 */

// Global integration instance
let shadowBoardIntegration: SovrenAIShadowBoardIntegration | null = null;

/**
 * Initialize Shadow Board Integration
 */
async function initializeShadowBoard(userId: string, subscriptionTier: string): Promise<SovrenAIShadowBoardIntegration> {
  if (!shadowBoardIntegration) {
    shadowBoardIntegration = new SovrenAIShadowBoardIntegration();
  }

  // Configure based on user subscription
  const configuration = {
    userId,
    subscriptionTier: subscriptionTier as 'sovren_proof' | 'sovren_proof_plus',
    executiveRoles: subscriptionTier === 'sovren_proof_plus' 
      ? ['cfo', 'cmo', 'cto', 'clo', 'coo', 'chro', 'cso']
      : ['cfo', 'cmo', 'cto'],
    voiceEnabled: true,
    coordinationEnabled: subscriptionTier === 'sovren_proof_plus',
    performanceOptimizationEnabled: true,
    advancedFeaturesEnabled: subscriptionTier === 'sovren_proof_plus',
    analyticsEnabled: true,
    b200AccelerationEnabled: true
  };

  await shadowBoardIntegration.initialize(configuration);
  return shadowBoardIntegration;
}

/**
 * POST /api/shadowboard/integration - Execute executive interaction
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, executiveRole, text, context, requiresVoice, requiresCoordination, priority } = body;

    // Validate required fields
    if (!userId || !executiveRole || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, executiveRole, text' },
        { status: 400 }
      );
    }

    // Get user from database
    const db = getDatabaseManager();
    const userResult = await db.query(
      'SELECT subscription_tier, subscription_status FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];
    if (user.subscription_status !== 'active') {
      return NextResponse.json(
        { error: 'Subscription not active' },
        { status: 403 }
      );
    }

    // Initialize Shadow Board for user
    const shadowBoard = await initializeShadowBoard(userId, user.subscription_tier);

    // Execute executive interaction
    const result = await shadowBoard.executeExecutiveInteraction(executiveRole, {
      text,
      context: context || {},
      requiresVoice: requiresVoice || false,
      requiresCoordination: requiresCoordination || false,
      priority: priority || 'medium'
    });

    // Log interaction to database
    await db.query(`
      INSERT INTO executive_interactions (
        user_id, executive_id, interaction_type, request_data, 
        response_data, performance_metrics, satisfaction_score, duration_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      userId,
      executiveRole,
      requiresVoice ? 'voice' : 'text',
      JSON.stringify({ text, context }),
      JSON.stringify({ response: result.response }),
      JSON.stringify(result.performanceMetrics),
      result.satisfactionPrediction,
      result.performanceMetrics.responseTime
    ]);

    return NextResponse.json({
      success: true,
      data: {
        response: result.response,
        audioUrl: result.audioUrl,
        coordinationSession: result.coordinationSession,
        performanceMetrics: result.performanceMetrics,
        satisfactionPrediction: result.satisfactionPrediction
      }
    });

  } catch (error: unknown) {
    console.error('❌ Shadow Board integration error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/shadowboard/integration - Get Shadow Board status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    // Get user subscription
    const db = getDatabaseManager();
    const userResult = await db.query(
      'SELECT subscription_tier, subscription_status FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // Initialize Shadow Board if needed
    const shadowBoard = await initializeShadowBoard(userId, user.subscription_tier);

    // Get system status
    const status = await shadowBoard.getStatus();
    const capabilities = shadowBoard.getCapabilities();

    // Get user's executives
    const executives = await executiveAccessManager.getUserExecutives(userId);
    const executiveList = Array.from(executives.values()).map(exec => ({
      executiveId: exec.executiveId,
      role: exec.role,
      name: exec.name,
      isActive: true
    }));

    return NextResponse.json({
      success: true,
      data: {
        status,
        capabilities,
        executives: executiveList,
        subscriptionTier: user.subscription_tier,
        subscriptionStatus: user.subscription_status
      }
    });

  } catch (error: unknown) {
    console.error('❌ Shadow Board status error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/shadowboard/integration - Update Shadow Board configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, configuration } = body;

    if (!userId || !configuration) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, configuration' },
        { status: 400 }
      );
    }

    // Validate user access
    const db = getDatabaseManager();
    const userResult = await db.query(
      'SELECT subscription_tier, subscription_status FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];
    if (user.subscription_status !== 'active') {
      return NextResponse.json(
        { error: 'Subscription not active' },
        { status: 403 }
      );
    }

    // Reinitialize Shadow Board with new configuration
    if (shadowBoardIntegration) {
      await shadowBoardIntegration.cleanup();
    }

    shadowBoardIntegration = new SovrenAIShadowBoardIntegration();
    await shadowBoardIntegration.initialize({
      userId,
      subscriptionTier: user.subscription_tier,
      ...configuration
    });

    const status = await shadowBoardIntegration.getStatus();

    return NextResponse.json({
      success: true,
      data: {
        message: 'Shadow Board configuration updated',
        status
      }
    });

  } catch (error: unknown) {
    console.error('❌ Shadow Board configuration update error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/shadowboard/integration - Cleanup Shadow Board resources
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    // Cleanup Shadow Board resources
    if (shadowBoardIntegration) {
      await shadowBoardIntegration.cleanup();
      shadowBoardIntegration = null;
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Shadow Board resources cleaned up'
      }
    });

  } catch (error: unknown) {
    console.error('❌ Shadow Board cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
