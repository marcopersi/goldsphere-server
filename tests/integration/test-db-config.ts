import { Pool } from "pg";

/**
 * Test-specific database configuration
 * This will be used to replace the main dbConfig during integration tests
 */

let testPool: Pool | null = null;

export function setTestPool(pool: Pool) {
  testPool = pool;
}

export function getTestPool(): Pool {
  if (!testPool) {
    throw new Error('Test database pool not initialized. Call setupTestDatabase() first.');
  }
  return testPool;
}

// Export the test pool as default (this replaces the main dbConfig)
export default {
  get pool() {
    return getTestPool();
  },
  query: (...args: any[]) => getTestPool().query(...args),
  connect: () => getTestPool().connect(),
  end: () => getTestPool().end()
};
