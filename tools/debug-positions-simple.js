const pool = require('../dist/dbConfig').default;

async function testPositionsEndpoint() {
  try {
    console.log('Testing positions endpoint logic...');
    
    // Test basic query
    const result = await pool.query("SELECT * FROM position ORDER BY createdat DESC LIMIT 1");
    console.log('Position query result:', result.rows.length, 'rows');
    console.log('Sample position row:', JSON.stringify(result.rows[0], null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testPositionsEndpoint();
