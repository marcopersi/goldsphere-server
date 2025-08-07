import { Router, Request, Response } from "express";
import pool from "../dbConfig"; // Import the shared pool configuration
import { 
  Product, 
  ProductSchema,
  ProductType,
  MetalType,
  Currency,
  WeightUnit,
  z 
} from "@goldsphere/shared";

const router = Router();

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     security: []
 *     responses:
 *       200:
 *         description: List of all products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET all products
router.get("/", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        product.id, 
        product.productName AS productname, 
        productType.productTypeName AS producttype, 
        metal.metalName AS metal, 
        issuingCountry.issuingCountryName AS issuingcountry, 
        issuingCountry.isoCode2, 
        producer.producerName AS producer, 
        product.fineWeight, 
        product.unitOfMeasure, 
        product.purity,
        product.price,
        product.currency,
        product.productYear,
        product.description,
        product.imageFilename AS imageurl,
        product.inStock,
        product.stockQuantity,
        product.minimumOrderQuantity,
        product.premiumPercentage,
        product.diameter,
        product.thickness,
        product.mintage,
        product.certification,
        product.tags,
        product.createdAt,
        product.updatedAt
      FROM product 
      JOIN productType ON productType.id = product.productTypeId 
      JOIN metal ON metal.id = product.metalId 
      LEFT JOIN issuingCountry ON issuingCountry.id = product.issuingCountryId 
      JOIN producer ON producer.id = product.producerId
    `);
    
    // Transform database results to match shared Product type
    const products: Partial<Product>[] = result.rows.map(row => ({
      id: row.id,
      name: row.productname,
      type: mapProductType(row.producttype),
      metal: mapMetalType(row.metal),
      weight: parseFloat(row.fineweight) || 0,
      weightUnit: row.unitofmeasure as WeightUnit,
      purity: parseFloat(row.purity) || 0.999,
      price: parseFloat(row.price) || 0,
      currency: row.currency as Currency,
      producer: row.producer,
      country: row.issuingcountry || '',
      year: row.productyear || undefined,
      description: row.description || '',
      imageUrl: row.imageurl || '',
      inStock: row.instock ?? true,
      stockQuantity: row.stockquantity || 0,
      minimumOrderQuantity: row.minimumorderquantity || 1,
      premiumPercentage: parseFloat(row.premiumpercentage) || undefined,
      specifications: {
        diameter: parseFloat(row.diameter) || undefined,
        thickness: parseFloat(row.thickness) || undefined,
        mintage: row.mintage || undefined,
        certification: row.certification || undefined
      },
      tags: row.tags || [],
      createdAt: row.createdat || new Date().toISOString(),
      updatedAt: row.updatedat || new Date().toISOString()
    }));
    
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products", details: (error as Error).message });
  }
});

// Helper functions to map database values to shared types
function mapProductType(dbValue: string): ProductType {
  const normalized = dbValue?.toLowerCase();
  switch (normalized) {
    case 'coin': return 'coin';
    case 'bar': return 'bar';
    case 'round': return 'round';
    default: return 'coin'; // Default fallback
  }
}

function mapMetalType(dbValue: string): MetalType {
  const normalized = dbValue?.toLowerCase();
  switch (normalized) {
    case 'gold': return 'gold';
    case 'silver': return 'silver';
    case 'platinum': return 'platinum';
    case 'palladium': return 'palladium';
    default: return 'gold'; // Default fallback
  }
}

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
// GET product by id
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        product.id, 
        product.productName AS productname, 
        productType.productTypeName AS producttype, 
        metal.metalName AS metal, 
        issuingCountry.issuingCountryName AS issuingcountry, 
        issuingCountry.isoCode2, 
        producer.producerName AS producer, 
        product.fineWeight, 
        product.unitOfMeasure, 
        product.purity,
        product.price,
        product.currency,
        product.productYear,
        product.description,
        product.imageFilename AS imageurl,
        product.inStock,
        product.stockQuantity,
        product.minimumOrderQuantity,
        product.premiumPercentage,
        product.diameter,
        product.thickness,
        product.mintage,
        product.certification,
        product.tags,
        product.createdAt,
        product.updatedAt
      FROM product 
      JOIN productType ON productType.id = product.productTypeId 
      JOIN metal ON metal.id = product.metalId 
      LEFT JOIN issuingCountry ON issuingCountry.id = product.issuingCountryId 
      JOIN producer ON producer.id = product.producerId
      WHERE product.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    
    const row = result.rows[0];
    const product: Partial<Product> = {
      id: row.id,
      name: row.productname,
      type: mapProductType(row.producttype),
      metal: mapMetalType(row.metal),
      weight: parseFloat(row.fineweight) || 0,
      weightUnit: row.unitofmeasure as WeightUnit,
      purity: parseFloat(row.purity) || 0.999,
      price: parseFloat(row.price) || 0,
      currency: row.currency as Currency,
      producer: row.producer,
      country: row.issuingcountry || '',
      year: row.productyear || undefined,
      description: row.description || '',
      imageUrl: row.imageurl || '',
      inStock: row.instock ?? true,
      stockQuantity: row.stockquantity || 0,
      minimumOrderQuantity: row.minimumorderquantity || 1,
      premiumPercentage: parseFloat(row.premiumpercentage) || undefined,
      specifications: {
        diameter: parseFloat(row.diameter) || undefined,
        thickness: parseFloat(row.thickness) || undefined,
        mintage: row.mintage || undefined,
        certification: row.certification || undefined
      },
      tags: row.tags || [],
      createdAt: row.createdat || new Date().toISOString(),
      updatedAt: row.updatedat || new Date().toISOString()
    };
    
    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product", details: (error as Error).message });
  }
});

// GET product price by id
router.get("/price/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT price FROM product WHERE id = $1", [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching product price:", error);
    res.status(500).json({ error: "Failed to fetch product price", details: (error as Error).message });
  }
});

// GET prices for multiple product IDs
router.post("/prices", async (req: Request, res: Response) => {
  const { productIds } = req.body;
  
  // Fail fast if productIds is not an array or is empty
  if (!Array.isArray(productIds) || productIds.length === 0) {
    res.status(400).json({ error: "Invalid product IDs" });
    return;
  }

  const placeholders = productIds.map((_: unknown, index: number) => `$${index + 1}`).join(", ");
  const sql = `SELECT id, price FROM product WHERE id IN (${placeholders})`;

  try {
    const result = await pool.query(sql, productIds);
    const priceArray = result.rows.map(row => ({ id: row.id, price: row.price }));
    res.json(priceArray);
  } catch (error) {
    console.error("Error fetching product prices:", error);
    res.status(500).json({ error: "Failed to fetch product prices", details: (error as Error).message });
  }
});

// PUT update product
router.put("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { productName, productTypeId, metalId, issuingCountryId, producerId, fineWeight, unitOfMeasure, price } = req.body;
  try {
    const result = await pool.query(
      "UPDATE product SET productName = $1, productTypeId = $2, metalId = $3, issuingCountryId = $4, producerId = $5, fineWeight = $6, unitOfMeasure = $7, price = $8, updatedAt = CURRENT_TIMESTAMP WHERE id = $9 RETURNING *",
      [productName, productTypeId, metalId, issuingCountryId, producerId, fineWeight, unitOfMeasure, price, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Failed to update product", details: (error as Error).message });
  }
});

// DELETE product
router.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM product WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product", details: (error as Error).message });
  }
});

// add new product
router.post("/", async (req: Request, res: Response) => {
  const { productName, productTypeId, metalId, issuingCountryId, producerId, fineWeight, unitOfMeasure, price } = req.body;
  try {
    const result = await pool.query("INSERT INTO product (productName, productTypeId, metalId, issuingCountryId, producerId, fineWeight, unitOfMeasure, price) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *", [productName, productTypeId, metalId, issuingCountryId, producerId, fineWeight, unitOfMeasure, price]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ error: "Failed to add product", details: (error as Error).message });
  }
});

// search products
router.get("/search", async (req: Request, res: Response) => { 
  const { productName, productTypeId, metalId, issuingCountryId, producerId, minPrice, maxPrice } = req.query;

  console.info("Search query:", req.query); 

  let sql = "SELECT product.id, product.productName AS productName, productType.productTypeName AS productType, metal.metalName AS metal, issuingCountry.issuingCountryName AS issuingCountry, issuingCountry.isoCode2, producer.producerName AS producer, product.fineWeight, product.unitOfMeasure, product.price FROM product JOIN productType ON productType.id = product.productTypeId JOIN metal ON metal.id = product.metalId JOIN issuingCountry ON issuingCountry.id = product.issuingCountryId JOIN producer ON producer.id = product.producerId WHERE 1=1";
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (productName) {
    conditions.push(`product.productName LIKE $${params.length + 1}`);
    params.push(productName as string);
  }
  if (productTypeId) {
    conditions.push(`product.productTypeId = $${params.length + 1}`);
    params.push(productTypeId as string);
  }
  if (metalId) {
    conditions.push(`product.metalId = $${params.length + 1}`);
    params.push(metalId as string);
  }
  if (issuingCountryId) {
    conditions.push(`product.issuingCountryId = $${params.length + 1}`);
    params.push(issuingCountryId as string);
  }
  if (producerId) {
    conditions.push(`product.producerId = $${params.length + 1}`);
    params.push(producerId as string);
  }
  if (minPrice) {
    conditions.push(`product.price >= $${params.length + 1}`);
    params.push(Number(minPrice));
  }

  if (maxPrice) {
    conditions.push(`product.price <= $${params.length + 1}`);
    params.push(Number(maxPrice));
  }
  
  if (conditions.length > 0) {
    sql += " AND " + conditions.join(" AND ");
  }
  
  try { 
    console.info("Search query:", sql); 
    console.info("Query parameters:", params);
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (error) { 
    console.error("Error searching products:", error); 
    res.status(500).json({ error: "Failed to search products", details: (error as Error).message }); 
  }
});

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
// POST endpoint to validate product data using shared schema
router.post("/validate", async (req: Request, res: Response) => {
  try {
    // Validate the request body against the shared ProductSchema
    const validatedProduct = ProductSchema.parse(req.body);
    
    // If validation passes, you could save to database or just return success
    res.json({ 
      success: true, 
      message: "Product data is valid",
      product: validatedProduct 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Return validation errors in a user-friendly format
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      });
    } else {
      console.error("Error validating product:", error);
      res.status(500).json({ error: "Failed to validate product", details: (error as Error).message });
    }
  }
});

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
router.get("/:id/image", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "SELECT imageData, imageContentType, imageFilename FROM product WHERE id = $1 AND imageData IS NOT NULL",
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Product image not found" });
      return;
    }

    const { imagedata, imagecontenttype, imagefilename } = result.rows[0];

    // Set appropriate headers
    res.set({
      'Content-Type': imagecontenttype,
      'Content-Disposition': `inline; filename="${imagefilename}"`,
      'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
    });

    res.send(imagedata);

  } catch (error) {
    console.error("Error serving image:", error);
    res.status(500).json({ error: "Failed to serve image", details: (error as Error).message });
  }
});      

export default router;