import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Database setup utilities for integration tests
 * Creates a fresh test database for each test suite by executing init.sql
 */

let testDbPool: Pool | null = null;
let testDbName: string | null = null;

export async function setupTestDatabase(): Promise<Pool> {
  console.log('🔧 Setting up fresh test database...');
  
  // Generate unique test database name
  testDbName = `goldsphere_test_${randomUUID().replace(/-/g, '')}`;
  
  console.log(`📊 Creating test database: ${testDbName}`);
  
  // First, create the test database using postgres connection
  await createTestDatabase(testDbName);
  
  // Create pool for the new test database
  testDbPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: testDbName,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });

  // Execute all SQL files to build complete schema and data
  await initializeDatabaseSchema();
  
  console.log(`✅ Test database ${testDbName} ready with fresh schema and sample data!`);
  
  // Verify setup
  await verifyDatabaseSetup();
  
  // Replace the global dbConfig immediately after setup
  await replaceGlobalDbConfig();
  
  // Register teardown function globally for emergency cleanup
  if ((global as any).registerTeardown) {
    (global as any).registerTeardown(teardownTestDatabase);
  }
  
  return testDbPool;
}

async function replaceGlobalDbConfig(): Promise<void> {
  if (!testDbPool) throw new Error('Test database pool not ready');
  
  try {
    // Use the new setPool function to replace the global pool
    const { setPool, getPool } = await import('../../src/dbConfig');
    const oldPool = getPool();
    console.log('🔄 Replacing pool:', {
      oldPoolHost: oldPool?.options?.host,
      oldPoolDb: oldPool?.options?.database,
      newPoolHost: testDbPool.options?.host,
      newPoolDb: testDbPool.options?.database
    });
    
    setPool(testDbPool);
    
    // Verify the replacement worked
    const verifyPool = getPool();
    const testResult = await verifyPool.query('SELECT current_database()');
    console.log('✅ Global database config replaced with test database:', testResult.rows[0]);
  } catch (error) {
    console.error('❌ Failed to replace global database config:', error);
    throw error;
  }
}

async function createTestDatabase(dbName: string): Promise<void> {
  const postgresPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres',
  });

  try {
    await postgresPool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    await postgresPool.query(`CREATE DATABASE "${dbName}"`);
  } finally {
    await postgresPool.end();
  }
}

async function initializeDatabaseSchema(): Promise<void> {
  if (!testDbPool) throw new Error('Test database pool not initialized');

  // Execute ALL SQL files in EXACT order as specified in init.sql
  const sqlFiles = [
    { name: '01-schema.sql', path: path.join(__dirname, '../../initdb/01-schema.sql') },
    { name: '02-initialLoad.sql', path: path.join(__dirname, '../../initdb/02-initialLoad.sql') },
    { name: '03-sampleData.sql', path: path.join(__dirname, '../../initdb/03-sampleData.sql') },
    { name: '04-enhanced-user-registration.sql', path: path.join(__dirname, '../../initdb/04-enhanced-user-registration.sql') },
    { name: '05-market-data.sql', path: path.join(__dirname, '../../initdb/05-market-data.sql') }
  ];

  for (const sqlFile of sqlFiles) {
    if (fs.existsSync(sqlFile.path)) {
      console.log(`🗃️  Executing ${sqlFile.name}...`);
      const sql = fs.readFileSync(sqlFile.path, 'utf8');
      
      // Execute the COMPLETE SQL file at once (not statement by statement)
      // This preserves the correct table creation order
      try {
        await testDbPool.query(sql);
        console.log(`✅ ${sqlFile.name} executed successfully`);
      } catch (error) {
        console.error(`❌ Error executing ${sqlFile.name}:`, error);
        throw error;
      }
    } else {
      throw new Error(`⚠️ REQUIRED SQL file not found: ${sqlFile.path}`);
    }
  }
  
  // Execute the indexes from init.sql
  console.log('🗃️  Creating performance indexes...');
  const indexQueries = [
    "CREATE INDEX IF NOT EXISTS idx_product_metal ON product(metalId)",
    "CREATE INDEX IF NOT EXISTS idx_product_type ON product(productTypeId)", 
    "CREATE INDEX IF NOT EXISTS idx_product_producer ON product(producerId)",
    "CREATE INDEX IF NOT EXISTS idx_product_country ON product(countryId)",
    "CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(userId)",
    "CREATE INDEX IF NOT EXISTS idx_position_user ON position(userId)",
    "CREATE INDEX IF NOT EXISTS idx_transactions_position ON transactions(positionId)",
    "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)"
  ];
  
  for (const indexQuery of indexQueries) {
    await testDbPool.query(indexQuery);
  }
}

