import { BusinessProfile, ExecutiveRecommendation, ExecutiveSelectionResult } from './ShadowBoardManager';

/**
 * Executive Recommendation Engine
 * Provides AI-powered recommendations for executive selection based on business profile
 */
export class ExecutiveRecommendationEngine {
  
  /**
   * Generate executive recommendations based on business profile
   */
  public generateRecommendations(profile: BusinessProfile): ExecutiveRecommendation[] {
    const recommendations: ExecutiveRecommendation[] = [];
    
    // Industry-specific recommendations
    recommendations.push(...this.getIndustryRecommendations(profile.industry));
    
    // Stage-specific recommendations
    recommendations.push(...this.getStageRecommendations(profile.stage));
    
    // Challenge-specific recommendations
    recommendations.push(...this.getChallengeRecommendations(profile.primaryChallenges));
    
    // Function-specific recommendations
    recommendations.push(...this.getFunctionRecommendations(profile.keyFunctions));
    
    // Size-specific recommendations
    recommendations.push(...this.getSizeRecommendations(profile.teamSize));
    
    // Merge and prioritize recommendations
    const mergedRecommendations = this.mergeRecommendations(recommendations);
    
    // Sort by priority and confidence
    return mergedRecommendations.sort((a, b) => {
      const priorityScore = this.getPriorityScore(b.priority) - this.getPriorityScore(a.priority);
      if (priorityScore !== 0) return priorityScore;
      return b.confidence - a.confidence;
    });
  }

