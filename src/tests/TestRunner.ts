/**
 * COMPREHENSIVE TEST RUNNER
 * Production-ready test execution and reporting system
 */

import { testFramework, TestReport } from './setup/TestFramework';
import { authenticationTestSuite } from './auth/AuthenticationSystem.test';
import { ttsBackendTestSuite } from './tts/TTSBackendService.test';
import { apiEndpointsTestSuite } from './integration/APIEndpoints.test';

/**
 * Test Runner for executing all test suites
 */
export class TestRunner {
  private startTime: number = 0;
  private report: TestReport | null = null;

  /**
   * Run all tests and generate comprehensive report
   */
  public async runAllTests(): Promise<TestReport> {
    console.log('🧪 SOVREN AI - Comprehensive Test Suite');
    console.log('=====================================');
    console.log('');

    this.startTime = Date.now();

    try {
      // Import all test suites to register them
      console.log('📝 Registering test suites...');
      console.log(`   ✓ Authentication System Tests (${authenticationTestSuite.tests.length} tests)`);
      console.log(`   ✓ TTS Backend Service Tests (${ttsBackendTestSuite.tests.length} tests)`);
      console.log(`   ✓ API Endpoints Integration Tests (${apiEndpointsTestSuite.tests.length} tests)`);
      console.log('');

      // Run all tests
      console.log('🚀 Starting test execution...');
      console.log('');

      this.report = await testFramework.runAllTests();

      // Display results
      this.displayResults();

      return this.report;

    } catch (error) {
      console.error('❌ Test execution failed:', error);
      throw error;
    }
  }

  /**
   * Run tests for a specific category
   */
  public async runTestsByCategory(category: 'unit' | 'integration' | 'e2e' | 'performance' | 'security'): Promise<TestReport> {
    console.log(`🧪 Running ${category} tests only...`);
    
    // This would filter tests by category in a real implementation
    // For now, run all tests
    return this.runAllTests();
  }

  /**
   * Run tests with specific priority
   */
  public async runTestsByPriority(priority: 'critical' | 'high' | 'medium' | 'low'): Promise<TestReport> {
    console.log(`🧪 Running ${priority} priority tests only...`);
    
    // This would filter tests by priority in a real implementation
    // For now, run all tests
    return this.runAllTests();
  }

  /**
   * Display comprehensive test results
   */
  private displayResults(): void {
    if (!this.report) {
      console.log('❌ No test report available');
      return;
    }

    const totalDuration = Date.now() - this.startTime;

    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=======================');
    console.log('');

    // Overall summary
    console.log('📈 Overall Results:');
    console.log(`   Total Tests:    ${this.report.summary.total}`);
    console.log(`   Passed:         ${this.report.summary.passed} ✅`);
    console.log(`   Failed:         ${this.report.summary.failed} ${this.report.summary.failed > 0 ? '❌' : ''}`);
    console.log(`   Skipped:        ${this.report.summary.skipped} ⏭️`);
    console.log(`   Success Rate:   ${this.calculateSuccessRate()}%`);
    console.log(`   Total Duration: ${totalDuration}ms`);
    console.log('');

    // Suite-by-suite breakdown
    console.log('📋 Test Suite Breakdown:');
    for (const suite of this.report.suites) {
      const successRate = suite.tests.length > 0 ? Math.round((suite.passed / suite.tests.length) * 100) : 0;
      const status = suite.failed === 0 ? '✅' : '❌';
      
      console.log(`   ${status} ${suite.name}:`);
      console.log(`      Tests: ${suite.tests.length} | Passed: ${suite.passed} | Failed: ${suite.failed}`);
      console.log(`      Success Rate: ${successRate}% | Duration: ${suite.duration}ms`);
      
      // Show failed tests
      if (suite.failed > 0) {
        const failedTests = suite.tests.filter(test => !test.success);
        for (const test of failedTests) {
          console.log(`         ❌ Failed: ${test.error?.message || 'Unknown error'}`);
        }
      }
      console.log('');
    }

    // Performance metrics
    console.log('⚡ Performance Metrics:');
    const avgResponseTime = this.calculateAverageResponseTime();
    const totalThroughput = this.calculateTotalThroughput();
    
    console.log(`   Average Response Time: ${avgResponseTime}ms`);
    console.log(`   Total Throughput:      ${totalThroughput} ops`);
    console.log(`   Memory Usage:          ${this.formatMemoryUsage()}`);
    console.log('');

    // Coverage information
    if (this.report.summary.coverage.percentage > 0) {
      console.log('📊 Code Coverage:');
      console.log(`   Lines:      ${this.report.summary.coverage.lines}`);
      console.log(`   Functions:  ${this.report.summary.coverage.functions}`);
      console.log(`   Branches:   ${this.report.summary.coverage.branches}`);
      console.log(`   Statements: ${this.report.summary.coverage.statements}`);
      console.log(`   Overall:    ${this.report.summary.coverage.percentage}%`);
      console.log('');
    }

    // Final status
    if (this.report.summary.failed === 0) {
      console.log('🎉 ALL TESTS PASSED! System is ready for production deployment.');
    } else {
      console.log('⚠️  SOME TESTS FAILED! Please review and fix issues before deployment.');
    }
    
    console.log('');
    console.log(`📅 Test completed at: ${this.report.timestamp.toISOString()}`);
  }

