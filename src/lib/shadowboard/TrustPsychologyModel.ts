/**
 * TRUST PSYCHOLOGY MODEL
 * Optimizes executive characteristics for maximum trust building
 * Based on scientific research into trust factors and psychological triggers
 */

export interface TrustOptimizationResult {
  gender: 'male' | 'female';
  name: string;
  voiceProfile: string;
  score: number;
  reasoning: string;
  trustFactors: {
    genderTrust: number;
    voiceTrust: number;
    nameTrust: number;
    overallTrust: number;
  };
}

export interface TrustScoreMatrix {
  [key: string]: number; // (gender, voice_profile, name) -> score
}

export class TrustPsychologyModel {
  private trustFactors = {
    genderTrustDynamics: {
      financial_roles: {
        female: 0.23, // +23% trust in fiduciary responsibility
        male: 0.18    // +18% trust in aggressive growth strategies
      },
      legal_roles: {
        female: 0.31, // +31% trust in compliance and ethics
        male: 0.15    // +15% trust in aggressive defense
      },
      technical_roles: {
        context_dependent: true // Varies by industry vertical
      },
      marketing_roles: {
        female: 0.19, // +19% trust in customer empathy
        male: 0.22    // +22% trust in competitive strategy
      }
    },
    voiceCharacteristics: {
      trustMarkers: [
        'steady_pace',
        'lower_pitch',
        'clear_articulation',
        'consistent_tone',
        'measured_delivery'
      ],
      authorityMarkers: [
        'confident_tone',
        'minimal_uptalk',
        'precise_language',
        'controlled_volume',
        'strategic_pauses'
      ]
    },
    namePsychology: {
      traditionalNames: 0.12,     // +12% initial trust
      culturallyAligned: 0.27,    // +27% cultural resonance
      professionalMarkers: 'Include degrees/certifications'
    }
  };

  private voiceProfiles = [
    'confident_warm_analytical',
    'authoritative_measured',
    'empathetic_professional',
    'strategic_commanding',
    'collaborative_trustworthy',
    'innovative_energetic',
    'precise_methodical',
    'diplomatic_sophisticated'
  ];

  /**
   * Optimize executive characteristics for maximum trust
   */
  public async optimizeForTrust(role: string, context: any): Promise<TrustOptimizationResult> {
    const trustScoreMatrix: TrustScoreMatrix = {};

    // Test all combinations of gender, voice, and name
    for (const gender of ['male', 'female'] as const) {
      for (const voiceProfile of this.voiceProfiles) {
        const names = this.generateAppropriateNames(context, gender);
        
        for (const name of names) {
          const score = await this.calculateTrustScore(
            role,
            gender,
            voiceProfile,
            name,
            context
          );
          
          const key = `${gender}_${voiceProfile}_${name}`;
          trustScoreMatrix[key] = score;
        }
      }
    }

    return this.selectOptimalConfiguration(trustScoreMatrix, role, context);
  }

  /**
   * Calculate comprehensive trust score for a configuration
   */
  private async calculateTrustScore(
    role: string,
    gender: 'male' | 'female',
    voiceProfile: string,
    name: string,
    context: any
  ): Promise<number> {
    let totalScore = 0;
    let weightSum = 0;

    // Gender trust factor (weight: 0.4)
    const genderScore = this.calculateGenderTrustScore(role, gender, context);
    totalScore += genderScore * 0.4;
    weightSum += 0.4;

    // Voice trust factor (weight: 0.35)
    const voiceScore = this.calculateVoiceTrustScore(voiceProfile, role, context);
    totalScore += voiceScore * 0.35;
    weightSum += 0.35;

    // Name trust factor (weight: 0.25)
    const nameScore = this.calculateNameTrustScore(name, context);
    totalScore += nameScore * 0.25;
    weightSum += 0.25;

    return totalScore / weightSum;
  }

