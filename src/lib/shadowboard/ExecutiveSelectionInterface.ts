import { BusinessProfile, ExecutiveRecommendation, ExecutiveSelectionResult } from './ShadowBoardManager';
import { ExecutiveRecommendationEngine } from './ExecutiveRecommendationEngine';

/**
 * Executive Selection Interface
 * Handles user onboarding and executive selection process
 */
export class ExecutiveSelectionInterface {
  private recommendationEngine: ExecutiveRecommendationEngine;

  constructor() {
    this.recommendationEngine = new ExecutiveRecommendationEngine();
  }

  /**
   * Complete executive selection process
   */
  public async completeExecutiveSelection(
    businessProfile: BusinessProfile,
    subscriptionTier: 'sovren_proof' | 'sovren_proof_plus',
    userOverrides?: string[]
  ): Promise<ExecutiveSelectionResult> {
    
    // Generate AI recommendations
    const recommendations = this.recommendationEngine.generateRecommendations(businessProfile);
    
    // Get tier configuration
    const tierConfig = this.recommendationEngine.getSubscriptionTierConfig(subscriptionTier);
    
    // Select executives based on recommendations and user preferences
    const selectedExecutives = userOverrides || this.autoSelectExecutives(recommendations, tierConfig.maxExecutives);
    
    // Validate selection
    this.validateSelection(selectedExecutives, tierConfig);
    
    return {
      recommendedExecutives: recommendations,
      selectedExecutives,
      businessProfile,
      selectionReason: this.generateSelectionReason(recommendations, selectedExecutives, businessProfile)
    };
  }

  /**
   * Auto-select executives based on recommendations
   */
  private autoSelectExecutives(recommendations: ExecutiveRecommendation[], maxExecutives: number): string[] {
    return recommendations
      .slice(0, maxExecutives)
      .map(rec => rec.role);
  }

  /**
   * Validate executive selection
   */
  private validateSelection(selectedExecutives: string[], tierConfig: any): void {
    if (selectedExecutives.length > tierConfig.maxExecutives) {
      throw new Error(`Too many executives selected. Maximum allowed: ${tierConfig.maxExecutives}`);
    }

    for (const executive of selectedExecutives) {
      if (!tierConfig.selectableExecutives.includes(executive)) {
        throw new Error(`Executive ${executive} not available for this tier`);
      }
    }
  }

  /**
   * Generate selection reason explanation
   */
  private generateSelectionReason(
    recommendations: ExecutiveRecommendation[],
    selectedExecutives: string[],
    businessProfile: BusinessProfile
  ): string {
    const reasons = [];
    
    reasons.push(`Based on your ${businessProfile.industry} business in ${businessProfile.stage} stage`);
    
    if (businessProfile.primaryChallenges.length > 0) {
      reasons.push(`addressing key challenges: ${businessProfile.primaryChallenges.join(', ')}`);
    }
    
    const selectedRecommendations = recommendations.filter(rec => selectedExecutives.includes(rec.role));
    const topReasons = selectedRecommendations.slice(0, 3).map(rec => rec.reason);
    
    if (topReasons.length > 0) {
      reasons.push(`Key factors: ${topReasons.join('; ')}`);
    }
    
    return reasons.join('. ');
  }

  /**
   * Get executive role descriptions
   */
  public getExecutiveDescriptions(): Record<string, string> {
    return {
      CFO: 'Chief Financial Officer - Financial planning, analysis, fundraising, and investor relations',
      CMO: 'Chief Marketing Officer - Marketing strategy, customer acquisition, brand building, and growth',
      CTO: 'Chief Technology Officer - Technology strategy, product development, and technical leadership',
      CLO: 'Chief Legal Officer - Legal compliance, contract management, risk mitigation, and regulatory affairs',
      COO: 'Chief Operating Officer - Operations management, process optimization, and business execution',
      CHRO: 'Chief Human Resources Officer - Talent acquisition, team development, and organizational culture',
      CSO: 'Chief Strategy Officer - Strategic planning, market analysis, and competitive positioning'
    };
  }

  /**
   * Get industry-specific executive priorities
   */
  public getIndustryPriorities(industry: BusinessProfile['industry']): Record<string, number> {
    const industryPriorities: Record<BusinessProfile['industry'], Record<string, number>> = {
      saas: { CFO: 10, CMO: 9, CTO: 8, CHRO: 6, COO: 5, CLO: 4, CSO: 3 },
      ecommerce: { CMO: 10, COO: 9, CFO: 8, CTO: 6, CHRO: 5, CLO: 4, CSO: 3 },
      consulting: { CHRO: 10, CFO: 9, CLO: 8, CSO: 7, CMO: 6, COO: 5, CTO: 4 },
      manufacturing: { COO: 10, CFO: 9, CTO: 7, CHRO: 6, CMO: 5, CLO: 4, CSO: 3 },
      fintech: { CLO: 10, CTO: 10, CFO: 9, CMO: 6, CHRO: 5, COO: 4, CSO: 3 },
      healthcare: { CLO: 10, COO: 9, CFO: 8, CTO: 7, CHRO: 6, CMO: 5, CSO: 4 },
      other: { CFO: 8, CMO: 7, COO: 6, CTO: 6, CHRO: 5, CLO: 5, CSO: 4 }
    };

    return industryPriorities[industry] || industryPriorities.other;
  }

