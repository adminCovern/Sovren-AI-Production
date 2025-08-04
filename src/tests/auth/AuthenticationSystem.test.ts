/**
 * AUTHENTICATION SYSTEM TESTS
 * Comprehensive test suite for authentication security and functionality
 */

import { testFramework, TestSuite, TestCase, TestResult } from '../setup/TestFramework';
import { authSystem } from '../../lib/auth/AuthenticationSystem';
import { dbManager } from '../../lib/database/DatabaseManager';

/**
 * Authentication System Test Suite
 */
const authenticationTestSuite: TestSuite = {
  name: 'AuthenticationSystem',
  description: 'Comprehensive tests for authentication security and functionality',
  
  beforeAll: async () => {
    // Initialize database and auth system
    await dbManager.connect();
    await authSystem.initialize();
  },

  afterAll: async () => {
    // Cleanup
    await dbManager.disconnect();
  },

  beforeEach: async () => {
    // Clean up test data before each test
    // In production, this would clean test database
  },

  afterEach: async () => {
    // Clean up after each test
  },

  tests: [
    // User Registration Tests
    {
      id: 'auth-001',
      name: 'User Registration - Valid Data',
      description: 'Should successfully register a new user with valid data',
      category: 'unit',
      priority: 'critical',
      timeout: 5000,
      test: async (): Promise<TestResult> => {
        const assert = testFramework.createAssertion();
        const startTime = Date.now();

        try {
          const userData = {
            email: 'test@example.com',
            password: 'SecurePassword123!',
            name: 'Test User',
            tier: 'SMB' as const
          };

          const result = await authSystem.register(userData);

          assert.assertTrue(result.success, 'Registration should succeed');
          assert.assertDefined(result.user, 'User should be returned');
          assert.assertDefined(result.token, 'Token should be generated');
          assert.assertEqual(result.user?.email, userData.email, 'Email should match');
          assert.assertEqual(result.user?.name, userData.name, 'Name should match');

          return {
            success: assert.allPassed(),
            duration: Date.now() - startTime,
            assertions: assert.getAssertions()
          };
        } catch (error) {
          return {
            success: false,
            duration: Date.now() - startTime,
            error: error instanceof Error ? error : new Error(String(error)),
            assertions: assert.getAssertions()
          };
        }
      }
    },

    {
      id: 'auth-002',
      name: 'User Registration - Duplicate Email',
      description: 'Should reject registration with duplicate email',
      category: 'unit',
      priority: 'high',
      timeout: 5000,
      test: async (): Promise<TestResult> => {
        const assert = testFramework.createAssertion();
        const startTime = Date.now();

        try {
          const userData = {
            email: 'duplicate@example.com',
            password: 'SecurePassword123!',
            name: 'Test User',
            tier: 'SMB' as const
          };

          // Register first user
          await authSystem.register(userData);

          // Try to register duplicate
          const result = await authSystem.register(userData);

          assert.assertFalse(result.success, 'Duplicate registration should fail');
          assert.assertDefined(result.error, 'Error message should be provided');

          return {
            success: assert.allPassed(),
            duration: Date.now() - startTime,
            assertions: assert.getAssertions()
          };
        } catch (error) {
          return {
            success: false,
            duration: Date.now() - startTime,
            error: error instanceof Error ? error : new Error(String(error)),
            assertions: assert.getAssertions()
          };
        }
      }
    },

    {
      id: 'auth-003',
      name: 'User Registration - Weak Password',
      description: 'Should reject registration with weak password',
      category: 'unit',
      priority: 'high',
      timeout: 5000,
      test: async (): Promise<TestResult> => {
        const assert = testFramework.createAssertion();
        const startTime = Date.now();

        try {
          const userData = {
            email: 'weakpass@example.com',
            password: '123', // Weak password
            name: 'Test User',
            tier: 'SMB' as const
          };

          const result = await authSystem.register(userData);

          assert.assertFalse(result.success, 'Weak password should be rejected');
          assert.assertDefined(result.error, 'Error message should be provided');

          return {
            success: assert.allPassed(),
            duration: Date.now() - startTime,
            assertions: assert.getAssertions()
          };
        } catch (error) {
          return {
            success: false,
            duration: Date.now() - startTime,
            error: error instanceof Error ? error : new Error(String(error)),
            assertions: assert.getAssertions()
          };
        }
      }
    },

    // Authentication Tests
    {
      id: 'auth-004',
      name: 'User Authentication - Valid Credentials',
      description: 'Should successfully authenticate with valid credentials',
      category: 'unit',
      priority: 'critical',
      timeout: 5000,
      setup: async () => {
        // Create test user
        await authSystem.register({
          email: 'auth-test@example.com',
          password: 'SecurePassword123!',
          name: 'Auth Test User',
          tier: 'SMB'
        });
      },
      test: async (): Promise<TestResult> => {
        const assert = testFramework.createAssertion();
        const startTime = Date.now();

        try {
          const result = await authSystem.authenticate('auth-test@example.com', 'SecurePassword123!');

          assert.assertTrue(result.success, 'Authentication should succeed');
          assert.assertDefined(result.user, 'User should be returned');
          assert.assertDefined(result.token, 'Token should be generated');
          assert.assertEqual(result.user?.email, 'auth-test@example.com', 'Email should match');

          return {
            success: assert.allPassed(),
            duration: Date.now() - startTime,
            assertions: assert.getAssertions()
          };
        } catch (error) {
          return {
            success: false,
            duration: Date.now() - startTime,
            error: error instanceof Error ? error : new Error(String(error)),
            assertions: assert.getAssertions()
          };
        }
      }
    },

    {
      id: 'auth-005',
      name: 'User Authentication - Invalid Password',
      description: 'Should reject authentication with invalid password',
      category: 'unit',
      priority: 'critical',
      timeout: 5000,
      test: async (): Promise<TestResult> => {
        const assert = testFramework.createAssertion();
        const startTime = Date.now();

        try {
          const result = await authSystem.authenticate('auth-test@example.com', 'WrongPassword');

          assert.assertFalse(result.success, 'Authentication should fail');
          assert.assertDefined(result.error, 'Error message should be provided');

          return {
            success: assert.allPassed(),
            duration: Date.now() - startTime,
            assertions: assert.getAssertions()
          };
        } catch (error) {
          return {
            success: false,
            duration: Date.now() - startTime,
            error: error instanceof Error ? error : new Error(String(error)),
            assertions: assert.getAssertions()
          };
        }
      }
    },

    // Token Validation Tests
    {
      id: 'auth-006',
      name: 'Token Validation - Valid Token',
      description: 'Should successfully validate a valid JWT token',
      category: 'unit',
      priority: 'high',
      timeout: 5000,
      test: async (): Promise<TestResult> => {
        const assert = testFramework.createAssertion();
        const startTime = Date.now();

        try {
          // First authenticate to get a token
          const authResult = await authSystem.authenticate('auth-test@example.com', 'SecurePassword123!');
          assert.assertTrue(authResult.success, 'Authentication should succeed');
          assert.assertDefined(authResult.token, 'Token should be generated');

          // Then validate the token
          const validationResult = await authSystem.validateToken(authResult.token!);
          
          assert.assertTrue(validationResult.valid, 'Token should be valid');
          assert.assertDefined(validationResult.user, 'User should be returned');
          assert.assertEqual(validationResult.user?.email, 'auth-test@example.com', 'Email should match');

          return {
            success: assert.allPassed(),
            duration: Date.now() - startTime,
            assertions: assert.getAssertions()
          };
        } catch (error) {
          return {
            success: false,
            duration: Date.now() - startTime,
            error: error instanceof Error ? error : new Error(String(error)),
            assertions: assert.getAssertions()
          };
        }
      }
    },

    {
      id: 'auth-007',
      name: 'Token Validation - Invalid Token',
      description: 'Should reject invalid JWT token',
      category: 'unit',
      priority: 'high',
      timeout: 5000,
      test: async (): Promise<TestResult> => {
        const assert = testFramework.createAssertion();
        const startTime = Date.now();

        try {
          const invalidToken = 'invalid.jwt.token';
          const result = await authSystem.validateToken(invalidToken);

          assert.assertFalse(result.valid, 'Invalid token should be rejected');
          assert.assertDefined(result.error, 'Error message should be provided');

          return {
            success: assert.allPassed(),
            duration: Date.now() - startTime,
            assertions: assert.getAssertions()
          };
        } catch (error) {
          return {
            success: false,
            duration: Date.now() - startTime,
            error: error instanceof Error ? error : new Error(String(error)),
            assertions: assert.getAssertions()
          };
        }
      }
    },

    // Security Tests
    {
      id: 'auth-008',
      name: 'Account Lockout - Multiple Failed Attempts',
      description: 'Should lock account after multiple failed login attempts',
      category: 'security',
      priority: 'critical',
      timeout: 10000,
      test: async (): Promise<TestResult> => {
        const assert = testFramework.createAssertion();
        const startTime = Date.now();

        try {
          const email = 'lockout-test@example.com';
          
          // Create test user
          await authSystem.register({
            email,
            password: 'SecurePassword123!',
            name: 'Lockout Test User',
            tier: 'SMB'
          });

          // Attempt multiple failed logins
          for (let i = 0; i < 6; i++) {
            await authSystem.authenticate(email, 'WrongPassword');
          }

          // Next attempt should be locked
          const result = await authSystem.authenticate(email, 'SecurePassword123!');
          
          assert.assertFalse(result.success, 'Account should be locked');
          assert.assertTrue(
            result.error?.includes('locked') || result.error?.includes('too many attempts') || false,
            'Error should indicate account lockout'
          );

          return {
            success: assert.allPassed(),
            duration: Date.now() - startTime,
            assertions: assert.getAssertions()
          };
        } catch (error) {
          return {
            success: false,
            duration: Date.now() - startTime,
            error: error instanceof Error ? error : new Error(String(error)),
            assertions: assert.getAssertions()
          };
        }
      }
    }
  ]
};

// Register the test suite
testFramework.registerSuite(authenticationTestSuite);

export { authenticationTestSuite };
