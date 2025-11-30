// Global test setup
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set default test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.PORT = '0'; // Use random port for testing

// Database configuration - use environment variables from CI if available, otherwise local defaults
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_NAME = process.env.DB_NAME || 'goldsphere'; // Use local database name
process.env.DB_USER = process.env.DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres'; // Use local password

// Increase timeout for async operations
jest.setTimeout(30000);

// Global cleanup for integration tests
// This ensures database cleanup even if tests fail
let teardownFunction: (() => Promise<void>) | null = null;

// Allow integration tests to register their teardown function
(globalThis as any).registerTeardown = (fn: () => Promise<void>) => {
  teardownFunction = fn;
};

// Global teardown - called when Jest process is about to exit
process.on('exit', () => {
  console.log('🧹 Jest process exiting - performing global cleanup...');
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received - performing emergency cleanup...');
  if (teardownFunction) {
    try {
      await teardownFunction();
    } catch (error) {
      console.error('❌ Emergency cleanup failed:', error);
    }
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received - performing emergency cleanup...');
  if (teardownFunction) {
    try {
      await teardownFunction();
    } catch (error) {
      console.error('❌ Emergency cleanup failed:', error);
    }
  }
  process.exit(0);
});

// Mock console methods to reduce noise in tests
globalThis.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
