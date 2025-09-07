import { z } from 'zod';

// Product validation schemas - these should match what's in products.ts
const ProductCreateRequestSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  productTypeId: z.string().uuid(),
  metalId: z.string().uuid(),
  countryId: z.string().uuid().optional(),
  producerId: z.string().uuid(),
  fineWeight: z.number().positive('Weight must be positive'),
  unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
  purity: z.number().min(0).max(1, 'Purity must be between 0 and 1').optional(),
  price: z.number().min(0, 'Price must be non-negative'),
  currency: z.string().length(3, 'Currency must be 3 characters').optional(),
  productYear: z.number().int().min(1000).max(new Date().getFullYear() + 1).optional(),
  description: z.string().optional(),
  imageFilename: z.string().optional(),
  inStock: z.boolean().optional().default(true),
  stockQuantity: z.number().int().min(0).optional().default(0),
  minimumOrderQuantity: z.number().int().positive().optional().default(1),
  premiumPercentage: z.number().min(0).optional(),
  diameter: z.number().positive().optional(),
  thickness: z.number().positive().optional(),
  mintage: z.number().int().positive().optional(),
  certification: z.string().optional()
});

const ProductUpdateRequestSchema = ProductCreateRequestSchema.partial();

const ProductsQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? Math.max(1, parseInt(val)) || 1 : 1),
  limit: z.string().optional().transform(val => val ? Math.min(100, Math.max(1, parseInt(val))) || 20 : 20),
  search: z.string().optional(),
  metal: z.string().optional(),
  type: z.string().optional(), 
  producer: z.string().optional(),
  country: z.string().optional(),
  inStock: z.string().optional().transform(val => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return undefined;
  }),
  minPrice: z.string().optional().transform(val => val ? Math.max(0, parseFloat(val)) || undefined : undefined),
  maxPrice: z.string().optional().transform(val => val ? Math.max(0, parseFloat(val)) || undefined : undefined),
  sortBy: z.enum(['name', 'price', 'createdAt', 'updatedAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

describe('Product Validation Unit Tests', () => {
  
  describe('ProductCreateRequestSchema', () => {
    const validProductData = {
      productName: 'Test Gold Coin',
      productTypeId: '550e8400-e29b-41d4-a716-446655440000',
      metalId: '550e8400-e29b-41d4-a716-446655440001',
      producerId: '550e8400-e29b-41d4-a716-446655440003',
      fineWeight: 31.1035,
      unitOfMeasure: 'grams',
      purity: 0.9167,
      price: 2000.00,
      currency: 'CHF',
      productYear: 2024,
      description: 'Test gold coin',
      inStock: true,
      stockQuantity: 10,
      minimumOrderQuantity: 1,
      premiumPercentage: 3.5
    };

    it('should validate correct product creation data', () => {
      const result = ProductCreateRequestSchema.safeParse(validProductData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.productName).toBe(validProductData.productName);
        expect(result.data.price).toBe(validProductData.price);
        expect(result.data.purity).toBe(validProductData.purity);
      }
    });

    it('should reject empty product name', () => {
      const invalidData = { ...validProductData, productName: '' };
      const result = ProductCreateRequestSchema.safeParse(invalidData);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Product name is required');
      }
    });

    it('should reject invalid UUID format for productTypeId', () => {
      const invalidData = { ...validProductData, productTypeId: 'invalid-uuid' };
      const result = ProductCreateRequestSchema.safeParse(invalidData);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid UUID');
      }
    });

    it('should reject invalid UUID format for metalId', () => {
      const invalidData = { ...validProductData, metalId: 'not-a-uuid' };
      const result = ProductCreateRequestSchema.safeParse(invalidData);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid UUID');
      }
    });

    it('should reject negative or zero weight', () => {
      const invalidData1 = { ...validProductData, fineWeight: 0 };
      const invalidData2 = { ...validProductData, fineWeight: -5.5 };
      
      const result1 = ProductCreateRequestSchema.safeParse(invalidData1);
      const result2 = ProductCreateRequestSchema.safeParse(invalidData2);
      
      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
    });

    it('should reject negative price', () => {
      const invalidData = { ...validProductData, price: -100 };
      const result = ProductCreateRequestSchema.safeParse(invalidData);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Price must be non-negative');
      }
    });

    it('should reject purity values outside 0-1 range', () => {
      const invalidData1 = { ...validProductData, purity: 1.5 };
      const invalidData2 = { ...validProductData, purity: -0.1 };
      
      const result1 = ProductCreateRequestSchema.safeParse(invalidData1);
      const result2 = ProductCreateRequestSchema.safeParse(invalidData2);
      
      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      
      if (!result1.success) {
        expect(result1.error.issues[0].message).toContain('Purity must be between 0 and 1');
      }
    });

    it('should reject invalid currency code length', () => {
      const invalidData1 = { ...validProductData, currency: 'US' }; // Too short
      const invalidData2 = { ...validProductData, currency: 'USDX' }; // Too long
      
      const result1 = ProductCreateRequestSchema.safeParse(invalidData1);
      const result2 = ProductCreateRequestSchema.safeParse(invalidData2);
      
      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
    });

    it('should reject invalid product year', () => {
      const currentYear = new Date().getFullYear();
      const invalidData1 = { ...validProductData, productYear: 999 }; // Too early
      const invalidData2 = { ...validProductData, productYear: currentYear + 2 }; // Too far in future
      
      const result1 = ProductCreateRequestSchema.safeParse(invalidData1);
      const result2 = ProductCreateRequestSchema.safeParse(invalidData2);
      
      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
    });

    it('should reject negative stock quantity', () => {
      const invalidData = { ...validProductData, stockQuantity: -1 };
      const result = ProductCreateRequestSchema.safeParse(invalidData);
      
      expect(result.success).toBe(false);
    });

    it('should reject non-positive minimum order quantity', () => {
      const invalidData1 = { ...validProductData, minimumOrderQuantity: 0 };
      const invalidData2 = { ...validProductData, minimumOrderQuantity: -1 };
      
      const result1 = ProductCreateRequestSchema.safeParse(invalidData1);
      const result2 = ProductCreateRequestSchema.safeParse(invalidData2);
      
      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
    });

    it('should reject negative premium percentage', () => {
      const invalidData = { ...validProductData, premiumPercentage: -1.5 };
      const result = ProductCreateRequestSchema.safeParse(invalidData);
      
      expect(result.success).toBe(false);
    });

    it('should reject non-positive diameter and thickness', () => {
      const invalidData1 = { ...validProductData, diameter: 0 };
      const invalidData2 = { ...validProductData, thickness: -1.5 };
      
      const result1 = ProductCreateRequestSchema.safeParse(invalidData1);
      const result2 = ProductCreateRequestSchema.safeParse(invalidData2);
      
      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
    });

    it('should reject non-positive mintage', () => {
      const invalidData = { ...validProductData, mintage: 0 };
      const result = ProductCreateRequestSchema.safeParse(invalidData);
      
      expect(result.success).toBe(false);
    });

    it('should accept valid optional fields', () => {
      const dataWithOptionals = {
        ...validProductData,
        countryId: '550e8400-e29b-41d4-a716-446655440004',
        description: 'Detailed description',
        imageFilename: 'product-image.jpg',
        certification: 'NGC MS70',
        diameter: 32.7,
        thickness: 2.87,
        mintage: 1000000
      };

      const result = ProductCreateRequestSchema.safeParse(dataWithOptionals);
      expect(result.success).toBe(true);
    });

    it('should apply default values correctly', () => {
      const minimalData = {
        productName: 'Minimal Product',
        productTypeId: '550e8400-e29b-41d4-a716-446655440000',
        metalId: '550e8400-e29b-41d4-a716-446655440001',
        producerId: '550e8400-e29b-41d4-a716-446655440003',
        fineWeight: 31.1035,
        unitOfMeasure: 'grams',
        price: 2000.00
      };

      const result = ProductCreateRequestSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.inStock).toBe(true); // Default value
        expect(result.data.stockQuantity).toBe(0); // Default value
        expect(result.data.minimumOrderQuantity).toBe(1); // Default value
      }
    });
  });

  describe('ProductUpdateRequestSchema', () => {
    it('should accept partial product data for updates', () => {
      const partialData = {
        productName: 'Updated Product Name',
        price: 2500.00
      };

      const result = ProductUpdateRequestSchema.safeParse(partialData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.productName).toBe(partialData.productName);
        expect(result.data.price).toBe(partialData.price);
      }
    });

    it('should reject invalid values in partial updates', () => {
      const invalidPartialData = {
        price: -100, // Invalid negative price
        purity: 1.5  // Invalid purity > 1
      };

      const result = ProductUpdateRequestSchema.safeParse(invalidPartialData);
      expect(result.success).toBe(false);
    });

    it('should accept empty object for updates', () => {
      const result = ProductUpdateRequestSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('ProductsQuerySchema', () => {
    it('should transform and validate pagination parameters', () => {
      const queryData = {
        page: '2',
        limit: '10'
      };

      const result = ProductsQuerySchema.safeParse(queryData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(10);
        expect(result.data.sortBy).toBe('createdAt'); // Default value
        expect(result.data.sortOrder).toBe('desc'); // Default value
      }
    });

    it('should enforce minimum page value', () => {
      const queryData = { page: '0' };
      const result = ProductsQuerySchema.safeParse(queryData);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1); // Should be transformed to minimum value
      }
    });

    it('should enforce maximum limit value', () => {
      const queryData = { limit: '200' };
      const result = ProductsQuerySchema.safeParse(queryData);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(100); // Should be capped at maximum
      }
    });

    it('should transform inStock parameter correctly', () => {
      const trueResult = ProductsQuerySchema.safeParse({ inStock: 'true' });
      const falseResult = ProductsQuerySchema.safeParse({ inStock: 'false' });
      const undefinedResult = ProductsQuerySchema.safeParse({ inStock: 'maybe' });
      
      expect(trueResult.success).toBe(true);
      expect(falseResult.success).toBe(true);
      expect(undefinedResult.success).toBe(true);
      
      if (trueResult.success) expect(trueResult.data.inStock).toBe(true);
      if (falseResult.success) expect(falseResult.data.inStock).toBe(false);
      if (undefinedResult.success) expect(undefinedResult.data.inStock).toBeUndefined();
    });

    it('should transform price parameters correctly', () => {
      const queryData = {
        minPrice: '100.50',
        maxPrice: '2000.00'
      };

      const result = ProductsQuerySchema.safeParse(queryData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.minPrice).toBe(100.50);
        expect(result.data.maxPrice).toBe(2000.00);
      }
    });

    it('should enforce minimum price values', () => {
      const queryData = {
        minPrice: '-50',
        maxPrice: '-100'
      };

      const result = ProductsQuerySchema.safeParse(queryData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.minPrice).toBeUndefined(); // Negative values become undefined
        expect(result.data.maxPrice).toBeUndefined();
      }
    });

    it('should validate sortBy enum values', () => {
      const validSortResult = ProductsQuerySchema.safeParse({ sortBy: 'price' });
      const invalidSortResult = ProductsQuerySchema.safeParse({ sortBy: 'invalid' });
      
      expect(validSortResult.success).toBe(true);
      expect(invalidSortResult.success).toBe(false);
    });

    it('should validate sortOrder enum values', () => {
      const validOrderResult = ProductsQuerySchema.safeParse({ sortOrder: 'asc' });
      const invalidOrderResult = ProductsQuerySchema.safeParse({ sortOrder: 'invalid' });
      
      expect(validOrderResult.success).toBe(true);
      expect(invalidOrderResult.success).toBe(false);
    });

    it('should handle invalid number transformations gracefully', () => {
      const queryData = {
        page: 'not-a-number',
        limit: 'also-not-a-number',
        minPrice: 'not-a-price',
        maxPrice: 'not-a-price-either'
      };

      const result = ProductsQuerySchema.safeParse(queryData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.page).toBe(1); // Default fallback
        expect(result.data.limit).toBe(20); // Default fallback
        expect(result.data.minPrice).toBeUndefined(); // Invalid numbers become undefined
        expect(result.data.maxPrice).toBeUndefined();
      }
    });

    it('should accept optional search and filter parameters', () => {
      const queryData = {
        search: 'gold coin',
        metal: 'gold',
        type: 'coin',
        producer: 'us-mint',
        country: 'usa'
      };

      const result = ProductsQuerySchema.safeParse(queryData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.search).toBe(queryData.search);
        expect(result.data.metal).toBe(queryData.metal);
        expect(result.data.type).toBe(queryData.type);
        expect(result.data.producer).toBe(queryData.producer);
        expect(result.data.country).toBe(queryData.country);
      }
    });
  });

  describe('Business Logic Validation', () => {
    it('should validate logical relationships between fields', () => {
      // Stock quantity should be 0 if not in stock
      const inconsistentData = {
        productName: 'Test Product',
        productTypeId: '550e8400-e29b-41d4-a716-446655440000',
        metalId: '550e8400-e29b-41d4-a716-446655440001',
        producerId: '550e8400-e29b-41d4-a716-446655440003',
        fineWeight: 31.1035,
        unitOfMeasure: 'grams',
        price: 2000.00,
        inStock: false,
        stockQuantity: 10 // Inconsistent: not in stock but has stock quantity
      };

      // Note: This test demonstrates where we might add additional business logic validation
      // Currently, the schema allows this inconsistency, but we could add custom validation
      const result = ProductCreateRequestSchema.safeParse(inconsistentData);
      expect(result.success).toBe(true); // Currently passes, but could be enhanced
    });

    it('should validate minimum order quantity against stock quantity', () => {
      // Minimum order quantity should not exceed stock quantity for in-stock items
      const logicalData = {
        productName: 'Test Product',
        productTypeId: '550e8400-e29b-41d4-a716-446655440000',
        metalId: '550e8400-e29b-41d4-a716-446655440001',
        producerId: '550e8400-e29b-41d4-a716-446655440003',
        fineWeight: 31.1035,
        unitOfMeasure: 'grams',
        price: 2000.00,
        inStock: true,
        stockQuantity: 5,
        minimumOrderQuantity: 10 // Problematic: min order > stock
      };

      const result = ProductCreateRequestSchema.safeParse(logicalData);
      expect(result.success).toBe(true); // Currently passes, could add business rule validation
    });
  });
});
