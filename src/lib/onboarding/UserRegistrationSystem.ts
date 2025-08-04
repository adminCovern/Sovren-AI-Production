/**
 * SOVREN AI - User Registration System
 * 
 * Complete user registration and authentication system with
 * tier detection, validation, and initial profile creation.
 * 
 * CLASSIFICATION: USER REGISTRATION INFRASTRUCTURE
 */

import { EventEmitter } from 'events';

export interface UserRegistration {
  userId: string;
  registrationId: string;
  email: string;
  name: string;
  company: string;
  industry: string;
  companySize: string;
  geography: string;
  tier: 'SMB' | 'ENTERPRISE';
  status: 'pending' | 'verified' | 'active' | 'suspended';
  registrationTime: Date;
  verificationTime?: Date;
  lastLogin?: Date;
  preferences: UserPreferences;
  metadata: RegistrationMetadata;
}

export interface UserPreferences {
  industry: string;
  companySize: string;
  geography: string;
  primaryUseCase: string;
  integrationPreferences: string[];
  communicationPreferences: {
    email: boolean;
    sms: boolean;
    voice: boolean;
    slack: boolean;
  };
  executiveCustomization: {
    namePreferences: boolean;
    voicePreferences: boolean;
    personalityAdjustments: boolean;
  };
  notificationSettings: {
    onboardingUpdates: boolean;
    systemAlerts: boolean;
    marketingEmails: boolean;
    productUpdates: boolean;
  };
}

export interface RegistrationMetadata {
  ipAddress: string;
  userAgent: string;
  referralSource?: string;
  utmParameters?: Record<string, string>;
  registrationChannel: 'web' | 'mobile' | 'api' | 'referral';
  deviceInfo: {
    platform: string;
    browser: string;
    screenResolution: string;
  };
  geolocation?: {
    country: string;
    region: string;
    city: string;
    timezone: string;
  };
}

export interface RegistrationValidation {
  field: string;
  rule: 'required' | 'email' | 'phone' | 'url' | 'length' | 'pattern' | 'custom';
  value: any;
  isValid: boolean;
  errorMessage?: string;
  suggestions?: string[];
}

export interface TierDetectionResult {
  detectedTier: 'SMB' | 'ENTERPRISE';
  confidence: number; // 0-1 scale
  factors: TierFactor[];
  recommendation: string;
  customizationOptions: string[];
}

export interface TierFactor {
  factor: string;
  value: any;
  weight: number;
  contribution: 'SMB' | 'ENTERPRISE' | 'NEUTRAL';
  description: string;
}

export class UserRegistrationSystem extends EventEmitter {
  private registrations: Map<string, UserRegistration> = new Map();
  private verificationCodes: Map<string, { code: string; expires: Date; attempts: number }> = new Map();
  private tierDetectionRules: Map<string, any> = new Map();

  constructor() {
    super();
    this.initializeTierDetectionRules();
    this.startRegistrationMonitoring();
  }

  /**
   * Initialize tier detection rules
   */
  private initializeTierDetectionRules(): void {
    this.tierDetectionRules.set('company_size', {
      'startup': { tier: 'SMB', weight: 0.8 },
      '1-10': { tier: 'SMB', weight: 0.9 },
      '11-50': { tier: 'SMB', weight: 0.7 },
      '51-200': { tier: 'SMB', weight: 0.3 },
      '201-1000': { tier: 'ENTERPRISE', weight: 0.6 },
      '1000+': { tier: 'ENTERPRISE', weight: 0.9 }
    });

    this.tierDetectionRules.set('industry', {
      'technology': { tier: 'SMB', weight: 0.2 },
      'finance': { tier: 'ENTERPRISE', weight: 0.6 },
      'healthcare': { tier: 'ENTERPRISE', weight: 0.5 },
      'manufacturing': { tier: 'ENTERPRISE', weight: 0.7 },
      'retail': { tier: 'SMB', weight: 0.4 },
      'consulting': { tier: 'SMB', weight: 0.6 }
    });

    console.log('🎯 Tier detection rules initialized');
  }

