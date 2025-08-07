#!/usr/bin/env ts-node

/**
 * B200 SYSTEM INTEGRATION TEST
 * Comprehensive test of B200-accelerated Shadow Board system
 */

import { b200LLMClient } from '../src/lib/inference/B200LLMClient';
import { CFOExecutive } from '../src/lib/shadowboard/CFOExecutive';
import { B200ResourceManager } from '../src/lib/b200/B200ResourceManager';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  details?: string;
  error?: string;
}

class B200SystemTester {
  private results: TestResult[] = [];
  private startTime: number = 0;

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting B200 System Integration Tests...\n');
    
    this.startTime = Date.now();

    // Test 1: MCP Server Connection
    await this.testMCPServerConnection();

    // Test 2: VLLM Server Connection
    await this.testVLLMServerConnection();

    // Test 3: B200 Resource Manager
    await this.testB200ResourceManager();

    // Test 4: B200 LLM Client
    await this.testB200LLMClient();

    // Test 5: CFO Executive B200 Integration
    await this.testCFOExecutiveB200();

    // Test 6: End-to-End Financial Analysis
    await this.testEndToEndFinancialAnalysis();

    // Test 7: Performance Benchmarks
    await this.testPerformanceBenchmarks();

    // Display results
    this.displayResults();
  }

  private async testMCPServerConnection(): Promise<void> {
    const test = 'MCP Server Connection';
    const start = Date.now();

    try {
      const response = await fetch('http://localhost:8000/health');
      if (response.ok) {
        const health = await response.json();
        this.addResult(test, 'PASS', Date.now() - start, `Status: ${health.status}`);
      } else {
        this.addResult(test, 'FAIL', Date.now() - start, `HTTP ${response.status}`);
      }
    } catch (error) {
      this.addResult(test, 'FAIL', Date.now() - start, undefined, error.message);
    }
  }

  private async testVLLMServerConnection(): Promise<void> {
    const test = 'VLLM Server Connection';
    const start = Date.now();

    try {
      const response = await fetch('http://localhost:8001/health');
      if (response.ok) {
        const health = await response.json();
        this.addResult(test, 'PASS', Date.now() - start, 
          `Models: ${health.models_loaded?.join(', ') || 'None'}`);
      } else {
        this.addResult(test, 'FAIL', Date.now() - start, `HTTP ${response.status}`);
      }
    } catch (error) {
      this.addResult(test, 'FAIL', Date.now() - start, undefined, error.message);
    }
  }

  private async testB200ResourceManager(): Promise<void> {
    const test = 'B200 Resource Manager';
    const start = Date.now();

    try {
      const resourceManager = new B200ResourceManager();
      await resourceManager.initialize();
      
      const systemMetrics = resourceManager.getSystemMetrics();
      
      this.addResult(test, 'PASS', Date.now() - start, 
        `GPUs: ${systemMetrics.total_gpus}, Memory: ${systemMetrics.total_memory_gb}GB`);
    } catch (error) {
      this.addResult(test, 'FAIL', Date.now() - start, undefined, error.message);
    }
  }

  private async testB200LLMClient(): Promise<void> {
    const test = 'B200 LLM Client';
    const start = Date.now();

    try {
      await b200LLMClient.initialize();
      
      const models = await b200LLMClient.getAvailableModels();
      const loadedModels = models.filter(m => m.status === 'loaded');
      
      if (loadedModels.length > 0) {
        this.addResult(test, 'PASS', Date.now() - start, 
          `Loaded models: ${loadedModels.map(m => m.id).join(', ')}`);
      } else {
        this.addResult(test, 'FAIL', Date.now() - start, 'No models loaded');
      }
    } catch (error) {
      this.addResult(test, 'FAIL', Date.now() - start, undefined, error.message);
    }
  }

  private async testCFOExecutiveB200(): Promise<void> {
    const test = 'CFO Executive B200 Integration';
    const start = Date.now();

    try {
      const cfo = new CFOExecutive();
      
      // Test simple financial analysis
      const testOpportunity = {
        id: 'test-001',
        name: 'Test Investment',
        amount: 1000000,
        expectedReturn: 0.15,
        riskLevel: 5,
        timeHorizon: 24,
        sector: 'Technology',
        dueDate: new Date()
      };

      // This should use B200 acceleration
      const analysis = await cfo.analyzeFinancialOpportunity(testOpportunity);
      
      if (analysis && analysis.recommendation) {
        this.addResult(test, 'PASS', Date.now() - start, 
          `Recommendation: ${analysis.recommendation.action || 'Generated'}`);
      } else {
        this.addResult(test, 'FAIL', Date.now() - start, 'No analysis generated');
      }
    } catch (error) {
      this.addResult(test, 'FAIL', Date.now() - start, undefined, error.message);
    }
  }

  private async testEndToEndFinancialAnalysis(): Promise<void> {
    const test = 'End-to-End Financial Analysis';
    const start = Date.now();

    try {
      // Test direct B200 LLM inference for financial analysis
      const analysisResult = await b200LLMClient.generateFinancialAnalysis(
        'investment',
        {
          name: 'AI Infrastructure Investment',
          amount: 5000000,
          expectedReturn: 0.25,
          sector: 'Technology',
          riskLevel: 'medium'
        },
        'Analyze this AI infrastructure investment opportunity'
      );

      if (analysisResult && analysisResult.length > 100) {
        this.addResult(test, 'PASS', Date.now() - start, 
          `Analysis length: ${analysisResult.length} chars`);
      } else {
        this.addResult(test, 'FAIL', Date.now() - start, 'Insufficient analysis generated');
      }
    } catch (error) {
      this.addResult(test, 'FAIL', Date.now() - start, undefined, error.message);
    }
  }

  private async testPerformanceBenchmarks(): Promise<void> {
    const test = 'Performance Benchmarks';
    const start = Date.now();

    try {
      const benchmarkPrompt = "Analyze the financial implications of expanding our AI infrastructure with 8x NVIDIA B200 GPUs.";
      
      const inferenceStart = Date.now();
      const result = await b200LLMClient.generateCompletion({
        prompt: benchmarkPrompt,
        max_tokens: 500,
        temperature: 0.7,
        executive_role: 'CFO'
      });
      const inferenceTime = Date.now() - inferenceStart;

      if (result && result.tokens_per_second > 0) {
        this.addResult(test, 'PASS', Date.now() - start, 
          `Inference: ${inferenceTime}ms, Speed: ${result.tokens_per_second.toFixed(1)} tok/s`);
      } else {
        this.addResult(test, 'FAIL', Date.now() - start, 'Performance metrics unavailable');
      }
    } catch (error) {
      this.addResult(test, 'FAIL', Date.now() - start, undefined, error.message);
    }
  }

  private addResult(test: string, status: 'PASS' | 'FAIL' | 'SKIP', duration: number, details?: string, error?: string): void {
    this.results.push({ test, status, duration, details, error });
  }

  private displayResults(): void {
    const totalTime = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;

    console.log('\n' + '='.repeat(80));
    console.log('🎯 B200 SYSTEM TEST RESULTS');
    console.log('='.repeat(80));

    this.results.forEach(result => {
      const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
      const duration = `${result.duration}ms`.padStart(8);
      
      console.log(`${statusIcon} ${result.test.padEnd(35)} ${duration}`);
      
      if (result.details) {
        console.log(`   📊 ${result.details}`);
      }
      
      if (result.error) {
        console.log(`   ❌ ${result.error}`);
      }
      
      console.log('');
    });

    console.log('='.repeat(80));
    console.log(`📈 SUMMARY: ${passed} passed, ${failed} failed, ${skipped} skipped`);
    console.log(`⏱️  Total time: ${totalTime}ms`);
    console.log('='.repeat(80));

    if (failed === 0) {
      console.log('🎉 ALL TESTS PASSED - B200 system is ready for production!');
    } else {
      console.log('⚠️  Some tests failed - check configuration and try again');
      process.exit(1);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new B200SystemTester();
  tester.runAllTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export { B200SystemTester };
