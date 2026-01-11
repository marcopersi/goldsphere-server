import { Router, Request, Response } from "express";
import { getPool } from "../dbConfig";
import { 
  // Validation schemas from product-schemas  
  ProductSchema,
  // Enhanced query parameters schema (will create server-specific version)
  PaginationSchema,
  ProductCreateRequestSchema,
  ProductUpdateRequestSchema,
  ProductsQuerySchema,
  ProductApiResponseSchema,
  ProductApiListResponseSchema,
  ApiListResponse,
  PaginationResponse,
  Metal,
  ProductTypeEnum
} from "@marcopersi/shared";
import { z } from 'zod';
import { ProductServiceFactory } from "../services/product";
import { ErrorHelpers, ErrorCodes, sendErrorResponse } from "../utils/errorResponse";

// Types inferred from schemas
type ProductResponse = z.infer<typeof ProductSchema>;
type Pagination = z.infer<typeof PaginationSchema>;
type ProductApiResponse = z.infer<typeof ProductApiResponseSchema>;
type ProductApiListResponse = z.infer<typeof ProductApiListResponseSchema>;

const router = Router();

// Helper function to get service with current pool (for testing)
function getProductManagementService() {
  return ProductServiceFactory.createProductManagementService(getPool());
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate dynamic imageUrl for product
 * Returns API endpoint if no image stored, or null if explicitly empty
 */
function generateImageUrl(productId: string, imageFilename: string | null | undefined): string | null {
  if (imageFilename) {
    // TODO: Could return full URL like `${process.env.BASE_URL}/api/products/${productId}/image`
    return `/api/products/${productId}/image`;
  }
  return null;
}

/**
 * Convert Enum instance to constant name (e.g., Metal.GOLD → 'GOLD')
 */
function getEnumKey(enumInstance: any, enumClass: any): string {
  const match = Object.entries(enumClass).find(([_, val]) => val === enumInstance);
  return match ? match[0] : enumInstance.toString();
}

/**
 * Transform product response to use enum keys instead of enum instances
 */
function transformProductResponse(product: any): any {
  return {
    ...product,
    metal: getEnumKey(product.metal, Metal),  // Metal.GOLD → 'GOLD'
    productType: getEnumKey(product.productType, ProductTypeEnum)  // ProductTypeEnum.COIN → 'COIN'
  };
}

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products with pagination and filters
 *     tags: [Products]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, price, createdAt]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name and description
 *       - in: query
 *         name: metalId
 *         schema:
 *           type: string
 *         description: Filter by metal ID
 *       - in: query
 *         name: productTypeId
 *         schema:
 *           type: string
 *         description: Filter by product type ID
 *       - in: query
 *         name: producerId
 *         schema:
 *           type: string
 *         description: Filter by producer ID
 *       - in: query
 *         name: inStock
 *         schema:
 *           type: boolean
 *         description: Filter by stock availability
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *     responses:
 *       200:
 *         description: Paginated list of products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     products:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Server error
 */