  /**
   * Industry-specific executive recommendations
   */
  private getIndustryRecommendations(industry: BusinessProfile['industry']): ExecutiveRecommendation[] {
    const industryMap: Record<BusinessProfile['industry'], ExecutiveRecommendation[]> = {
      saas: [
        {
          role: 'CFO',
          priority: 'critical',
          reason: 'SaaS requires sophisticated unit economics, burn rate management, and investor relations',
          businessValue: 'Financial discipline and fundraising capability essential for SaaS growth',
          confidence: 95
        },
        {
          role: 'CMO',
          priority: 'critical',
          reason: 'Customer acquisition and growth marketing are fundamental to SaaS success',
          businessValue: 'Drives customer acquisition, retention, and viral growth strategies',
          confidence: 92
        },
        {
          role: 'CTO',
          priority: 'high',
          reason: 'Product development and technical scaling critical for SaaS platforms',
          businessValue: 'Ensures product reliability, scalability, and technical innovation',
          confidence: 88
        },
        {
          role: 'CHRO',
          priority: 'medium',
          reason: 'Rapid talent acquisition needed for scaling SaaS teams',
          businessValue: 'Builds high-performing teams and maintains culture during growth',
          confidence: 75
        }
      ],
      ecommerce: [
        {
          role: 'CMO',
          priority: 'critical',
          reason: 'E-commerce success depends on digital marketing and customer acquisition',
          businessValue: 'Drives online traffic, conversion optimization, and brand building',
          confidence: 94
        },
        {
          role: 'COO',
          priority: 'high',
          reason: 'Operations, supply chain, and fulfillment are core to e-commerce',
          businessValue: 'Optimizes logistics, inventory management, and customer experience',
          confidence: 90
        },
        {
          role: 'CFO',
          priority: 'high',
          reason: 'Inventory management, cash flow, and unit economics require financial expertise',
          businessValue: 'Manages working capital, profitability, and financial planning',
          confidence: 85
        },
        {
          role: 'CTO',
          priority: 'medium',
          reason: 'Platform reliability and performance impact customer experience',
          businessValue: 'Ensures website performance, security, and technical infrastructure',
          confidence: 78
        }
      ],
      consulting: [
        {
          role: 'CHRO',
          priority: 'critical',
          reason: 'Consulting is a people business - talent is the primary asset',
          businessValue: 'Recruits top talent, manages consultant development and retention',
          confidence: 96
        },
        {
          role: 'CFO',
          priority: 'high',
          reason: 'Project profitability, resource allocation, and financial management crucial',
          businessValue: 'Optimizes project margins, manages cash flow, and financial planning',
          confidence: 88
        },
        {
          role: 'CLO',
          priority: 'high',
          reason: 'Contract management, client agreements, and legal compliance essential',
          businessValue: 'Manages client contracts, reduces legal risks, ensures compliance',
          confidence: 85
        },
        {
          role: 'CSO',
          priority: 'medium',
          reason: 'Strategic positioning and market development drive growth',
          businessValue: 'Develops market strategy, competitive positioning, and growth plans',
          confidence: 80
        }
      ],
      manufacturing: [
        {
          role: 'COO',
          priority: 'critical',
          reason: 'Manufacturing operations, supply chain, and production efficiency are core',
          businessValue: 'Optimizes production, manages supply chain, ensures quality control',
          confidence: 95
        },
        {
          role: 'CFO',
          priority: 'high',
          reason: 'Capital allocation, inventory management, and cost control essential',
          businessValue: 'Manages working capital, cost optimization, and financial planning',
          confidence: 90
        },
        {
          role: 'CTO',
          priority: 'medium',
          reason: 'Technology and automation drive manufacturing efficiency',
          businessValue: 'Implements automation, improves processes, drives innovation',
          confidence: 82
        },
        {
          role: 'CHRO',
          priority: 'medium',
          reason: 'Skilled workforce and safety management critical in manufacturing',
          businessValue: 'Manages workforce development, safety programs, and labor relations',
          confidence: 78
        }
      ],
      fintech: [
        {
          role: 'CLO',
          priority: 'critical',
          reason: 'Financial services require extensive regulatory compliance and legal oversight',
          businessValue: 'Ensures regulatory compliance, manages legal risks, handles licensing',
          confidence: 98
        },
        {
          role: 'CTO',
          priority: 'critical',
          reason: 'Security, scalability, and technical infrastructure are paramount in fintech',
          businessValue: 'Ensures platform security, scalability, and technical innovation',
          confidence: 95
        },
        {
          role: 'CFO',
          priority: 'high',
          reason: 'Financial modeling, risk management, and capital requirements essential',
          businessValue: 'Manages financial risks, capital allocation, and regulatory reporting',
          confidence: 92
        },
        {
          role: 'CMO',
          priority: 'medium',
          reason: 'Trust building and customer acquisition in regulated environment',
          businessValue: 'Builds brand trust, manages customer acquisition in regulated space',
          confidence: 80
        }
      ],
      healthcare: [
        {
          role: 'CLO',
          priority: 'critical',
          reason: 'Healthcare requires extensive regulatory compliance and legal oversight',
          businessValue: 'Ensures HIPAA compliance, manages regulatory risks, handles licensing',
          confidence: 97
        },
        {
          role: 'COO',
          priority: 'high',
          reason: 'Healthcare operations, quality assurance, and patient safety are critical',
          businessValue: 'Manages operations, ensures quality standards, optimizes patient care',
          confidence: 90
        },
        {
          role: 'CFO',
          priority: 'high',
          reason: 'Healthcare financing, insurance, and cost management are complex',
          businessValue: 'Manages healthcare economics, insurance relations, cost optimization',
          confidence: 87
        },
        {
          role: 'CTO',
          priority: 'medium',
          reason: 'Healthcare technology, data security, and system integration important',
          businessValue: 'Ensures data security, system integration, and technology innovation',
          confidence: 83
        }
      ],
      other: [
        {
          role: 'CFO',
          priority: 'high',
          reason: 'Financial management is essential for all businesses',
          businessValue: 'Provides financial planning, analysis, and strategic guidance',
          confidence: 85
        },
        {
          role: 'CMO',
          priority: 'high',
          reason: 'Marketing and customer acquisition drive business growth',
          businessValue: 'Develops marketing strategy and drives customer acquisition',
          confidence: 82
        },
        {
          role: 'COO',
          priority: 'medium',
          reason: 'Operational efficiency important for most businesses',
          businessValue: 'Optimizes operations and improves business processes',
          confidence: 78
        },
        {
          role: 'CTO',
          priority: 'medium',
          reason: 'Technology plays a role in most modern businesses',
          businessValue: 'Manages technology infrastructure and drives digital transformation',
          confidence: 75
        }
      ]
    };

    return industryMap[industry] || industryMap.other;
  }

