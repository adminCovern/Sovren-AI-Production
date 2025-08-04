/**
 * COMPREHENSIVE TEST FRAMEWORK
 * Production-ready testing infrastructure for SOVREN AI system
 */

import { EventEmitter } from 'events';
import { ErrorHandler, ErrorCategory, ErrorSeverity } from '../../lib/errors/ErrorHandler';
import { container, SERVICE_IDENTIFIERS } from '../../lib/di/DIContainer';
import { Logger } from '../../lib/di/ServiceRegistry';

export interface TestCase {
  id: string;
  name: string;
  description: string;
  category: 'unit' | 'integration' | 'e2e' | 'performance' | 'security';
  priority: 'low' | 'medium' | 'high' | 'critical';
  timeout: number;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  test: () => Promise<TestResult>;
  dependencies?: string[];
  tags?: string[];
}

export interface TestResult {
  success: boolean;
  duration: number;
  error?: Error;
  assertions: AssertionResult[];
  metrics?: TestMetrics;
  coverage?: CoverageData;
}

export interface AssertionResult {
  description: string;
  passed: boolean;
  expected?: unknown;
  actual?: unknown;
  error?: string;
}

export interface TestMetrics {
  memoryUsage: number;
  cpuUsage: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
}

export interface CoverageData {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
  percentage: number;
}

export interface TestSuite {
  name: string;
  description: string;
  tests: TestCase[];
  beforeAll?: () => Promise<void>;
  afterAll?: () => Promise<void>;
  beforeEach?: () => Promise<void>;
  afterEach?: () => Promise<void>;
}

export interface TestReport {
  suites: TestSuiteResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    coverage: CoverageData;
  };
  timestamp: Date;
}

export interface TestSuiteResult {
  name: string;
  tests: TestResult[];
  duration: number;
  passed: number;
  failed: number;
}

/**
 * Comprehensive test framework for production testing
 */
export class TestFramework extends EventEmitter {
  private errorHandler: ErrorHandler;
  private logger: Logger;
  private testSuites: Map<string, TestSuite> = new Map();
  private testResults: Map<string, TestResult> = new Map();
  private isRunning: boolean = false;
  private coverage: CoverageData = {
    lines: 0,
    functions: 0,
    branches: 0,
    statements: 0,
    percentage: 0
  };

  constructor() {
    super();
    this.errorHandler = container.resolve<ErrorHandler>(SERVICE_IDENTIFIERS.ERROR_HANDLER);
    this.logger = container.resolve<Logger>(SERVICE_IDENTIFIERS.LOGGER);
  }

  /**
   * Register a test suite
   */
  public registerSuite(suite: TestSuite): void {
    this.testSuites.set(suite.name, suite);
    this.logger.info(`📝 Registered test suite: ${suite.name} (${suite.tests.length} tests)`);
  }