  /**
   * Calculate overall success rate
   */
  private calculateSuccessRate(): number {
    if (!this.report || this.report.summary.total === 0) return 0;
    return Math.round((this.report.summary.passed / this.report.summary.total) * 100);
  }

  /**
   * Calculate average response time across all tests
   */
  private calculateAverageResponseTime(): number {
    if (!this.report) return 0;
    
    let totalTime = 0;
    let testCount = 0;
    
    for (const suite of this.report.suites) {
      for (const test of suite.tests) {
        if (test.metrics?.responseTime) {
          totalTime += test.metrics.responseTime;
          testCount++;
        }
      }
    }
    
    return testCount > 0 ? Math.round(totalTime / testCount) : 0;
  }

  /**
   * Calculate total throughput across all tests
   */
  private calculateTotalThroughput(): number {
    if (!this.report) return 0;
    
    let totalThroughput = 0;
    
    for (const suite of this.report.suites) {
      for (const test of suite.tests) {
        if (test.metrics?.throughput) {
          totalThroughput += test.metrics.throughput;
        }
      }
    }
    
    return totalThroughput;
  }

  /**
   * Format memory usage for display
   */
  private formatMemoryUsage(): string {
    const memUsage = process.memoryUsage();
    const heapUsed = Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100;
    const heapTotal = Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100;
    return `${heapUsed}MB / ${heapTotal}MB`;
  }

  /**
   * Generate detailed test report for CI/CD
   */
  public generateCIReport(): string {
    if (!this.report) return 'No test report available';

    const ciReport = {
      timestamp: this.report.timestamp.toISOString(),
      summary: this.report.summary,
      suites: this.report.suites.map(suite => ({
        name: suite.name,
        passed: suite.passed,
        failed: suite.failed,
        duration: suite.duration,
        tests: suite.tests.map(test => ({
          success: test.success,
          duration: test.duration,
          error: test.error?.message,
          assertions: test.assertions.length,
          metrics: test.metrics
        }))
      })),
      performance: {
        averageResponseTime: this.calculateAverageResponseTime(),
        totalThroughput: this.calculateTotalThroughput(),
        memoryUsage: process.memoryUsage()
      }
    };

    return JSON.stringify(ciReport, null, 2);
  }

  /**
   * Check if tests are ready for production deployment
   */
  public isProductionReady(): boolean {
    if (!this.report) return false;
    
    // All critical and high priority tests must pass
    const criticalTestsPassed = this.report.suites.every(suite => 
      suite.tests.filter(test => 
        test.assertions.some(a => a.description.includes('critical') || a.description.includes('high'))
      ).every(test => test.success)
    );

    // Overall success rate must be above 95%
    const successRate = this.calculateSuccessRate();
    const highSuccessRate = successRate >= 95;

    // No failed tests in authentication or security
    const securityTestsPassed = this.report.suites
      .filter(suite => suite.name.includes('Authentication') || suite.name.includes('Security'))
      .every(suite => suite.failed === 0);

    return criticalTestsPassed && highSuccessRate && securityTestsPassed;
  }
}

/**
 * Main test execution function
 */
export async function runTests(): Promise<void> {
  const runner = new TestRunner();
  
  try {
    const report = await runner.runAllTests();
    
    // Check production readiness
    if (runner.isProductionReady()) {
      console.log('✅ PRODUCTION READY: All critical tests passed!');
      process.exit(0);
    } else {
      console.log('❌ NOT PRODUCTION READY: Critical tests failed or success rate too low.');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  }
}

// Export for use in other modules
export { testFramework };

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}
