#!/usr/bin/env node

/**
 * Comprehensive Array Initialization Fix Script
 * Fixes all TypeScript array initialization issues across the entire codebase
 */

const fs = require('fs');
const path = require('path');

// Array patterns that need fixing
const arrayFixes = [
  // Components
  { file: 'src/components/3d/NeuralSky.tsx', pattern: 'const positions = [];', replacement: 'const positions: number[] = [];' },
  { file: 'src/components/3d/NeuralSky.tsx', pattern: 'const colors = [];', replacement: 'const colors: number[] = [];' },
  
  // Lib files - most critical ones
  { file: 'src/lib/autoscaling/B200AutoScaler.ts', pattern: 'const reasons = [];', replacement: 'const reasons: string[] = [];' },
  { file: 'src/lib/b200/B200ResourceManager.ts', pattern: 'const newGPUs = [];', replacement: 'const newGPUs: any[] = [];' },
  { file: 'src/lib/benchmarking/B200PerformanceBenchmark.ts', pattern: 'const allocations = [];', replacement: 'const allocations: any[] = [];' },
  { file: 'src/lib/consciousness/QuantumUserStateEngine.ts', pattern: 'const hooks = [];', replacement: 'const hooks: any[] = [];' },
  { file: 'src/lib/consciousness/QuantumUserStateEngine.ts', pattern: 'const triggers = [];', replacement: 'const triggers: any[] = [];' },
  { file: 'src/lib/consciousness/QuantumUserStateEngine.ts', pattern: 'const suggestions = [];', replacement: 'const suggestions: any[] = [];' },
  { file: 'src/lib/consciousness/QuantumUserStateEngine.ts', pattern: 'const priorities = [];', replacement: 'const priorities: any[] = [];' },
  { file: 'src/lib/consciousness/QuantumUserStateEngine.ts', pattern: 'const nodes = [];', replacement: 'const nodes: any[] = [];' },
  { file: 'src/lib/consciousness/QuantumUserStateEngine.ts', pattern: 'const mutations = [];', replacement: 'const mutations: any[] = [];' },
  { file: 'src/lib/consciousness/QuantumUserStateEngine.ts', pattern: 'const result = [];', replacement: 'const result: any[] = [];' },
  { file: 'src/lib/integrations/CalendarIntegrationSystem.ts', pattern: 'const topics = [];', replacement: 'const topics: any[] = [];' },
  { file: 'src/lib/integrations/CalendarIntegrationSystem.ts', pattern: 'const documents = [];', replacement: 'const documents: any[] = [];' },
  { file: 'src/lib/integrations/CRMIntegrationSystem.ts', pattern: 'const syncPromises = [];', replacement: 'const syncPromises: any[] = [];' },
  { file: 'src/lib/integrations/CRMIntegrationSystem.ts', pattern: 'const recommendations = [];', replacement: 'const recommendations: any[] = [];' },
  { file: 'src/lib/integrations/CRMIntegrationSystem.ts', pattern: 'const signals = [];', replacement: 'const signals: any[] = [];' },
  { file: 'src/lib/integrations/CRMIntegrationSystem.ts', pattern: 'const risks = [];', replacement: 'const risks: any[] = [];' },
  { file: 'src/lib/integrations/CRMIntegrationSystem.ts', pattern: 'const accelerators = [];', replacement: 'const accelerators: any[] = [];' },
  { file: 'src/lib/integrations/CRMIntegrationSystem.ts', pattern: 'const actions = [];', replacement: 'const actions: any[] = [];' },
  { file: 'src/lib/integrations/CRMIntegrationSystem.ts', pattern: 'const opportunities = [];', replacement: 'const opportunities: any[] = [];' },
  { file: 'src/lib/llm/LLMIntegrationSystem.ts', pattern: 'const reasoning = [];', replacement: 'const reasoning: any[] = [];' },
  { file: 'src/lib/onboarding/OnboardingOrchestrator.ts', pattern: 'const nextSteps = [];', replacement: 'const nextSteps: string[] = [];' },
  { file: 'src/lib/shadowboard/CFOExecutive.ts', pattern: 'const scenarios = [];', replacement: 'const scenarios: any[] = [];' },
  { file: 'src/lib/shadowboard/CFOExecutive.ts', pattern: 'const cashFlows = [];', replacement: 'const cashFlows: any[] = [];' },
  { file: 'src/lib/shadowboard/CFOExecutive.ts', pattern: 'const projections = [];', replacement: 'const projections: any[] = [];' },
  { file: 'src/lib/shadowboard/ExecutiveSelectionInterface.ts', pattern: 'const reasons = [];', replacement: 'const reasons: string[] = [];' },
  { file: 'src/lib/shadowboard/ShadowBoardCoordinator.ts', pattern: 'const conflicts = [];', replacement: 'const conflicts: any[] = [];' },
  { file: 'src/lib/socialmedia/EngagementAutomationSystem.ts', pattern: 'const opportunities = [];', replacement: 'const opportunities: any[] = [];' },
  { file: 'src/lib/socialmedia/InfluencerRelationsManager.ts', pattern: 'const recommendations = [];', replacement: 'const recommendations: any[] = [];' },
  { file: 'src/lib/socialmedia/InfluencerRelationsManager.ts', pattern: 'const renewalOpportunities = [];', replacement: 'const renewalOpportunities: any[] = [];' },
  { file: 'src/lib/socialmedia/SocialAnalyticsEngine.ts', pattern: 'const times = [];', replacement: 'const times: any[] = [];' },
  { file: 'src/lib/socialmedia/SocialAnalyticsEngine.ts', pattern: 'const advantages = [];', replacement: 'const advantages: any[] = [];' },
  { file: 'src/lib/socialmedia/SocialAnalyticsEngine.ts', pattern: 'const recommendations = [];', replacement: 'const recommendations: any[] = [];' },
  { file: 'src/lib/socialmedia/SocialAnalyticsEngine.ts', pattern: 'const strengths = [];', replacement: 'const strengths: any[] = [];' },
  { file: 'src/lib/socialmedia/SocialAnalyticsEngine.ts', pattern: 'const areas = [];', replacement: 'const areas: any[] = [];' },
  { file: 'src/lib/socialmedia/SocialAnalyticsEngine.ts', pattern: 'const tactics = [];', replacement: 'const tactics: any[] = [];' },
  { file: 'src/lib/socialmedia/SocialAnalyticsEngine.ts', pattern: 'const risks = [];', replacement: 'const risks: any[] = [];' },
  { file: 'src/lib/socialmedia/SocialAnalyticsEngine.ts', pattern: 'const factors = [];', replacement: 'const factors: any[] = [];' },
  { file: 'src/lib/socialmedia/SocialAnalyticsEngine.ts', pattern: 'const drivers = [];', replacement: 'const drivers: any[] = [];' },
  { file: 'src/lib/socialmedia/SocialAnalyticsEngine.ts', pattern: 'const optimizations = [];', replacement: 'const optimizations: any[] = [];' },
  { file: 'src/lib/socialmedia/SocialAnalyticsEngine.ts', pattern: 'const anomalies = [];', replacement: 'const anomalies: any[] = [];' },
  { file: 'src/lib/socialmedia/SocialAnalyticsEngine.ts', pattern: 'const strategies = [];', replacement: 'const strategies: any[] = [];' },
  { file: 'src/lib/socialmedia/SocialMediaPlatformManager.ts', pattern: 'const recommendations = [];', replacement: 'const recommendations: any[] = [];' },
  { file: 'src/lib/socialmedia/SocialMediaPlatformManager.ts', pattern: 'const times = [];', replacement: 'const times: any[] = [];' },
  { file: 'src/tests/integration/shadowboard-integration.test.ts', pattern: 'const results = [];', replacement: 'const results: any[] = [];' }
];

console.log('🔧 Starting comprehensive array initialization fix...');

let fixedCount = 0;
let errorCount = 0;

arrayFixes.forEach(fix => {
  try {
    const filePath = path.join(__dirname, fix.file);
    
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      if (content.includes(fix.pattern)) {
        content = content.replace(new RegExp(fix.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fix.replacement);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Fixed: ${fix.file}`);
        fixedCount++;
      } else {
        console.log(`⚠️  Pattern not found in: ${fix.file}`);
      }
    } else {
      console.log(`❌ File not found: ${fix.file}`);
      errorCount++;
    }
  } catch (error) {
    console.error(`❌ Error fixing ${fix.file}:`, error.message);
    errorCount++;
  }
});

console.log(`\n🎉 Array initialization fix complete!`);
console.log(`✅ Fixed: ${fixedCount} files`);
console.log(`❌ Errors: ${errorCount} files`);
console.log(`\nRun 'npm run build' to verify all TypeScript errors are resolved.`);