  /**
   * Generate business profile assessment questions
   */
  public getBusinessProfileQuestions(): any[] {
    return [
      {
        id: 'industry',
        type: 'select',
        question: 'What industry is your business in?',
        options: [
          { value: 'saas', label: 'Software as a Service (SaaS)' },
          { value: 'ecommerce', label: 'E-commerce / Retail' },
          { value: 'consulting', label: 'Consulting / Professional Services' },
          { value: 'manufacturing', label: 'Manufacturing / Industrial' },
          { value: 'fintech', label: 'Financial Technology (FinTech)' },
          { value: 'healthcare', label: 'Healthcare / Medical' },
          { value: 'other', label: 'Other' }
        ],
        required: true
      },
      {
        id: 'stage',
        type: 'select',
        question: 'What stage is your business in?',
        options: [
          { value: 'startup', label: 'Startup (0-2 years, seeking product-market fit)' },
          { value: 'growth', label: 'Growth (2-5 years, scaling operations)' },
          { value: 'scale', label: 'Scale (5+ years, expanding markets)' },
          { value: 'established', label: 'Established (mature business, optimizing)' }
        ],
        required: true
      },
      {
        id: 'teamSize',
        type: 'number',
        question: 'How many people are on your team?',
        placeholder: 'Enter number of team members',
        required: true
      },
      {
        id: 'revenue',
        type: 'select',
        question: 'What is your annual revenue range?',
        options: [
          { value: 'pre-revenue', label: 'Pre-revenue' },
          { value: '0-100k', label: '$0 - $100K' },
          { value: '100k-1m', label: '$100K - $1M' },
          { value: '1m-10m', label: '$1M - $10M' },
          { value: '10m-100m', label: '$10M - $100M' },
          { value: '100m+', label: '$100M+' }
        ],
        required: true
      },
      {
        id: 'primaryChallenges',
        type: 'multiselect',
        question: 'What are your primary business challenges? (Select all that apply)',
        options: [
          { value: 'funding', label: 'Raising funding / Cash flow management' },
          { value: 'customer-acquisition', label: 'Customer acquisition / Marketing' },
          { value: 'product-development', label: 'Product development / Technology' },
          { value: 'operations', label: 'Operations / Process optimization' },
          { value: 'talent', label: 'Hiring / Talent management' },
          { value: 'legal-compliance', label: 'Legal / Regulatory compliance' },
          { value: 'scaling', label: 'Scaling operations / Growth management' },
          { value: 'competition', label: 'Competitive positioning / Strategy' }
        ],
        required: false
      },
      {
        id: 'keyFunctions',
        type: 'multiselect',
        question: 'Which functions are most critical to your business? (Select all that apply)',
        options: [
          { value: 'finance', label: 'Finance / Accounting' },
          { value: 'marketing', label: 'Marketing / Sales' },
          { value: 'technology', label: 'Technology / Product' },
          { value: 'operations', label: 'Operations / Production' },
          { value: 'hr', label: 'Human Resources / Talent' },
          { value: 'legal', label: 'Legal / Compliance' },
          { value: 'strategy', label: 'Strategy / Business Development' }
        ],
        required: false
      },
      {
        id: 'geographicMarkets',
        type: 'multiselect',
        question: 'Which geographic markets do you operate in?',
        options: [
          { value: 'north-america', label: 'North America' },
          { value: 'europe', label: 'Europe' },
          { value: 'asia-pacific', label: 'Asia Pacific' },
          { value: 'latin-america', label: 'Latin America' },
          { value: 'middle-east-africa', label: 'Middle East & Africa' },
          { value: 'global', label: 'Global' }
        ],
        required: false
      }
    ];
  }

  /**
   * Process business profile from form responses
   */
  public processBusinessProfile(responses: Record<string, any>): BusinessProfile {
    return {
      industry: responses.industry || 'other',
      stage: responses.stage || 'startup',
      teamSize: parseInt(responses.teamSize) || 1,
      revenue: responses.revenue || 'pre-revenue',
      primaryChallenges: responses.primaryChallenges || [],
      keyFunctions: responses.keyFunctions || [],
      geographicMarkets: responses.geographicMarkets || ['north-america']
    };
  }

  /**
   * Generate executive selection UI data
   */
  public generateSelectionUI(
    recommendations: ExecutiveRecommendation[],
    tierConfig: any,
    businessProfile: BusinessProfile
  ): any {
    const descriptions = this.getExecutiveDescriptions();
    const priorities = this.getIndustryPriorities(businessProfile.industry);
    
    return {
      tierInfo: {
        name: tierConfig.name,
        maxExecutives: tierConfig.maxExecutives,
        description: `Select up to ${tierConfig.maxExecutives} executives for your Shadow Board`
      },
      recommendations: recommendations.map(rec => ({
        ...rec,
        description: descriptions[rec.role],
        industryPriority: priorities[rec.role] || 5
      })),
      availableExecutives: tierConfig.selectableExecutives.map((role: string) => ({
        role,
        description: descriptions[role],
        priority: priorities[role] || 5,
        recommended: recommendations.some(rec => rec.role === role)
      })),
      businessContext: {
        industry: businessProfile.industry,
        stage: businessProfile.stage,
        challenges: businessProfile.primaryChallenges,
        teamSize: businessProfile.teamSize
      }
    };
  }

  /**
   * Get default executive selection for quick start
   */
  public getDefaultSelection(
    businessProfile: BusinessProfile,
    subscriptionTier: 'sovren_proof' | 'sovren_proof_plus'
  ): string[] {
    const recommendations = this.recommendationEngine.generateRecommendations(businessProfile);
    const tierConfig = this.recommendationEngine.getSubscriptionTierConfig(subscriptionTier);
    
    return this.autoSelectExecutives(recommendations, tierConfig.maxExecutives);
  }
}
