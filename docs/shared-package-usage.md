# Using @goldsphere/shared Package

The `@goldsphere/shared` package provides shared TypeScript types, Zod validation schemas, and OpenAPI contracts for the GoldSphere precious metals platform. This ensures consistency between client and server implementations.

## Installation

The package is installed from the Git repository:

```bash
npm install git+https://github.com/marcopersi/goldsphere-shared.git
```

## Available Exports

### Types

```typescript
import { 
  Product, 
  ProductType, 
  MetalType, 
  Currency, 
  WeightUnit,
  ProductRegistrationRequest,
  ProductUpdateRequest,
  ProductsResponse,
  ProductQueryParams,
  BulkRegistrationRequest,
  BulkRegistrationResponse,
  ApiResponse
} from "@goldsphere/shared";
```

### Validation Schemas

```typescript
import { 
  ProductSchema,
  ProductTypeSchema,
  MetalTypeSchema,
  CurrencySchema,
  WeightUnitSchema,
  ProductRegistrationRequestSchema,
  ProductUpdateRequestSchema
} from "@goldsphere/shared";
```

### API Contracts

```typescript
import { 
  ProductApiContract,
  BaseApiClient,
  UploadedFile
} from "@goldsphere/shared";
```

### Utilities

```typescript
import { z, GOLDSPHERE_SHARED_VERSION } from "@goldsphere/shared";
```

## Usage Examples

### 1. Type Safety in Route Handlers

```typescript
import { Product, ProductType, MetalType } from "@goldsphere/shared";

router.get("/products", async (req: Request, res: Response) => {
  const products: Product[] = await getProductsFromDatabase();
  res.json(products);
});
```

### 2. Request Validation

```typescript
import { ProductSchema, z } from "@goldsphere/shared";

router.post("/products/validate", async (req: Request, res: Response) => {
  try {
    const validatedProduct = ProductSchema.parse(req.body);
    res.json({ success: true, product: validatedProduct });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
  }
});
```

### 3. Database Result Transformation

```typescript
import { Product, ProductType, MetalType, Currency } from "@goldsphere/shared";

const transformDbResultToProduct = (dbRow: any): Partial<Product> => ({
  id: dbRow.id,
  name: dbRow.productname,
  type: dbRow.producttype as ProductType,
  metal: dbRow.metal as MetalType,
  weight: dbRow.fineweight,
  price: dbRow.price,
  currency: 'USD' as Currency,
  producer: dbRow.producer,
  // ... other fields
});
```

### 4. Custom Validation Schemas

```typescript
import { ProductSchema, z } from "@goldsphere/shared";

// Create a schema for product updates (partial, without id and createdAt)
const ProductUpdateSchema = ProductSchema.partial().omit({ 
  id: true, 
  createdAt: true 
}).extend({
  updatedAt: z.string().datetime()
});

type ProductUpdate = z.infer<typeof ProductUpdateSchema>;
```

### 5. API Contract Implementation

```typescript
import { ProductApiContract } from "@goldsphere/shared";

// Type-safe API endpoint definitions
type GetProductsEndpoint = ProductApiContract['GET /products'];
type CreateProductEndpoint = ProductApiContract['POST /products'];

router.get("/products", async (req: Request<{}, GetProductsEndpoint['response'], {}, GetProductsEndpoint['query']>, res: Response<GetProductsEndpoint['response']>) => {
  // Implementation with full type safety
});
```

## Available Product Types

- **ProductType**: `'coin' | 'bar' | 'round'`
- **MetalType**: `'gold' | 'silver' | 'platinum' | 'palladium'`
- **WeightUnit**: `'grams' | 'troy_ounces' | 'kilograms'`
- **Currency**: `'USD' | 'EUR' | 'GBP' | 'CHF'`

## Product Schema Fields

The `Product` type includes:

- `id: string` - Unique identifier
- `name: string` - Product name
- `type: ProductType` - Type of precious metal product
- `metal: MetalType` - Type of metal
- `weight: number` - Weight of the product
- `weightUnit: WeightUnit` - Unit of weight measurement
- `purity: number` - Metal purity (e.g., 0.999 for 99.9% pure)
- `price: number` - Current price
- `currency: Currency` - Price currency
- `producer: string` - Manufacturer/mint
- `country?: string` - Country of origin (optional)
- `year?: number` - Year of production (optional)
- `description?: string` - Product description (optional)
- `imageUrl: string` - Product image URL
- `inStock: boolean` - Availability status
- `stockQuantity?: number` - Available quantity (optional)
- `minimumOrderQuantity: number` - Minimum order quantity
- `premiumPercentage?: number` - Premium over spot price (optional)
- `createdAt: string` - Creation timestamp (ISO string)
- `updatedAt: string` - Last update timestamp (ISO string)

## Error Handling

When using Zod validation, handle errors like this:

```typescript
try {
  const validData = ProductSchema.parse(inputData);
} catch (error) {
  if (error instanceof z.ZodError) {
    // Handle validation errors
    const formattedErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
      received: err.received
    }));
  }
}
```

## Development

To see more examples, check the `src/examples/shared-usage.ts` file in this project.

## Version Information

```typescript
import { GOLDSPHERE_SHARED_VERSION } from "@goldsphere/shared";
console.log(`Using shared package version: ${GOLDSPHERE_SHARED_VERSION}`);
```
