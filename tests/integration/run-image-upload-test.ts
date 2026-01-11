import request from 'supertest';
import app from '../../src/app';
import { setupTestDatabase, teardownTestDatabase } from './db-setup';
import { getPool } from '../../src/dbConfig';

async function runTest() {
  console.log('\n🚀 Starting Image Upload Test\n');
  
  let testProductId: string | null = null;
  let pool: any = null;
  
  try {
    // ============ SETUP ============
    console.log('📋 SETUP: Setting up test database...');
    await setupTestDatabase();
    pool = getPool();
    console.log('✅ Database ready\n');
    
    // Get reference IDs for creating a test product
    console.log('📋 SETUP: Getting reference IDs...');
    const metalResult = await pool.query("SELECT id FROM metal WHERE name = 'Gold' LIMIT 1");
    const productTypeResult = await pool.query("SELECT id FROM productType WHERE productTypeName = 'Coin' LIMIT 1");
    const producerResult = await pool.query("SELECT id FROM producer WHERE producerName = 'United States Mint' LIMIT 1");
    
    const metalId = metalResult.rows[0].id;
    const productTypeId = productTypeResult.rows[0].id;
    const producerId = producerResult.rows[0].id;
    
    console.log('   Metal ID (Gold):', metalId);
    console.log('   ProductType ID (Coin):', productTypeId);
    console.log('   Producer ID:', producerId);
    console.log('');
    
    // Create a test product directly in DB
    console.log('📋 SETUP: Creating test product in DB...');
    const createResult = await pool.query(`
      INSERT INTO product (name, producttypeid, metalid, producerid, weight, weightunit, purity, price, currency, instock, stockquantity)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, name
    `, [
      'TEST_IMAGE_UPLOAD_PRODUCT',
      productTypeId,
      metalId,
      producerId,
      31.103,
      'grams',
      0.9999,
      1500.00,
      'USD',
      true,
      10
    ]);
    
    testProductId = createResult.rows[0].id;
    console.log('✅ Test product created:');
    console.log('   ID:', testProductId);
    console.log('   Name:', createResult.rows[0].name);
    console.log('');
    
    // Verify product exists
    console.log('📋 SETUP: Verifying product exists...');
    const verifyExist = await pool.query('SELECT id, name FROM product WHERE id = $1', [testProductId]);
    console.log('   Query result rows:', verifyExist.rows.length);
    if (verifyExist.rows.length > 0) {
      console.log('   ✅ Product found in DB');
    } else {
      console.log('   ❌ Product NOT found in DB!');
    }
    console.log('');
    
    // ============ TEST ============
    const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const url = `/api/products/${testProductId}/image`;
    
    console.log('📋 TEST: Making POST request...');
    console.log('   URL:', url);
    console.log('   Payload:', {
      imageBase64Length: base64Image.length,
      contentType: 'image/png',
      filename: 'test.png'
    });
    console.log('');
    
    const response = await request(app)
      .post(url)
      .send({
        imageBase64: base64Image,
        contentType: 'image/png',
        filename: 'test.png'
      });
    
    console.log('📨 TEST: Response received');
    console.log('   Status:', response.status);
    console.log('   Body:', JSON.stringify(response.body, null, 2));
    console.log('');
    
    // Check result
    if (response.status === 200 && response.body.success === true) {
      console.log('✅ TEST PASSED: Image upload successful\n');
      
      // Verify image was saved in DB
      console.log('📋 TEST: Verifying image in DB...');
      const verifyResult = await pool.query('SELECT imagefilename, imagecontenttype, length(imagedata) as imagesize FROM product WHERE id = $1', [testProductId]);
      console.log('   Image filename:', verifyResult.rows[0].imagefilename);
      console.log('   Content type:', verifyResult.rows[0].imagecontenttype);
      console.log('   Image size:', verifyResult.rows[0].imagesize, 'bytes');
      console.log('✅ Image data verified in DB\n');
    } else {
      console.log('❌ TEST FAILED: Expected 200 with success=true, got', response.status);
      console.log('   Error:', response.body);
      throw new Error('Test failed');
    }
    
  } catch (error) {
    console.error('❌ TEST ERROR:', error);
    throw error;
  } finally {
    // ============ TEARDOWN ============
    console.log('📋 TEARDOWN: Cleaning up...');
    
    if (testProductId && pool) {
      console.log('   Deleting test product:', testProductId);
      await pool.query('DELETE FROM product WHERE id = $1', [testProductId]);
      console.log('✅ Test product deleted');
    }
    
    console.log('   Dropping test database...');
    await teardownTestDatabase();
    console.log('✅ Cleanup complete\n');
    
    process.exit(0);
  }
}

runTest().catch((error) => {
  console.error('💥 FATAL ERROR:', error);
  process.exit(1);
});