  /**
   * Stage-specific executive recommendations
   */
  private getStageRecommendations(stage: BusinessProfile['stage']): ExecutiveRecommendation[] {
    const stageMap: Record<BusinessProfile['stage'], ExecutiveRecommendation[]> = {
      startup: [
        {
          role: 'CFO',
          priority: 'critical',
          reason: 'Startups need financial planning, fundraising, and burn rate management',
          businessValue: 'Essential for fundraising, financial planning, and investor relations',
          confidence: 95
        },
        {
          role: 'CMO',
          priority: 'high',
          reason: 'Market validation and early customer acquisition are crucial',
          businessValue: 'Drives market validation, customer acquisition, and product-market fit',
          confidence: 88
        }
      ],
      growth: [
        {
          role: 'COO',
          priority: 'high',
          reason: 'Growth stage requires operational scaling and process optimization',
          businessValue: 'Scales operations, optimizes processes, manages rapid growth',
          confidence: 90
        },
        {
          role: 'CHRO',
          priority: 'high',
          reason: 'Rapid hiring and team building essential during growth phase',
          businessValue: 'Manages rapid hiring, builds culture, develops talent',
          confidence: 87
        }
      ],
      scale: [
        {
          role: 'CSO',
          priority: 'high',
          reason: 'Scaling requires strategic planning and market expansion',
          businessValue: 'Develops expansion strategy, manages strategic initiatives',
          confidence: 85
        },
        {
          role: 'CLO',
          priority: 'medium',
          reason: 'Legal complexity increases with scale and market expansion',
          businessValue: 'Manages legal complexity, compliance, and risk management',
          confidence: 80
        }
      ],
      established: [
        {
          role: 'CSO',
          priority: 'medium',
          reason: 'Established companies need strategic renewal and innovation',
          businessValue: 'Drives strategic innovation and competitive positioning',
          confidence: 82
        },
        {
          role: 'CTO',
          priority: 'medium',
          reason: 'Technology modernization and digital transformation important',
          businessValue: 'Modernizes technology stack and drives digital transformation',
          confidence: 78
        }
      ]
    };

    return stageMap[stage] || [];
  }

  /**
   * Challenge-specific executive recommendations
   */
  private getChallengeRecommendations(challenges: string[]): ExecutiveRecommendation[] {
    const recommendations: ExecutiveRecommendation[] = [];
    
    for (const challenge of challenges) {
      const lowerChallenge = challenge.toLowerCase();
      
      if (lowerChallenge.includes('funding') || lowerChallenge.includes('cash flow')) {
        recommendations.push({
          role: 'CFO',
          priority: 'critical',
          reason: 'Financial challenges require expert CFO guidance',
          businessValue: 'Addresses funding and cash flow management needs',
          confidence: 92
        });
      }
      
      if (lowerChallenge.includes('marketing') || lowerChallenge.includes('customer acquisition')) {
        recommendations.push({
          role: 'CMO',
          priority: 'high',
          reason: 'Marketing and customer acquisition challenges need CMO expertise',
          businessValue: 'Solves customer acquisition and marketing effectiveness issues',
          confidence: 90
        });
      }
      
      if (lowerChallenge.includes('operations') || lowerChallenge.includes('scaling')) {
        recommendations.push({
          role: 'COO',
          priority: 'high',
          reason: 'Operational and scaling challenges require COO leadership',
          businessValue: 'Optimizes operations and manages scaling challenges',
          confidence: 88
        });
      }
      
      if (lowerChallenge.includes('technology') || lowerChallenge.includes('technical')) {
        recommendations.push({
          role: 'CTO',
          priority: 'high',
          reason: 'Technical challenges need CTO expertise and leadership',
          businessValue: 'Addresses technology challenges and drives innovation',
          confidence: 87
        });
      }
      
      if (lowerChallenge.includes('legal') || lowerChallenge.includes('compliance')) {
        recommendations.push({
          role: 'CLO',
          priority: 'high',
          reason: 'Legal and compliance challenges require CLO oversight',
          businessValue: 'Manages legal risks and ensures regulatory compliance',
          confidence: 89
        });
      }
      
      if (lowerChallenge.includes('hiring') || lowerChallenge.includes('talent')) {
        recommendations.push({
          role: 'CHRO',
          priority: 'high',
          reason: 'Talent and hiring challenges need CHRO leadership',
          businessValue: 'Solves talent acquisition and HR management issues',
          confidence: 86
        });
      }
    }
    
    return recommendations;
  }