  /**
   * Run all test suites
   */
  public async runAllTests(): Promise<TestReport> {
    if (this.isRunning) {
      throw new Error('Tests are already running');
    }

    this.isRunning = true;
    this.logger.info('🧪 Starting comprehensive test execution...');

    const startTime = Date.now();
    const suiteResults: TestSuiteResult[] = [];

    try {
      for (const [suiteName, suite] of this.testSuites) {
        this.logger.info(`🔬 Running test suite: ${suiteName}`);
        const suiteResult = await this.runTestSuite(suite);
        suiteResults.push(suiteResult);
        
        this.emit('suiteCompleted', suiteResult);
      }

      const duration = Date.now() - startTime;
      const report = this.generateTestReport(suiteResults, duration);

      this.logger.info('✅ All tests completed', {
        total: report.summary.total,
        passed: report.summary.passed,
        failed: report.summary.failed,
        duration: report.summary.duration,
        coverage: report.summary.coverage.percentage
      });

      this.emit('testsCompleted', report);
      return report;

    } catch (error) {
      const sovrenError = this.errorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        { additionalData: { phase: 'test_execution' } }
      );
      
      this.logger.error('❌ Test execution failed:', sovrenError);
      throw sovrenError;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run a specific test suite
   */
  public async runTestSuite(suite: TestSuite): Promise<TestSuiteResult> {
    const startTime = Date.now();
    const testResults: TestResult[] = [];

    try {
      // Run beforeAll hook
      if (suite.beforeAll) {
        await suite.beforeAll();
      }

      // Run each test
      for (const testCase of suite.tests) {
        try {
          // Run beforeEach hook
          if (suite.beforeEach) {
            await suite.beforeEach();
          }

          const result = await this.runSingleTest(testCase);
          testResults.push(result);
          this.testResults.set(testCase.id, result);

          // Run afterEach hook
          if (suite.afterEach) {
            await suite.afterEach();
          }

        } catch (error) {
          const failedResult: TestResult = {
            success: false,
            duration: 0,
            error: error instanceof Error ? error : new Error(String(error)),
            assertions: []
          };
          testResults.push(failedResult);
        }
      }

      // Run afterAll hook
      if (suite.afterAll) {
        await suite.afterAll();
      }

    } catch (error) {
      this.logger.error(`❌ Test suite ${suite.name} failed:`, error);
    }

    const duration = Date.now() - startTime;
    const passed = testResults.filter(r => r.success).length;
    const failed = testResults.filter(r => !r.success).length;

    return {
      name: suite.name,
      tests: testResults,
      duration,
      passed,
      failed
    };
  }

  /**
   * Run a single test case
   */
  private async runSingleTest(testCase: TestCase): Promise<TestResult> {
    this.logger.debug(`🧪 Running test: ${testCase.name}`);
    
    const startTime = Date.now();
    const timeout = testCase.timeout || 30000; // 30 second default timeout

    try {
      // Setup
      if (testCase.setup) {
        await testCase.setup();
      }

      // Run test with timeout
      const result = await Promise.race([
        testCase.test(),
        new Promise<TestResult>((_, reject) => 
          setTimeout(() => reject(new Error(`Test timeout after ${timeout}ms`)), timeout)
        )
      ]);

      // Teardown
      if (testCase.teardown) {
        await testCase.teardown();
      }

      const duration = Date.now() - startTime;
      result.duration = duration;

      if (result.success) {
        this.logger.debug(`✅ Test passed: ${testCase.name} (${duration}ms)`);
      } else {
        this.logger.warn(`❌ Test failed: ${testCase.name} (${duration}ms)`, result.error);
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error(`💥 Test error: ${testCase.name} (${duration}ms)`, error);
      
      return {
        success: false,
        duration,
        error: error instanceof Error ? error : new Error(String(error)),
        assertions: []
      };
    }
  }

  /**
   * Generate comprehensive test report
   */
  private generateTestReport(suiteResults: TestSuiteResult[], totalDuration: number): TestReport {
    const total = suiteResults.reduce((sum, suite) => sum + suite.tests.length, 0);
    const passed = suiteResults.reduce((sum, suite) => sum + suite.passed, 0);
    const failed = suiteResults.reduce((sum, suite) => sum + suite.failed, 0);
    const skipped = total - passed - failed;

    return {
      suites: suiteResults,
      summary: {
        total,
        passed,
        failed,
        skipped,
        duration: totalDuration,
        coverage: this.coverage
      },
      timestamp: new Date()
    };
  }

  /**
   * Create assertion helper
   */
  public createAssertion(): TestAssertion {
    return new TestAssertion();
  }

  /**
   * Get test statistics
   */
  public getTestStats(): {
    suites: number;
    tests: number;
    results: number;
    coverage: CoverageData;
  } {
    const totalTests = Array.from(this.testSuites.values())
      .reduce((sum, suite) => sum + suite.tests.length, 0);

    return {
      suites: this.testSuites.size,
      tests: totalTests,
      results: this.testResults.size,
      coverage: this.coverage
    };
  }
}

/**
 * Test assertion helper class
 */
export class TestAssertion {
  private assertions: AssertionResult[] = [];

  /**
   * Assert that a value is truthy
   */
  public assertTrue(value: unknown, description: string): this {
    const passed = Boolean(value);
    this.assertions.push({
      description,
      passed,
      expected: true,
      actual: value
    });
    return this;
  }

  /**
   * Assert that a value is falsy
   */
  public assertFalse(value: unknown, description: string): this {
    const passed = !Boolean(value);
    this.assertions.push({
      description,
      passed,
      expected: false,
      actual: value
    });
    return this;
  }

  /**
   * Assert that two values are equal
   */
  public assertEqual(actual: unknown, expected: unknown, description: string): this {
    const passed = actual === expected;
    this.assertions.push({
      description,
      passed,
      expected,
      actual,
      error: passed ? undefined : `Expected ${expected}, got ${actual}`
    });
    return this;
  }

  /**
   * Assert that a function throws an error
   */
  public async assertThrows(fn: () => Promise<unknown> | unknown, description: string): Promise<this> {
    let passed = false;
    let error: string | undefined;

    try {
      await fn();
      error = 'Expected function to throw, but it did not';
    } catch {
      passed = true;
    }

    this.assertions.push({
      description,
      passed,
      error
    });
    return this;
  }

  /**
   * Assert that a value is defined
   */
  public assertDefined(value: unknown, description: string): this {
    const passed = value !== undefined && value !== null;
    this.assertions.push({
      description,
      passed,
      actual: value,
      error: passed ? undefined : 'Expected value to be defined'
    });
    return this;
  }

  /**
   * Get all assertions
   */
  public getAssertions(): AssertionResult[] {
    return [...this.assertions];
  }

  /**
   * Check if all assertions passed
   */
  public allPassed(): boolean {
    return this.assertions.every(a => a.passed);
  }
}

// Global test framework instance
export const testFramework = new TestFramework();