  /**
   * Start registration monitoring
   */
  private startRegistrationMonitoring(): void {
    // Clean up expired verification codes every 5 minutes
    setInterval(() => {
      this.cleanupExpiredVerifications();
    }, 300000);

    // Monitor registration analytics every hour
    setInterval(() => {
      this.updateRegistrationAnalytics();
    }, 3600000);

    console.log('📊 Registration monitoring started');
  }

  /**
   * Register new user
   */
  public async registerUser(registrationData: {
    email: string;
    name: string;
    company: string;
    industry: string;
    companySize: string;
    geography: string;
    primaryUseCase: string;
    metadata: RegistrationMetadata;
  }): Promise<UserRegistration> {
    
    console.log(`👤 Registering new user: ${registrationData.email}`);

    // Validate registration data
    const validationResults = await this.validateRegistrationData(registrationData);
    const invalidFields = validationResults.filter(v => !v.isValid);
    
    if (invalidFields.length > 0) {
      throw new Error(`Registration validation failed: ${invalidFields.map(f => f.errorMessage).join(', ')}`);
    }

    // Check for existing user
    const existingUser = this.findUserByEmail(registrationData.email);
    if (existingUser) {
      throw new Error('User already exists with this email address');
    }

    // Detect user tier
    const tierDetection = await this.detectUserTier(registrationData);

    // Generate user ID
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const registrationId = `reg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create user preferences
    const preferences: UserPreferences = {
      industry: registrationData.industry,
      companySize: registrationData.companySize,
      geography: registrationData.geography,
      primaryUseCase: registrationData.primaryUseCase,
      integrationPreferences: this.suggestIntegrations(registrationData.industry),
      communicationPreferences: {
        email: true,
        sms: false,
        voice: false,
        slack: false
      },
      executiveCustomization: {
        namePreferences: tierDetection.detectedTier === 'ENTERPRISE',
        voicePreferences: tierDetection.detectedTier === 'ENTERPRISE',
        personalityAdjustments: tierDetection.detectedTier === 'ENTERPRISE'
      },
      notificationSettings: {
        onboardingUpdates: true,
        systemAlerts: true,
        marketingEmails: true,
        productUpdates: true
      }
    };

    // Create registration
    const registration: UserRegistration = {
      userId,
      registrationId,
      email: registrationData.email,
      name: registrationData.name,
      company: registrationData.company,
      industry: registrationData.industry,
      companySize: registrationData.companySize,
      geography: registrationData.geography,
      tier: tierDetection.detectedTier,
      status: 'pending',
      registrationTime: new Date(),
      preferences,
      metadata: registrationData.metadata
    };

    // Store registration
    this.registrations.set(userId, registration);

    // Send verification email
    await this.sendVerificationEmail(registration);

    console.log(`✅ User registered successfully: ${userId} (${tierDetection.detectedTier})`);

    this.emit('userRegistered', {
      registration,
      tierDetection,
      validationResults
    });

    return registration;
  }

  /**
   * Verify user email
   */
  public async verifyUserEmail(userId: string, verificationCode: string): Promise<boolean> {
    console.log(`📧 Verifying email for user: ${userId}`);

    const registration = this.registrations.get(userId);
    if (!registration) {
      throw new Error('User registration not found');
    }

    const verification = this.verificationCodes.get(userId);
    if (!verification) {
      throw new Error('Verification code not found or expired');
    }

    // Check if code is expired
    if (new Date() > verification.expires) {
      this.verificationCodes.delete(userId);
      throw new Error('Verification code has expired');
    }

    // Check attempts
    if (verification.attempts >= 3) {
      this.verificationCodes.delete(userId);
      throw new Error('Too many verification attempts');
    }

    // Verify code
    if (verification.code !== verificationCode) {
      verification.attempts++;
      throw new Error('Invalid verification code');
    }

    // Mark as verified
    registration.status = 'verified';
    registration.verificationTime = new Date();
    this.verificationCodes.delete(userId);

    console.log(`✅ Email verified for user: ${userId}`);

    this.emit('emailVerified', registration);

    return true;
  }

  /**
   * Activate user account
   */
  public async activateUser(userId: string): Promise<UserRegistration> {
    console.log(`🚀 Activating user account: ${userId}`);

    const registration = this.registrations.get(userId);
    if (!registration) {
      throw new Error('User registration not found');
    }

    if (registration.status !== 'verified') {
      throw new Error('User email must be verified before activation');
    }

    registration.status = 'active';
    registration.lastLogin = new Date();

    console.log(`✅ User account activated: ${userId}`);

    this.emit('userActivated', registration);

    return registration;
  }

  /**
   * Detect user tier based on registration data
   */
  private async detectUserTier(registrationData: any): Promise<TierDetectionResult> {
    const factors: TierFactor[] = [];
    let smbScore = 0;
    let enterpriseScore = 0;

    // Company size factor
    const companySizeRules = this.tierDetectionRules.get('company_size');
    const companySizeRule = companySizeRules[registrationData.companySize];
    if (companySizeRule) {
      factors.push({
        factor: 'company_size',
        value: registrationData.companySize,
        weight: companySizeRule.weight,
        contribution: companySizeRule.tier,
        description: `Company size indicates ${companySizeRule.tier} tier`
      });

      if (companySizeRule.tier === 'SMB') {
        smbScore += companySizeRule.weight;
      } else {
        enterpriseScore += companySizeRule.weight;
      }
    }

    // Industry factor
    const industryRules = this.tierDetectionRules.get('industry');
    const industryRule = industryRules[registrationData.industry];
    if (industryRule) {
      factors.push({
        factor: 'industry',
        value: registrationData.industry,
        weight: industryRule.weight,
        contribution: industryRule.tier,
        description: `Industry ${registrationData.industry} typically ${industryRule.tier}`
      });

      if (industryRule.tier === 'SMB') {
        smbScore += industryRule.weight;
      } else {
        enterpriseScore += industryRule.weight;
      }
    }

    // Use case factor
    const useCaseWeight = 0.3;
    if (registrationData.primaryUseCase.includes('enterprise') || 
        registrationData.primaryUseCase.includes('team') ||
        registrationData.primaryUseCase.includes('organization')) {
      factors.push({
        factor: 'use_case',
        value: registrationData.primaryUseCase,
        weight: useCaseWeight,
        contribution: 'ENTERPRISE',
        description: 'Use case indicates enterprise needs'
      });
      enterpriseScore += useCaseWeight;
    } else {
      factors.push({
        factor: 'use_case',
        value: registrationData.primaryUseCase,
        weight: useCaseWeight,
        contribution: 'SMB',
        description: 'Use case indicates SMB needs'
      });
      smbScore += useCaseWeight;
    }

    // Determine tier
    const detectedTier: 'SMB' | 'ENTERPRISE' = enterpriseScore > smbScore ? 'ENTERPRISE' : 'SMB';
    const confidence = Math.abs(enterpriseScore - smbScore) / Math.max(enterpriseScore, smbScore);

    return {
      detectedTier,
      confidence,
      factors,
      recommendation: `Based on analysis, ${detectedTier} tier is recommended with ${(confidence * 100).toFixed(1)}% confidence`,
      customizationOptions: detectedTier === 'ENTERPRISE' ? 
        ['Advanced Shadow Board customization', 'Team access controls', 'Custom integrations'] :
        ['Standard Shadow Board setup', 'Basic integrations', 'Individual user focus']
    };
  }

  /**
   * Validate registration data
   */
  private async validateRegistrationData(data: any): Promise<RegistrationValidation[]> {
    const validations: RegistrationValidation[] = [];

    // Email validation
    validations.push({
      field: 'email',
      rule: 'email',
      value: data.email,
      isValid: this.isValidEmail(data.email),
      errorMessage: this.isValidEmail(data.email) ? undefined : 'Invalid email format'
    });

    // Name validation
    validations.push({
      field: 'name',
      rule: 'required',
      value: data.name,
      isValid: data.name && data.name.trim().length > 0,
      errorMessage: data.name && data.name.trim().length > 0 ? undefined : 'Name is required'
    });

    // Company validation
    validations.push({
      field: 'company',
      rule: 'required',
      value: data.company,
      isValid: data.company && data.company.trim().length > 0,
      errorMessage: data.company && data.company.trim().length > 0 ? undefined : 'Company name is required'
    });

    // Industry validation
    const validIndustries = ['technology', 'finance', 'healthcare', 'manufacturing', 'retail', 'consulting', 'other'];
    validations.push({
      field: 'industry',
      rule: 'custom',
      value: data.industry,
      isValid: validIndustries.includes(data.industry),
      errorMessage: validIndustries.includes(data.industry) ? undefined : 'Please select a valid industry'
    });

    return validations;
  }

  /**
   * Send verification email
   */
  private async sendVerificationEmail(registration: UserRegistration): Promise<void> {
    const verificationCode = Math.random().toString(36).substr(2, 8).toUpperCase();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    this.verificationCodes.set(registration.userId, {
      code: verificationCode,
      expires,
      attempts: 0
    });

    // Simulate email sending
    console.log(`📧 Verification email sent to ${registration.email} with code: ${verificationCode}`);

    this.emit('verificationEmailSent', {
      registration,
      verificationCode,
      expires
    });
  }

  /**
   * Helper methods
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private findUserByEmail(email: string): UserRegistration | null {
    for (const registration of this.registrations.values()) {
      if (registration.email.toLowerCase() === email.toLowerCase()) {
        return registration;
      }
    }
    return null;
  }

  private suggestIntegrations(industry: string): string[] {
    const integrationMap: Record<string, string[]> = {
      'technology': ['github', 'slack', 'jira', 'salesforce'],
      'finance': ['salesforce', 'hubspot', 'quickbooks', 'excel'],
      'healthcare': ['salesforce', 'epic', 'cerner', 'outlook'],
      'manufacturing': ['salesforce', 'sap', 'oracle', 'outlook'],
      'retail': ['shopify', 'salesforce', 'mailchimp', 'google_analytics'],
      'consulting': ['salesforce', 'hubspot', 'outlook', 'slack']
    };

    return integrationMap[industry] || ['salesforce', 'outlook', 'slack'];
  }

  private cleanupExpiredVerifications(): void {
    const now = new Date();
    for (const [userId, verification] of this.verificationCodes) {
      if (now > verification.expires) {
        this.verificationCodes.delete(userId);
      }
    }
  }

  private updateRegistrationAnalytics(): void {
    const totalRegistrations = this.registrations.size;
    const verifiedUsers = Array.from(this.registrations.values()).filter(r => r.status === 'verified' || r.status === 'active').length;
    const activeUsers = Array.from(this.registrations.values()).filter(r => r.status === 'active').length;

    console.log(`📊 Registration Analytics: ${totalRegistrations} total, ${verifiedUsers} verified, ${activeUsers} active`);
  }

  /**
   * Public methods
   */
  public getUserRegistration(userId: string): UserRegistration | null {
    return this.registrations.get(userId) || null;
  }

  public getUserByEmail(email: string): UserRegistration | null {
    return this.findUserByEmail(email);
  }

  public getRegistrationStats(): {
    total: number;
    pending: number;
    verified: number;
    active: number;
    suspended: number;
    smbUsers: number;
    enterpriseUsers: number;
  } {
    const registrations = Array.from(this.registrations.values());
    
    return {
      total: registrations.length,
      pending: registrations.filter(r => r.status === 'pending').length,
      verified: registrations.filter(r => r.status === 'verified').length,
      active: registrations.filter(r => r.status === 'active').length,
      suspended: registrations.filter(r => r.status === 'suspended').length,
      smbUsers: registrations.filter(r => r.tier === 'SMB').length,
      enterpriseUsers: registrations.filter(r => r.tier === 'ENTERPRISE').length
    };
  }

  public async resendVerificationEmail(userId: string): Promise<void> {
    const registration = this.registrations.get(userId);
    if (!registration) {
      throw new Error('User registration not found');
    }

    if (registration.status !== 'pending') {
      throw new Error('User is already verified');
    }

    await this.sendVerificationEmail(registration);
  }
}