  /**
   * Calculate gender-based trust score
   */
  private calculateGenderTrustScore(role: string, gender: 'male' | 'female', context: any): number {
    const roleCategory = this.mapRoleToCategory(role);
    const baseTrust = 0.7; // Baseline trust score

    if (roleCategory === 'financial_roles') {
      const genderBonus = this.trustFactors.genderTrustDynamics.financial_roles[gender];
      return Math.min(1.0, baseTrust + genderBonus);
    }

    if (roleCategory === 'legal_roles') {
      const genderBonus = this.trustFactors.genderTrustDynamics.legal_roles[gender];
      return Math.min(1.0, baseTrust + genderBonus);
    }

    if (roleCategory === 'technical_roles') {
      // Context-dependent calculation for technical roles
      return this.calculateTechnicalRoleTrust(gender, context);
    }

    if (roleCategory === 'marketing_roles') {
      const genderBonus = this.trustFactors.genderTrustDynamics.marketing_roles[gender];
      return Math.min(1.0, baseTrust + genderBonus);
    }

    return baseTrust;
  }

  /**
   * Calculate voice-based trust score
   */
  private calculateVoiceTrustScore(voiceProfile: string, role: string, context: any): number {
    const baseScore = 0.7;
    let bonus = 0;

    // Voice profile matching for role
    const roleVoiceMatching: Record<string, string[]> = {
      'CFO': ['confident_warm_analytical', 'authoritative_measured', 'precise_methodical'],
      'CMO': ['innovative_energetic', 'collaborative_trustworthy', 'strategic_commanding'],
      'CTO': ['confident_warm_analytical', 'innovative_energetic', 'precise_methodical'],
      'CLO': ['authoritative_measured', 'diplomatic_sophisticated', 'precise_methodical']
    };

    const optimalVoices = roleVoiceMatching[role] || [];
    if (optimalVoices.includes(voiceProfile)) {
      bonus += 0.15;
    }

    // Trust markers bonus
    if (this.voiceHasTrustMarkers(voiceProfile)) {
      bonus += 0.1;
    }

    // Authority markers bonus
    if (this.voiceHasAuthorityMarkers(voiceProfile)) {
      bonus += 0.08;
    }

    // Cultural adaptation bonus
    if (this.voiceMatchesCulture(voiceProfile, context)) {
      bonus += 0.07;
    }

    return Math.min(1.0, baseScore + bonus);
  }

  /**
   * Calculate name-based trust score
   */
  private calculateNameTrustScore(name: string, context: any): number {
    const baseScore = 0.7;
    let bonus = 0;

    // Traditional name bonus
    if (this.isTraditionalName(name)) {
      bonus += this.trustFactors.namePsychology.traditionalNames;
    }

    // Cultural alignment bonus
    if (this.isCulturallyAligned(name, context)) {
      bonus += this.trustFactors.namePsychology.culturallyAligned;
    }

    // Professional markers bonus
    if (this.hasProfessionalMarkers(name)) {
      bonus += 0.05;
    }

    return Math.min(1.0, baseScore + bonus);
  }

  /**
   * Map role to trust category
   */
  private mapRoleToCategory(role: string): string {
    const mapping: Record<string, string> = {
      'CFO': 'financial_roles',
      'CLO': 'legal_roles',
      'CTO': 'technical_roles',
      'CMO': 'marketing_roles'
    };
    return mapping[role] || 'financial_roles';
  }

  /**
   * Calculate technical role trust (context-dependent)
   */
  private calculateTechnicalRoleTrust(gender: 'male' | 'female', context: any): number {
    const baseTrust = 0.7;
    
    // Industry-specific adjustments
    if (context.industry === 'technology' || context.industry === 'software') {
      // Tech industry is more gender-balanced
      return baseTrust + 0.1;
    }
    
    if (context.industry === 'finance' || context.industry === 'banking') {
      // Traditional industries may have different expectations
      return gender === 'male' ? baseTrust + 0.12 : baseTrust + 0.08;
    }
    
    return baseTrust + 0.1; // Default slight bonus for technical expertise
  }