// GET all products with enhanced filtering and pagination
router.get("/", async (req: Request, res: Response) => {
  try {
    // Parse query parameters
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const sortBy = req.query.sortBy as 'name' | 'price' | 'createdAt' | undefined;
    const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;
    
    // Parse filters
    const filter: any = {};
    if (req.query.search) filter.search = req.query.search as string;
    if (req.query.metalId) filter.metalId = req.query.metalId as string;
    if (req.query.productTypeId) filter.productTypeId = req.query.productTypeId as string;
    if (req.query.producerId) filter.producerId = req.query.producerId as string;
    if (req.query.inStock !== undefined) filter.inStock = req.query.inStock === 'true';
    if (req.query.minPrice) filter.minPrice = parseFloat(req.query.minPrice as string);
    if (req.query.maxPrice) filter.maxPrice = parseFloat(req.query.maxPrice as string);
    
    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      filter: Object.keys(filter).length > 0 ? filter : undefined
    };
    
    const result = await getProductManagementService().listProducts(options);
    
    // Transform enum instances to enum keys (GOLD, COIN)
    const transformedItems = result.items.map(transformProductResponse);
    
    // Use standardized API response format
    const response: ApiListResponse<ProductResponse> = {
      success: true,
      data: {
        items: transformedItems,
        pagination: result.pagination
      },
      message: `Found ${result.pagination.total} products`
    };
    
    res.json(response);
  } catch (error) {
    console.error("Error listing products:", error);
    // Check if it's a validation error
    if (error instanceof Error && (
      error.message.includes('Page number') ||
      error.message.includes('Limit must') ||
      error.message.includes('price') ||
      error.message.includes('Minimum price')
    )) {
      return ErrorHelpers.badRequest(res, error.message);
    }
    return ErrorHelpers.databaseError(res, error);
  }
});

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET product by id with enhanced validation and response formatting
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.exec(id)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid product ID format" 
      });
    }

    const result = await getPool().query(`
      SELECT 
        product.id, 
        product.name AS productname, 
        productType.producttypename AS producttype, 
        metal.id AS metalid,
        metal.name AS metalname, 
        metal.symbol AS metalsymbol,
        country.isocode2 AS countrycode, 
        producer.id AS producerid,
        producer.producername AS producer, 
        product.weight AS fineweight, 
        product.weightunit AS unitofmeasure, 
        product.purity,
        product.price,
        product.currency,
        product.year AS productyear,
        product.description,
        product.imagefilename AS imageurl,
        product.instock,
        product.stockquantity,
        product.minimumorderquantity,
        product.premiumpercentage,
        product.diameter,
        product.thickness,
        product.mintage,
        product.certification,
        product.createdat,
        product.updatedat
      FROM product 
      JOIN productType ON productType.id = product.producttypeid 
      JOIN metal ON metal.id = product.metalid 
      LEFT JOIN country ON country.id = product.countryid 
      JOIN producer ON producer.id = product.producerid
      WHERE product.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Product not found" 
      });
    }
    
    const row = result.rows[0];
    
    // Map metal name to enum key (e.g., 'Gold' → 'GOLD')
    const metalEnum = Metal.fromName(row.metalname);
    const metalKey = metalEnum ? getEnumKey(metalEnum, Metal) : row.metalname.toUpperCase();
    
    // Map product type to enum key (e.g., 'Coin' → 'COIN')
    const productTypeEnum = ProductTypeEnum.fromName(row.producttype);
    const productTypeKey = productTypeEnum ? getEnumKey(productTypeEnum, ProductTypeEnum) : row.producttype.toUpperCase();
    
    // Transform database result with comprehensive data mapping
    const product: ProductResponse = {
      id: row.id,
      name: row.productname,
      type: productTypeKey,  // Enum key: 'COIN', 'BAR'
      metal: metalKey,  // Enum key: 'GOLD', 'SILVER'
      weight: Number.parseFloat(row.fineweight),
      weightUnit: row.unitofmeasure,
      purity: Number.parseFloat(row.purity),
      price: Number.parseFloat(row.price),
      currency: row.currency,
      producerId: row.producerid,
      producer: row.producer,
      country: (row.countrycode || '').toLowerCase(),
      year: row.productyear,
      description: row.description,
      imageUrl: generateImageUrl(row.productid, row.imageurl),
      inStock: row.instock ?? true,
      stockQuantity: row.stockquantity,
      minimumOrderQuantity: row.minimumorderquantity,
      premiumPercentage: row.premiumpercentage,
      specifications: {
        diameter: row.diameter,
        thickness: row.thickness,
        mintage: row.mintage,
        certification: row.certification
      },
      createdAt: row.createdat || new Date().toISOString(),
      updatedAt: row.updatedat || new Date().toISOString()
    };

    // Format response using shared schema
    const response: ProductApiResponse = {
      success: true,
      data: product,
      message: "Product retrieved successfully"
    };
    
    res.json(response);
  } catch (error) {
    console.error("Error fetching product:", error);
    return ErrorHelpers.databaseError(res, error);
  }
});

// GET product price by id
// GET product price by ID with enhanced validation
router.get("/price/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.exec(id)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid product ID format" 
      });
    }

    const result = await getPool().query("SELECT id, price, currency FROM product WHERE id = $1", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Product not found" 
      });
    }
    
    const response = {
      success: true,
      data: {
        id: result.rows[0].id,
        price: Number.parseFloat(result.rows[0].price) || 0,
        currency: result.rows[0].currency
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error("Error fetching product price:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch product price", 
      details: (error as Error).message 
    });
  }
});

// POST get prices for multiple product IDs with enhanced validation
router.post("/prices", async (req: Request, res: Response) => {
  try {
    const { productIds } = req.body;
    
    // Validate input array
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid product IDs - must be non-empty array" 
      });
    }
    
    // Validate array length
    if (productIds.length > 100) {
      return res.status(400).json({ 
        success: false,
        error: "Too many product IDs - maximum 100 allowed" 
      });
    }
    
    // Validate each ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const id of productIds) {
      if (typeof id !== 'string' || !uuidRegex.exec(id)) {
        return res.status(400).json({ 
          success: false,
          error: `Invalid product ID format: ${id}` 
        });
      }
    }

    const placeholders = productIds.map((_: unknown, index: number) => `$${index + 1}`).join(", ");
    const sql = `SELECT id, price, currency FROM product WHERE id IN (${placeholders})`;

    const result = await getPool().query(sql, productIds);
    const priceArray = result.rows.map(row => ({ 
      id: row.id, 
      price: Number.parseFloat(row.price) || 0,
      currency: row.currency
    }));
    
    const response = {
      success: true,
      data: priceArray,
      message: `Retrieved prices for ${priceArray.length} products`
    };
    
    res.json(response);
  } catch (error) {
    console.error("Error fetching product prices:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch product prices", 
      details: (error as Error).message 
    });
  }
});

// PUT update product with comprehensive validation
router.put("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.exec(id)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid product ID format" 
      });
    }
    
    // Validate request body using shared schema
    const validationResult = ProductUpdateRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid product update data",
        details: validationResult.error.issues
      });
    }
    
    const productData = validationResult.data;
    
    // Check if product exists
    const existingResult = await getPool().query("SELECT id FROM product WHERE id = $1", [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Product not found" 
      });
    }
    
    // Validate referenced entities exist if they are being updated
    const validationPromises: Promise<any>[] = [];
    
    if (productData.metalId) {
      validationPromises.push(getPool().query("SELECT id FROM metal WHERE id = $1", [productData.metalId]));
    }
    if (productData.productTypeId) {
      validationPromises.push(getPool().query("SELECT id FROM productType WHERE id = $1", [productData.productTypeId]));
    }
    if (productData.producerId) {
      validationPromises.push(getPool().query("SELECT id FROM producer WHERE id = $1", [productData.producerId]));
    }
    if (productData.countryId) {
      validationPromises.push(getPool().query("SELECT id FROM country WHERE id = $1", [productData.countryId]));
    }
    
    if (validationPromises.length > 0) {
      const validationResults = await Promise.all(validationPromises);
      for (const result of validationResults) {
        if (result.rows.length === 0) {
          return res.status(400).json({ 
            success: false,
            error: "One or more referenced entities not found" 
          });
        }
      }
    }
    
    // Build dynamic update query with only provided fields
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    if (productData.productName !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(productData.productName);
    }
    if (productData.productTypeId !== undefined) {
      updateFields.push(`producttypeid = $${paramIndex++}`);
      updateValues.push(productData.productTypeId);
    }
    if (productData.metalId !== undefined) {
      updateFields.push(`metalid = $${paramIndex++}`);
      updateValues.push(productData.metalId);
    }
    if (productData.countryId !== undefined) {
      updateFields.push(`countryid = $${paramIndex++}`);
      updateValues.push(productData.countryId);
    }
    if (productData.producerId !== undefined) {
      updateFields.push(`producerid = $${paramIndex++}`);
      updateValues.push(productData.producerId);
    }
    if (productData.fineWeight !== undefined) {
      updateFields.push(`weight = $${paramIndex++}`);
      updateValues.push(productData.fineWeight);
    }

    if (productData.purity !== undefined) {
      updateFields.push(`purity = $${paramIndex++}`);
      updateValues.push(productData.purity);
    }
    if (productData.price !== undefined) {
      updateFields.push(`price = $${paramIndex++}`);
      updateValues.push(productData.price);
    }
    if (productData.currency !== undefined) {
      updateFields.push(`currency = $${paramIndex++}`);
      updateValues.push(productData.currency);
    }
    if (productData.productYear !== undefined) {
      updateFields.push(`year = $${paramIndex++}`);
      updateValues.push(productData.productYear);
    }
    if (productData.imageFilename !== undefined) {
      updateFields.push(`imagefilename = $${paramIndex++}`);
      updateValues.push(productData.imageFilename);
    }
    if (productData.inStock !== undefined) {
      updateFields.push(`instock = $${paramIndex++}`);
      updateValues.push(productData.inStock);
    }
    if (productData.stockQuantity !== undefined) {
      updateFields.push(`stockquantity = $${paramIndex++}`);
      updateValues.push(productData.stockQuantity);
    }
    if (productData.minimumOrderQuantity !== undefined) {
      updateFields.push(`minimumorderquantity = $${paramIndex++}`);
      updateValues.push(productData.minimumOrderQuantity);
    }
    if (productData.premiumPercentage !== undefined) {
      updateFields.push(`premiumpercentage = $${paramIndex++}`);
      updateValues.push(productData.premiumPercentage);
    }
    if (productData.diameter !== undefined) {
      updateFields.push(`diameter = $${paramIndex++}`);
      updateValues.push(productData.diameter);
    }
    if (productData.thickness !== undefined) {
      updateFields.push(`thickness = $${paramIndex++}`);
      updateValues.push(productData.thickness);
    }
    if (productData.mintage !== undefined) {
      updateFields.push(`mintage = $${paramIndex++}`);
      updateValues.push(productData.mintage);
    }
    if (productData.certification !== undefined) {
      updateFields.push(`certification = $${paramIndex++}`);
      updateValues.push(productData.certification);
    }
    
    // Always update updatedAt
    updateFields.push(`updatedat = CURRENT_TIMESTAMP`);
    
    if (updateFields.length === 1) { // Only updatedAt
      return res.status(400).json({ 
        success: false,
        error: "No fields to update" 
      });
    }
    
    // Add ID parameter for WHERE clause
    updateValues.push(id);
    
    const updateQuery = `
      UPDATE product 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
    `;
    
    await getPool().query(updateQuery, updateValues);
    
    // Fetch and return the updated product with enhanced response formatting
    const productResult = await getPool().query(`
      SELECT 
        product.id, 
        product.name AS productname, 
        productType.producttypename AS producttype, 
        metal.id AS metalid,
        metal.name AS metalname, 
        metal.symbol AS metalsymbol,
        country.isocode2 AS countrycode, 
        producer.id AS producerid,
        producer.producername AS producer, 
        product.weight AS fineweight, 
        product.weightunit AS unitofmeasure,
        product.purity,
        product.price,
        product.currency,
        product.year AS productyear,
        product.description,
        product.imagefilename AS imageurl,
        product.instock,
        product.stockquantity,
        product.minimumorderquantity,
        product.premiumpercentage,
        product.diameter,
        product.thickness,
        product.mintage,
        product.certification,
        product.createdat,
        product.updatedat
      FROM product 
      JOIN productType ON productType.id = product.producttypeid 
      JOIN metal ON metal.id = product.metalid 
      LEFT JOIN country ON country.id = product.countryid 
      JOIN producer ON producer.id = product.producerid
      WHERE product.id = $1
    `, [id]);
    
    const row = productResult.rows[0];
    
    // Transform database result with comprehensive data mapping
    const product: ProductResponse = {
      id: row.id,
      name: row.name,
      type: row.producttype,
      metal: {
        id: row.metalid,
        name: row.metalname,
        symbol: row.metalsymbol
      },
      weight: Number.parseFloat(row.fineweight),
      weightUnit: row.unitofmeasure,
      purity: Number.parseFloat(row.purity),
      price: Number.parseFloat(row.price),
      currency: row.currency,
      producerId: row.producerid,
      producer: row.producer,
      country: (row.countrycode || '').toLowerCase(),
      year: row.productyear || undefined,
      description: row.description || '',
      imageUrl: generateImageUrl(row.productid, row.imageurl),
      inStock: row.instock ?? true,
      stockQuantity: row.stockquantity,
      minimumOrderQuantity: row.minimumorderquantity,
      premiumPercentage: row.premiumPercentage,
      specifications: {
        diameter: row.diameter,
        thickness: row.thickness,
        mintage: row.mintage,
        certification: row.certification
      },
      createdAt: row.createdat || new Date().toISOString(),
      updatedAt: row.updatedat || new Date().toISOString()
    };

    // Format response using shared schema
    const response: ProductApiResponse = {
      success: true,
      data: product,
      message: "Product updated successfully"
    };
    
    res.json(response);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to update product", 
      details: (error as Error).message 
    });
  }
});

// DELETE product
// DELETE product with enhanced validation and response
router.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.exec(id)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid product ID format" 
      });
    }
    
    // Check if product exists
    const existingResult = await getPool().query("SELECT id, name FROM product WHERE id = $1", [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Product not found" 
      });
    }
    
    const productName = existingResult.rows[0].name;
    
    // Check for existing orders referencing this product
    const orderCheck = await getPool().query("SELECT id FROM order_items WHERE productid = $1 LIMIT 1", [id]);
    if (orderCheck.rows.length > 0) {
      return res.status(409).json({ 
        success: false,
        error: "Cannot delete product with existing orders" 
      });
    }
    
    // Delete the product
    await getPool().query("DELETE FROM product WHERE id = $1", [id]);
    
    // Return success response with proper formatting
    const response = {
      success: true,
      message: `Product '${productName}' deleted successfully`
    };
    
    res.json(response);
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to delete product", 
      details: (error as Error).message 
    });
  }
});

// POST create new product with comprehensive validation
router.post("/", async (req: Request, res: Response) => {
  try {
    // Validate request body using shared schema
    const validationResult = ProductCreateRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid product data",
        details: validationResult.error.issues
      });
    }
    
    const productData = validationResult.data;
    
    // Validate referenced entities exist
    const [metalResult, typeResult, producerResult, countryResult] = await Promise.all([
      getPool().query("SELECT id FROM metal WHERE id = $1", [productData.metalId]),
      getPool().query("SELECT id FROM productType WHERE id = $1", [productData.productTypeId]),
      getPool().query("SELECT id FROM producer WHERE id = $1", [productData.producerId]),
      productData.countryId ? getPool().query("SELECT id FROM country WHERE id = $1", [productData.countryId]) : null
    ]);
    
    if (metalResult.rows.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid metal ID" 
      });
    }
    
    if (typeResult.rows.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid product type ID" 
      });
    }
    
    if (producerResult.rows.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid producer ID" 
      });
    }
    
    if (productData.countryId && countryResult && countryResult.rows.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid country ID" 
      });
    }
    
    // Insert new product with comprehensive data mapping
    const insertResult = await getPool().query(`
      INSERT INTO product (
        name, producttypeid, metalid, countryid, producerid,
        weight, weightunit, purity, price, currency, year,
        description, imagefilename, instock, stockquantity, minimumorderquantity,
        premiumpercentage, diameter, thickness, mintage, certification
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING id
    `, [
      productData.productName,
      productData.productTypeId,
      productData.metalId,
      (productData as any).countryId,
      productData.producerId,
      productData.fineWeight,
      productData.unitOfMeasure,
      productData.purity,
      productData.price,
      productData.currency,
      productData.productYear,
      productData.description,
      productData.imageFilename,
      productData.inStock ?? true,
      productData.stockQuantity,
      productData.minimumOrderQuantity,
      productData.premiumPercentage,
      productData.diameter,
      productData.thickness,
      productData.mintage,
      productData.certification
    ]);
    
    const newProductId = insertResult.rows[0].id;
    
    // Fetch and return the complete product with enhanced response formatting
    const productResult = await getPool().query(`
      SELECT 
        product.id, 
        product.name AS productname, 
        productType.producttypename AS producttype, 
        metal.id AS metalid,
        metal.name AS metalname, 
        metal.symbol AS metalsymbol,
        country.isocode2 AS countrycode, 
        producer.id AS producerid,
        producer.producername AS producer, 
        product.weight AS fineweight, 
        product.weightunit AS unitofmeasure, 
        product.purity,
        product.price,
        product.currency,
        product.year AS productyear,
        product.description,
        product.imagefilename AS imageurl,
        product.instock,
        product.stockquantity,
        product.minimumorderquantity,
        product.premiumpercentage,
        product.diameter,
        product.thickness,
        product.mintage,
        product.certification,
        product.createdat,
        product.updatedat
      FROM product 
      JOIN productType ON productType.id = product.producttypeid 
      JOIN metal ON metal.id = product.metalid 
      LEFT JOIN country ON country.id = product.countryid 
      JOIN producer ON producer.id = product.producerid
      WHERE product.id = $1
    `, [newProductId]);
    
    const row = productResult.rows[0];
    
    // Transform database result with comprehensive data mapping
    const product: ProductResponse = {
      id: row.id,
      name: row.productname,
      type: row.producttype,
      metal: {
        id: row.metalid,
        name: row.metalname,
        symbol: row.metalsymbol
      },
      weight: Number.parseFloat(row.fineweight),
      weightUnit: row.unitofmeasure,
      purity: Number.parseFloat(row.purity),
      price: Number.parseFloat(row.price),
      currency: row.currency,
      producerId: row.producerid,
      producer: row.producer,
      country: (row.countrycode || '').toLowerCase(),
      year: row.productyear || undefined,
      description: row.description,
      imageUrl: generateImageUrl(row.productid, row.imageurl),
      inStock: row.instock ?? true,
      stockQuantity: row.stockquantity,
      minimumOrderQuantity: row.minimumorderquantity,
      premiumPercentage: row.premiumpercentage || undefined,
      specifications: {
        diameter: row.diameter || undefined,
        thickness: row.thickness || undefined,
        mintage: row.mintage || undefined,
        certification: row.certification || undefined
      },
      createdAt: row.createdat || new Date().toISOString(),
      updatedAt: row.updatedat || new Date().toISOString()
    };

    // Format response using shared schema
    const response: ProductApiResponse = {
      success: true,
      data: product,
      message: "Product created successfully"
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to create product", 
      details: (error as Error).message 
    });
  }
});

// DEPRECATED: Legacy search endpoint - use GET /products with query parameters instead
// The main GET /products endpoint now supports comprehensive filtering with the same parameters
// This endpoint is maintained for backward compatibility but should not be used in new code

/**
 * @swagger
 * /products/validate:
 *   post:
 *     summary: Validate product data against shared schema
 *     tags: [Products]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Product data is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Product data is valid"
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @swagger
 * /products/{id}/image:
 *   get:
 *     summary: Get product image
 *     tags: [Products]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product image
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Product or image not found
 *       500:
 *         description: Server error
 */
// GET product image by ID with enhanced validation and response
router.get("/:id/image", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.exec(id)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid product ID format" 
      });
    }

    const result = await getPool().query(
      "SELECT imageData, imageContentType, imageFilename FROM product WHERE id = $1 AND imageData IS NOT NULL",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Product image not found" 
      });
    }

    const { imagedata, imagecontenttype, imagefilename } = result.rows[0];

    // Set appropriate headers with enhanced caching and security
    res.set({
      'Content-Type': imagecontenttype || 'image/jpeg',
      'Content-Disposition': `inline; filename="${imagefilename || 'product-image'}"`,
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'"
    });

    res.send(imagedata);

  } catch (error) {
    console.error("Error serving product image:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to serve product image", 
      details: (error as Error).message 
    });
  }
});

// POST validate product data using shared schemas
router.post("/validate", async (req: Request, res: Response) => {
  try {
    // Determine which validation schema to use based on request body
    let validationResult;
    let schemaType = 'unknown';
    
    // Try ProductCreateRequestSchema first (most comprehensive)
    validationResult = ProductCreateRequestSchema.safeParse(req.body);
    if (validationResult.success) {
      schemaType = 'ProductCreateRequest';
    } else {
      // Try ProductUpdateRequestSchema if create failed
      const updateValidation = ProductUpdateRequestSchema.safeParse(req.body);
      if (updateValidation.success) {
        validationResult = updateValidation;
        schemaType = 'ProductUpdateRequest';
      }
    }
    
    // If both specialized schemas failed, provide detailed error response
    if (!validationResult?.success) {
      const createValidation = ProductCreateRequestSchema.safeParse(req.body);
      const updateValidation = ProductUpdateRequestSchema.safeParse(req.body);
      
      return res.status(400).json({
        success: false,
        error: "Validation failed for all product schemas",
        details: {
          createSchema: createValidation.success ? null : createValidation.error.issues,
          updateSchema: updateValidation.success ? null : updateValidation.error.issues
        }
      });
    }
    
    const response = {
      success: true,
      message: `Product data is valid according to ${schemaType} schema`,
      data: {
        schemaType,
        validatedData: validationResult.data
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error("Product validation error:", error);
    res.status(500).json({
      success: false,
      error: "Internal validation error",
      details: (error as Error).message
    });
  }
});

/**
 * @swagger
 * /products/{id}/image:
 *   post:
 *     summary: Upload product image
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imageBase64
 *               - contentType
 *               - filename
 *             properties:
 *               imageBase64:
 *                 type: string
 *                 description: Base64 encoded image data (with or without data URI prefix)
 *                 example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA..."
 *               contentType:
 *                 type: string
 *                 enum: [image/jpeg, image/jpg, image/png, image/gif, image/webp]
 *                 description: Image MIME type
 *                 example: "image/png"
 *               filename:
 *                 type: string
 *                 description: Image filename
 *                 example: "product-image.png"
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Image uploaded successfully"
 *       400:
 *         description: Invalid request (missing fields, invalid format, file too large)
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */
router.post("/:id/image", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { imageBase64, contentType, filename } = req.body;

  try {
    // Validate required fields
    if (!imageBase64 || !contentType || !filename) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        details: "imageBase64, contentType, and filename are required"
      });
    }

    // Upload image using service
    await getProductManagementService().uploadImage(id, imageBase64, contentType, filename);
    res.json({
      success: true,
      message: "Image uploaded successfully"
    });
  } catch (error) {
    console.error("Image upload error:", error);
    const errorMessage = (error as Error).message;
    
    if (errorMessage.includes("not found")) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
        details: errorMessage
      });
    }
    
    if (errorMessage.includes("Invalid") || errorMessage.includes("exceeds")) {
      return res.status(400).json({
        success: false,
        error: "Invalid image data",
        details: errorMessage
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to upload image",
      details: errorMessage
    });
  }
});

export default router;