  /**
   * Function-specific executive recommendations
   */
  private getFunctionRecommendations(functions: string[]): ExecutiveRecommendation[] {
    const recommendations: ExecutiveRecommendation[] = [];
    
    for (const func of functions) {
      const lowerFunc = func.toLowerCase();
      
      if (lowerFunc.includes('finance') || lowerFunc.includes('accounting')) {
        recommendations.push({
          role: 'CFO',
          priority: 'high',
          reason: 'Financial functions require CFO expertise',
          businessValue: 'Manages financial functions and strategic planning',
          confidence: 90
        });
      }
      
      if (lowerFunc.includes('marketing') || lowerFunc.includes('sales')) {
        recommendations.push({
          role: 'CMO',
          priority: 'high',
          reason: 'Marketing and sales functions need CMO leadership',
          businessValue: 'Drives marketing and sales effectiveness',
          confidence: 88
        });
      }
      
      if (lowerFunc.includes('operations') || lowerFunc.includes('production')) {
        recommendations.push({
          role: 'COO',
          priority: 'high',
          reason: 'Operations functions require COO oversight',
          businessValue: 'Optimizes operational functions and efficiency',
          confidence: 87
        });
      }
    }
    
    return recommendations;
  }

  /**
   * Size-specific executive recommendations
   */
  private getSizeRecommendations(teamSize: number): ExecutiveRecommendation[] {
    if (teamSize < 10) {
      return [
        {
          role: 'CFO',
          priority: 'high',
          reason: 'Small teams need financial discipline and planning',
          businessValue: 'Provides financial structure for small team growth',
          confidence: 85
        }
      ];
    } else if (teamSize < 50) {
      return [
        {
          role: 'CHRO',
          priority: 'medium',
          reason: 'Growing teams need HR structure and talent management',
          businessValue: 'Builds HR processes and manages team growth',
          confidence: 80
        }
      ];
    } else {
      return [
        {
          role: 'COO',
          priority: 'high',
          reason: 'Large teams need operational structure and management',
          businessValue: 'Provides operational leadership for large organizations',
          confidence: 88
        }
      ];
    }
  }

  /**
   * Merge duplicate recommendations and combine confidence scores
   */
  private mergeRecommendations(recommendations: ExecutiveRecommendation[]): ExecutiveRecommendation[] {
    const merged = new Map<string, ExecutiveRecommendation>();
    
    for (const rec of recommendations) {
      const existing = merged.get(rec.role);
      if (existing) {
        // Combine recommendations for the same role
        existing.confidence = Math.max(existing.confidence, rec.confidence);
        existing.priority = this.getHigherPriority(existing.priority, rec.priority);
        existing.businessValue += ` | ${rec.businessValue}`;
        existing.reason += ` | ${rec.reason}`;
      } else {
        merged.set(rec.role, { ...rec });
      }
    }
    
    return Array.from(merged.values());
  }

  /**
   * Get higher priority between two priorities
   */
  private getHigherPriority(p1: ExecutiveRecommendation['priority'], p2: ExecutiveRecommendation['priority']): ExecutiveRecommendation['priority'] {
    const priorities = ['low', 'medium', 'high', 'critical'];
    const p1Index = priorities.indexOf(p1);
    const p2Index = priorities.indexOf(p2);
    return p1Index > p2Index ? p1 : p2;
  }

  /**
   * Get numeric priority score for sorting
   */
  private getPriorityScore(priority: ExecutiveRecommendation['priority']): number {
    const scores = { low: 1, medium: 2, high: 3, critical: 4 };
    return scores[priority];
  }

  /**
   * Get subscription tier configuration
   */
  public getSubscriptionTierConfig(tier: string): any {
    const tiers = {
      sovren_proof: {
        name: 'SOVREN Proof',
        maxExecutives: 4,
        selectableExecutives: ['CFO', 'CMO', 'CTO', 'CLO', 'COO', 'CHRO', 'CSO']
      },
      sovren_proof_plus: {
        name: 'SOVREN Proof Plus',
        maxExecutives: 8,
        selectableExecutives: ['CFO', 'CMO', 'CTO', 'CLO', 'COO', 'CHRO', 'CSO']
      }
    };
    
    return tiers[tier as keyof typeof tiers];
  }
}
