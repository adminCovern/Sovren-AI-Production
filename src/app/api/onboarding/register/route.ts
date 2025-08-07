/**
 * SOVREN AI USER REGISTRATION & ONBOARDING API
 * Complete user registration with tier selection and executive customization
 */

import { NextRequest, NextResponse } from 'next/server';
import { authSystem } from '@/lib/auth/AuthenticationSystem';
import { dbManager } from '@/lib/database/DatabaseManager';
import { shadowBoardInitializer } from '@/lib/shadowboard/ShadowBoardInitializer';
import { PhoneProvisioningManager } from '@/lib/telephony/PhoneProvisioningManager';
import { rateLimiters, getClientId } from '@/middleware/rateLimit';
import { randomBytes } from 'crypto';

export interface RegistrationRequest {
  // Basic info
  email: string;
  name: string;
  company: string;
  password: string; // Add password field

  // Tier selection
  tier: 'SMB' | 'ENTERPRISE';

  // Company details
  industry: string;
  companySize: 'startup' | 'small' | 'medium' | 'large';
  geography: string;

  // Executive customization (optional)
  executiveCustomization?: {
    executiveNames?: Record<string, string>;
    voicePreferences?: Record<string, string>;
    personalityAdjustments?: Record<string, any>;
  };

  // Preferences
  preferences: {
    theme: 'dark' | 'light';
    notifications: boolean;
    autoExecutiveSummoning: boolean;
    voiceEnabled: boolean;
  };
}