async function verifyDatabaseSetup(): Promise<void> {
  if (!testDbPool) throw new Error('Test database pool not initialized');

  try {
    const userCount = await testDbPool.query('SELECT COUNT(*) as count FROM users');
    const productCount = await testDbPool.query('SELECT COUNT(*) as count FROM product');
    const metalCount = await testDbPool.query('SELECT COUNT(*) as count FROM metal');
    
    console.log(`📈 Database verification:`);
    console.log(`   - Users: ${userCount.rows[0].count}`);
    console.log(`   - Products: ${productCount.rows[0].count}`);
    console.log(`   - Metals: ${metalCount.rows[0].count}`);
    
    // Check that technical user exists
    const techUser = await testDbPool.query("SELECT email FROM users WHERE email = 'bank.technical@goldsphere.vault'");
    if (techUser.rows.length === 0) {
      throw new Error('Technical user not found in test database!');
    }
    console.log('✅ Technical user verified');
    
  } catch (error) {
    console.error('❌ Database verification failed:', error);
    throw error;
  }
}

export async function teardownTestDatabase(): Promise<void> {
  if (testDbPool && testDbName) {
    console.log(`🧹 Cleaning up test database: ${testDbName}`);
    
    try {
      // Force close all connections to the test database
      await testDbPool.end();
    } catch (error) {
      console.warn('⚠️  Error closing test database pool:', error);
    } finally {
      testDbPool = null;
    }
    
    // Connect to postgres to drop test database
    const postgresPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: 'postgres',
    });

    try {
      // Terminate all connections to the test database before dropping
      await postgresPool.query(`
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE datname = $1 AND pid <> pg_backend_pid()
      `, [testDbName]);
      
      // Drop the test database
      await postgresPool.query(`DROP DATABASE IF EXISTS "${testDbName}"`);
      console.log(`✅ Test database ${testDbName} cleaned up successfully!`);
    } catch (error) {
      console.error('❌ Failed to cleanup test database:', error);
      // Still try to clean up the pool and reset state
    } finally {
      try {
        await postgresPool.end();
      } catch (poolError) {
        console.warn('⚠️  Error closing postgres pool:', poolError);
      }
      testDbName = null;
    }
  } else {
    console.log('💡 No test database to clean up (already cleaned or never created)');
  }
}

export function getTestPool(): Pool | null {
  return testDbPool;
}

/**
 * Clean up all test databases that might be left over from previous failed runs
 * This function can be called manually or as part of CI cleanup
 */
export async function cleanupAllTestDatabases(): Promise<void> {
  console.log('🧹 Cleaning up all leftover test databases...');
  
  const postgresPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres',
  });

  try {
    // Find all databases that match our test database naming pattern
    const result = await postgresPool.query(`
      SELECT datname 
      FROM pg_database 
      WHERE datname LIKE 'goldsphere_test_%'
    `);
    
    const testDatabases = result.rows.map(row => row.datname);
    console.log(`Found ${testDatabases.length} test databases to clean up`);
    
    for (const dbName of testDatabases) {
      try {
        // Terminate all connections to the database
        await postgresPool.query(`
          SELECT pg_terminate_backend(pid) 
          FROM pg_stat_activity 
          WHERE datname = $1 AND pid <> pg_backend_pid()
        `, [dbName]);
        
        // Drop the database
        await postgresPool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
        console.log(`✅ Cleaned up test database: ${dbName}`);
      } catch (error) {
        console.warn(`⚠️  Failed to cleanup database ${dbName}:`, error);
      }
    }
    
    console.log('🎉 All test database cleanup completed!');
  } catch (error) {
    console.error('❌ Failed to query for test databases:', error);
  } finally {
    try {
      await postgresPool.end();
    } catch (poolError) {
      console.warn('⚠️  Error closing postgres pool in cleanup:', poolError);
    }
  }
}
