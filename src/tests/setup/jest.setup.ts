/**
 * Jest Setup Configuration
 * Global test setup and configuration for Jest testing framework
 */

import '@testing-library/jest-dom';

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

beforeAll(() => {
  // Mock console methods during tests
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  // Restore console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});

// Global test timeout
jest.setTimeout(10000);

// Mock environment variables
Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
process.env.NEXT_PUBLIC_APP_ENV = 'test';

// Global mocks for common modules
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}));

// Mock Redis for tests
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
  })),
}));

// Mock WebSocket for tests
jest.mock('ws', () => ({
  WebSocket: jest.fn(() => ({
    on: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
    readyState: 1,
  })),
}));

export {};