export interface RegistrationResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    tier: 'SMB' | 'ENTERPRISE';
  };
  shadowBoard?: {
    executives: any[];
    initializationTime: number;
  };
  onboardingToken?: string;
  nextSteps?: string[];
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting
    const clientId = getClientId(request);
    const { allowed, info } = await rateLimiters.auth.checkLimit(clientId);
    
    if (!allowed) {
      return NextResponse.json({
        success: false,
        error: 'Too many registration attempts. Please try again later.'
      } as RegistrationResponse, { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': info.limit.toString(),
          'X-RateLimit-Remaining': info.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(info.resetTime.getTime() / 1000).toString()
        }
      });
    }

    // Parse and validate request
    const body: RegistrationRequest = await request.json();
    
    // Validate required fields
    const requiredFields = ['email', 'name', 'company', 'password', 'tier', 'industry', 'companySize', 'geography'];
    for (const field of requiredFields) {
      if (!body[field as keyof RegistrationRequest]) {
        return NextResponse.json({
          success: false,
          error: `Missing required field: ${field}`
        } as RegistrationResponse, { status: 400 });
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email format'
      } as RegistrationResponse, { status: 400 });
    }

    // Validate tier
    if (!['SMB', 'ENTERPRISE'].includes(body.tier)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid tier. Must be SMB or ENTERPRISE'
      } as RegistrationResponse, { status: 400 });
    }

    console.log(`🚀 Starting registration for: ${body.email} (${body.tier})`);

    // Check if user already exists
    const existingUser = await dbManager.getUserByEmail(body.email);
    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'User already exists with this email'
      } as RegistrationResponse, { status: 409 });
    }

    // Register user
    const authResult = await authSystem.registerUser(body.email, body.name, body.password, body.tier);
    
    if (!authResult.success) {
      console.error(`❌ Registration failed for ${body.email}:`, authResult.error);
      return NextResponse.json({
        success: false,
        error: authResult.error || 'Registration failed'
      } as RegistrationResponse, { status: 500 });
    }

    // Create user in database
    const userData = await dbManager.createUser({
      email: body.email,
      name: body.name,
      tier: body.tier,
      preferences: {
        // Basic preferences from request
        theme: body.preferences.theme === 'dark' ? 'dark' : body.preferences.theme === 'light' ? 'light' : 'auto',
        language: 'en',
        timezone: 'UTC',
        notifications: {
          email: body.preferences.notifications,
          push: body.preferences.notifications,
          sms: false
        },
        voiceSettings: {
          preferredVoice: 'default',
          speechRate: 1.0,
          volume: 0.8
        },
        executivePreferences: {
          defaultExecutives: [],
          communicationStyle: 'mixed' as const
        },
        privacy: {
          dataRetention: 365,
          analyticsOptOut: false,
          shareUsageData: true
        },
        // Company and business context
        company: body.company,
        industry: body.industry,
        companySize: body.companySize,
        geography: body.geography,
        // Additional onboarding preferences
        autoExecutiveSummoning: body.preferences.autoExecutiveSummoning,
        voiceEnabled: body.preferences.voiceEnabled
      }
    });

    console.log(`✅ User created: ${userData.id}`);

    // Initialize Shadow Board
    console.log(`🧠 Initializing Shadow Board for ${body.tier} user...`);
    
    const shadowBoardConfig = {
      userId: userData.id,
      tier: body.tier,
      industry: body.industry,
      geography: body.geography,
      companySize: body.companySize,
      customization: body.executiveCustomization
    };

    const shadowBoardResult = await shadowBoardInitializer.initializeShadowBoard(shadowBoardConfig);

    if (!shadowBoardResult.success) {
      console.error(`❌ Shadow Board initialization failed:`, shadowBoardResult.errors);
      // Don't fail registration, but log the issue
    }

    console.log(`✅ Shadow Board initialized: ${shadowBoardResult.executives.length} executives`);

    // Provision phone numbers for user
    console.log(`📞 Provisioning phone numbers for ${body.tier} user...`);

    const phoneProvisioningManager = new PhoneProvisioningManager({
      apiKey: process.env.SKYETEL_API_KEY!,
      apiSecret: process.env.SKYETEL_API_SECRET!,
      baseUrl: process.env.SKYETEL_API_URL || 'https://api.skyetel.com/v1',
      sipDomain: process.env.SIP_DOMAIN || 'sip.sovren.ai'
    });

    // Map tier to phone provisioning tier
    const phoneProvisioningTier = body.tier === 'SMB' ? 'sovren_proof' : 'sovren_proof_plus';

    const phoneProvisioningResult = await phoneProvisioningManager.provisionUserPhoneNumbers({
      userId: userData.id,
      subscriptionTier: phoneProvisioningTier,
      geography: body.geography,
      userEmail: body.email,
      companyName: body.company
    });

    if (!phoneProvisioningResult.success) {
      console.error(`❌ Phone provisioning failed:`, phoneProvisioningResult.error);
      // Don't fail registration, but log the issue
    } else {
      console.log(`✅ Phone numbers provisioned: ${phoneProvisioningResult.allocation?.phoneNumbers.sovrenAI}`);
    }

    // Generate onboarding token for tutorial
    const onboardingToken = generateOnboardingToken(userData.id);

    // Determine next steps based on tier
    const nextSteps = getNextSteps(body.tier, shadowBoardResult.success);

    const response: RegistrationResponse = {
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        tier: userData.tier
      },
      shadowBoard: shadowBoardResult.success ? {
        executives: shadowBoardResult.executives.map(exec => ({
          id: exec.id,
          name: exec.name,
          role: exec.role,
          voiceModel: exec.voiceModel
        })),
        initializationTime: shadowBoardResult.metrics.initializationTime
      } : undefined,
      onboardingToken,
      nextSteps
    };

    console.log(`🎉 Registration completed for ${body.email}`);

    // Set secure HTTP-only cookie for auto-login
    const nextResponse = NextResponse.json(response);
    
    nextResponse.cookies.set('auth-token', authResult.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    });

    nextResponse.cookies.set('onboarding-token', onboardingToken, {
      httpOnly: false, // Allow client access for tutorial
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60, // 1 hour
      path: '/'
    });

    return nextResponse;

  } catch (error) {
    console.error('❌ Registration endpoint error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error during registration'
    } as RegistrationResponse, { status: 500 });
  }
}

/**
 * Generate onboarding token for tutorial system
 */
function generateOnboardingToken(userId: string): string {
  const timestamp = Date.now();
  const randomSuffix = randomBytes(8).toString('hex').substring(0, 13);
  return `onboard_${userId}_${timestamp}_${randomSuffix}`;
}

/**
 * Get next steps based on user tier and setup status
 */
function getNextSteps(tier: 'SMB' | 'ENTERPRISE', shadowBoardSuccess: boolean): string[] {
  const baseSteps = [
    'Complete your profile setup',
    'Take the interactive tutorial',
    'Meet your Shadow Board executives'
  ];

  if (!shadowBoardSuccess) {
    baseSteps.push('Retry Shadow Board initialization');
  }

  if (tier === 'SMB') {
    return [
      ...baseSteps,
      'Connect your CRM system',
      'Set up email integration',
      'Configure voice preferences',
      'Start your first executive consultation'
    ];
  } else {
    return [
      ...baseSteps,
      'Configure enterprise integrations',
      'Set up team access controls',
      'Connect multiple CRM systems',
      'Configure advanced analytics',
      'Schedule executive strategy session'
    ];
  }
}

export async function OPTIONS(_request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}
