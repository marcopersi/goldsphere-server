/**
 * Example file demonstrating how to use the @goldsphere/shared package
 * This file shows various ways to import and use types, schemas, and validation
 */

import { 
  // Types
  Product, 
  ProductType, 
  MetalType, 
  Currency, 
  WeightUnit,
  
  // Validation schemas
  ProductSchema,
  ProductTypeSchema,
  MetalTypeSchema,
  CurrencySchema,
  
  // Zod for additional validation
  z,
  
  // Version info
  GOLDSPHERE_SHARED_VERSION
} from "@goldsphere/shared";

console.log(`Using @goldsphere/shared version: ${GOLDSPHERE_SHARED_VERSION}`);

// Example 1: Using types for type safety
function createProduct(data: Partial<Product>): Product {
  const defaultProduct: Product = {
    id: data.id || '1',
    name: data.name || 'Sample Gold Coin',
    type: data.type || 'coin',
    metal: data.metal || 'gold',
    weight: data.weight || 31.1,
    weightUnit: data.weightUnit || 'grams',
    purity: data.purity || 0.999,
    price: data.price || 2000,
    currency: data.currency || 'USD',
    producer: data.producer || 'Sample Mint',
    country: data.country || 'USA',
    year: data.year || 2024,
    description: data.description || 'A beautiful gold coin',
    imageUrl: data.imageUrl || 'https://example.com/image.jpg',
    inStock: data.inStock ?? true,
    stockQuantity: data.stockQuantity || 100,
    minimumOrderQuantity: data.minimumOrderQuantity || 1,
    premiumPercentage: data.premiumPercentage || 5.5,
    tags: data.tags || ['gold', 'coin', 'investment'],
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString()
  };
  
  return defaultProduct;
}

// Example 2: Using validation schemas
function validateProductData(data: unknown): Product | null {
  try {
    // This will throw if data doesn't match the Product schema
    const validatedProduct = ProductSchema.parse(data);
    console.log('✅ Product validation successful');
    return validatedProduct;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Product validation failed:');
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    return null;
  }
}

// Example 3: Using individual field schemas for partial validation
function validateProductType(type: unknown): ProductType | null {
  try {
    return ProductTypeSchema.parse(type);
  } catch {
    console.error(`❌ Invalid product type: ${type}`);
    return null;
  }
}

function validateMetal(metal: unknown): MetalType | null {
  try {
    return MetalTypeSchema.parse(metal);
  } catch {
    console.error(`❌ Invalid metal type: ${metal}`);
    return null;
  }
}

function validateCurrency(currency: unknown): Currency | null {
  try {
    return CurrencySchema.parse(currency);
  } catch {
    console.error(`❌ Invalid currency: ${currency}`);
    return null;
  }
}

// Example 4: Creating custom validation schemas that extend the shared ones
const ProductUpdateSchema = ProductSchema.partial().omit({ 
  id: true, 
  createdAt: true 
}).extend({
  updatedAt: z.string().datetime()
});

type ProductUpdate = z.infer<typeof ProductUpdateSchema>;

function validateProductUpdate(data: unknown): ProductUpdate | null {
  try {
    return ProductUpdateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Product update validation failed:');
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    return null;
  }
}

// Example usage
export function demonstrateSharedUsage() {
  console.log('\n=== @goldsphere/shared Usage Examples ===\n');
  
  // Test 1: Valid product
  console.log('1. Testing valid product data:');
  const validProductData = {
    id: 'prod-123',
    name: 'American Gold Eagle',
    type: 'coin' as ProductType,
    metal: 'gold' as MetalType,
    weight: 31.1035,
    weightUnit: 'grams' as WeightUnit,
    purity: 0.9167,
    price: 2150.50,
    currency: 'USD' as Currency,
    producer: 'US Mint',
    country: 'USA',
    year: 2024,
    description: 'Official gold bullion coin of the United States',
    imageUrl: 'https://example.com/gold-eagle.jpg',
    inStock: true,
    stockQuantity: 50,
    minimumOrderQuantity: 1,
    premiumPercentage: 3.5,
    tags: ['gold', 'coin', 'american', 'eagle'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const validProduct = validateProductData(validProductData);
  console.log(`Result: ${validProduct ? 'Valid' : 'Invalid'}\n`);
  
  // Test 2: Invalid product (missing required fields)
  console.log('2. Testing invalid product data:');
  const invalidProductData = {
    name: 'Incomplete Product',
    type: 'invalid-type',
    metal: 'copper', // Not a valid metal type
    weight: 'not-a-number'
  };
  
  const invalidProduct = validateProductData(invalidProductData);
  console.log(`Result: ${invalidProduct ? 'Valid' : 'Invalid'}\n`);
  
  // Test 3: Individual field validation
  console.log('3. Testing individual field validation:');
  console.log(`Product type 'coin': ${validateProductType('coin') ? '✅' : '❌'}`);
  console.log(`Product type 'invalid': ${validateProductType('invalid') ? '✅' : '❌'}`);
  console.log(`Metal 'gold': ${validateMetal('gold') ? '✅' : '❌'}`);
  console.log(`Metal 'copper': ${validateMetal('copper') ? '✅' : '❌'}`);
  console.log(`Currency 'USD': ${validateCurrency('USD') ? '✅' : '❌'}`);
  console.log(`Currency 'XYZ': ${validateCurrency('XYZ') ? '✅' : '❌'}\n`);
  
  // Test 4: Product update validation
  console.log('4. Testing product update validation:');
  const updateData = {
    name: 'Updated Product Name',
    price: 2200.00,
    updatedAt: new Date().toISOString()
  };
  
  const validUpdate = validateProductUpdate(updateData);
  console.log(`Result: ${validUpdate ? 'Valid update' : 'Invalid update'}\n`);
}

// Uncomment to run the demonstration
// demonstrateSharedUsage();
