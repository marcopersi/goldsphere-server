// Global test setup
import dotenv from 'dotenv';

// Load test environment variables.
// Priority: existing process env > .env.test > .env.ci
dotenv.config({ path: '.env.test' });
dotenv.config({ path: '.env.ci' });

class ValueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValueError';
  }
}

function requireEnvVar(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new ValueError(`Missing required test environment variable: ${name}`);
  }
  return value;
}

function requireNumericEnvVar(name: string): number {
  const rawValue = requireEnvVar(name);
  const numericValue = Number.parseInt(rawValue, 10);
  if (Number.isNaN(numericValue) || numericValue <= 0) {
    throw new ValueError(`Invalid numeric value for ${name}: ${rawValue}`);
  }
  return numericValue;
}

process.env.NODE_ENV = 'test';

// Fail fast: required env vars for test execution
requireEnvVar('JWT_SECRET');
requireEnvVar('APP_BASE_URL');
requireEnvVar('EMAIL_FROM');
requireEnvVar('DB_HOST');
requireEnvVar('DB_NAME');
requireEnvVar('DB_USER');
requireEnvVar('DB_PASSWORD');
requireNumericEnvVar('DB_PORT');

// Increase timeout for async operations (env-driven)
const testTimeoutMs = requireNumericEnvVar('TEST_TIMEOUT_MS');
jest.setTimeout(testTimeoutMs);

// Global cleanup for integration tests
// This ensures database cleanup even if tests fail
let teardownFunction: (() => Promise<void>) | null = null;
let signalsRegistered = false;

const handleSigint = async () => {
  console.log('🛑 SIGINT received - performing emergency cleanup...');
  if (teardownFunction) {
    try {
      await teardownFunction();
    } catch (error) {
      console.error('❌ Emergency cleanup failed:', error);
    }
  }
  process.exit(0);
};

const handleSigterm = async () => {
  console.log('🛑 SIGTERM received - performing emergency cleanup...');
  if (teardownFunction) {
    try {
      await teardownFunction();
    } catch (error) {
      console.error('❌ Emergency cleanup failed:', error);
    }
  }
  process.exit(0);
};

const registerSignalHandlers = () => {
  if (signalsRegistered) return;
  signalsRegistered = true;
  process.on('SIGINT', handleSigint);
  process.on('SIGTERM', handleSigterm);
};

// Allow integration tests to register their teardown function
(globalThis as any).registerTeardown = (fn: () => Promise<void>) => {
  teardownFunction = fn;
  registerSignalHandlers();
};

// Global teardown - called when Jest process is about to exit
process.on('exit', () => {
  console.log('🧹 Jest process exiting - performing global cleanup...');
});


const isLeakCheck = process.env.JEST_LEAK_CHECK === 'true';
const isIntegrationRun = process.argv.some((arg) => arg.includes('tests/integration'));

// Mock console methods to reduce noise in tests.
// Keep logs enabled for integration runs to surface DB setup progress and avoid
// perceived "stuck" executions with no output.
if (!isLeakCheck && !isIntegrationRun) {
  globalThis.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}