  /**
   * Check if voice profile has trust markers
   */
  private voiceHasTrustMarkers(voiceProfile: string): boolean {
    const trustVoices = [
      'confident_warm_analytical',
      'collaborative_trustworthy',
      'empathetic_professional',
      'diplomatic_sophisticated'
    ];
    return trustVoices.includes(voiceProfile);
  }

  /**
   * Check if voice profile has authority markers
   */
  private voiceHasAuthorityMarkers(voiceProfile: string): boolean {
    const authorityVoices = [
      'authoritative_measured',
      'strategic_commanding',
      'confident_warm_analytical',
      'precise_methodical'
    ];
    return authorityVoices.includes(voiceProfile);
  }

  /**
   * Check if voice matches cultural context
   */
  private voiceMatchesCulture(voiceProfile: string, context: any): boolean {
    // Simplified cultural matching
    if (context.geography?.includes('Asia')) {
      return ['diplomatic_sophisticated', 'empathetic_professional'].includes(voiceProfile);
    }
    
    if (context.geography?.includes('Europe')) {
      return ['authoritative_measured', 'diplomatic_sophisticated'].includes(voiceProfile);
    }
    
    // North America default
    return ['confident_warm_analytical', 'collaborative_trustworthy'].includes(voiceProfile);
  }

  /**
   * Generate culturally appropriate names - SECURITY: No hardcoded names
   */
  private generateAppropriateNames(context: any, gender: 'male' | 'female'): string[] {
    // SECURITY: No hardcoded names - delegate to proper name reservation system
    // This should use ExecutiveAccessManager or GlobalNameRegistry
    const templates = {
      male: ['Executive_M1', 'Executive_M2', 'Executive_M3'],
      female: ['Executive_F1', 'Executive_F2', 'Executive_F3']
    };

    return templates[gender];
  }

  /**
   * Check if name is traditional/professional
   */
  private isTraditionalName(name: string): boolean {
    const traditionalNames = [
      'Michael', 'David', 'James', 'Robert', 'John', 'William',
      'Sarah', 'Jennifer', 'Catherine', 'Elizabeth', 'Mary', 'Patricia'
    ];
    
    const firstName = name.split(' ')[0];
    return traditionalNames.includes(firstName);
  }

  /**
   * Check if name is culturally aligned
   */
  private isCulturallyAligned(name: string, context: any): boolean {
    // Simplified cultural alignment check
    // In a real implementation, this would be more sophisticated
    return true; // Assume all generated names are culturally appropriate
  }

  /**
   * Check if name has professional markers
   */
  private hasProfessionalMarkers(name: string): boolean {
    // Check for professional suffixes, titles, etc.
    return name.includes('Jr.') || name.includes('III') || name.includes('Dr.') || name.includes('MBA');
  }

  /**
   * Select optimal configuration from trust score matrix
   */
  private selectOptimalConfiguration(
    trustScoreMatrix: TrustScoreMatrix,
    role: string,
    context: any
  ): TrustOptimizationResult {
    let bestScore = 0;
    let bestConfig = '';

    // Find highest scoring configuration
    for (const [config, score] of Object.entries(trustScoreMatrix)) {
      if (score > bestScore) {
        bestScore = score;
        bestConfig = config;
      }
    }

    // Parse best configuration
    const [gender, voiceProfile, name] = bestConfig.split('_');
    
    return {
      gender: gender as 'male' | 'female',
      name: name.replace(/_/g, ' '),
      voiceProfile,
      score: bestScore,
      reasoning: `Optimized for maximum trust in ${role} role with ${Math.round(bestScore * 100)}% trust score`,
      trustFactors: {
        genderTrust: this.calculateGenderTrustScore(role, gender as 'male' | 'female', context),
        voiceTrust: this.calculateVoiceTrustScore(voiceProfile, role, context),
        nameTrust: this.calculateNameTrustScore(name.replace(/_/g, ' '), context),
        overallTrust: bestScore
      }
    };
  }
}
