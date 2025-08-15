const pool = require('../dist/dbConfig').default;

async function testFetchProduct() {
  try {
    console.log('Testing product fetch...');
    const productQuery = `
      SELECT 
        product.id, 
        product.name AS productname, 
        productType.productTypeName AS producttype, 
        metal.name AS metalname, 
        product.weight AS fineweight, 
        product.weightUnit AS unitofmeasure, 
        product.purity,
        product.price,
        product.currency,
        producer.producerName AS producer,
        issuingCountry.issuingCountryName AS country,
        product.year AS productyear,
        product.description,
        product.imageFilename AS imageurl,
        product.inStock,
        product.minimumOrderQuantity,
        product.createdat,
        product.updatedat
      FROM product 
      JOIN productType ON productType.id = product.productTypeId 
      JOIN metal ON metal.id = product.metalId 
      JOIN producer ON producer.id = product.producerId
      LEFT JOIN issuingCountry ON issuingCountry.id = product.issuingCountryId
      WHERE product.id = $1
    `;
    
    const result = await pool.query(productQuery, ['b9db713c-8a05-432b-8060-60f12eca385c']);
    console.log('Product query result:', result.rows.length, 'rows');
    
    if (result.rows.length > 0) {
      console.log('Product found:', JSON.stringify(result.rows[0], null, 2));
    } else {
      console.log('No product found');
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testFetchProduct();
