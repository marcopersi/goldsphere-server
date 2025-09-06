#!/usr/bin/env node

/**
 * Script to clean up all leftover test databases
 * Usage: node scripts/cleanup-test-databases.js
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.test' });

async function cleanupAllTestDatabases() {
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
    
    if (testDatabases.length === 0) {
      console.log('✅ No test databases found - all clean!');
      return;
    }
    
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
        console.warn(`⚠️  Failed to cleanup database ${dbName}:`, error.message);
      }
    }
    
    console.log('🎉 All test database cleanup completed!');
  } catch (error) {
    console.error('❌ Failed to query for test databases:', error.message);
    process.exit(1);
  } finally {
    try {
      await postgresPool.end();
    } catch (poolError) {
      console.warn('⚠️  Error closing postgres pool:', poolError.message);
    }
  }
}

// Run the cleanup
cleanupAllTestDatabases()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
