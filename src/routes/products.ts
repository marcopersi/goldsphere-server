import { Router, Request, Response } from "express";
import pool from "../dbConfig"; // Import the shared pool configuration

const router = Router();

// GET all products
router.get("/products", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT product.id, product.productName AS productname, productType.productTypeName AS producttype, metal.metalName AS metal, issuingCountry.issuingCountryName AS issuingcountry, producer.producername AS producer, product.fineWeight, product.unitOfMeasure, product.price FROM product JOIN productType ON productType.id = product.productTypeId JOIN metal ON metal.id = product.metalId JOIN issuingCountry ON issuingCountry.id = product.issuingCountryId JOIN producer ON producer.id = product.producerId");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products", details: (error as Error).message });
  }
});

router.get("/products/search", async (req: Request, res: Response) => { 
  const { productName, productTypeId, metalId, issuingCountryId, producerId, minPrice, maxPrice } = req.query;

  let sql = "SELECT product.id, product.productName AS productName, productType.productTypeName AS productType, metal.metalName AS metal, issuingCountry.issuingCountryName AS issuingCountry, producer.producerName AS producer, product.fineWeight, product.unitOfMeasure, product.price FROM product JOIN productType ON productType.id = product.productTypeId JOIN metal ON metal.id = product.metalId JOIN issuingCountry ON issuingCountry.id = product.issuingCountryId JOIN producer ON producer.id = product.producerId WHERE 1=1";
  const conditions: string[] = [];
  const params: any[] = [];

  if (productName) {
    conditions.push(`product.productName LIKE $${params.length + 1}`);
    params.push(`%${productName}%`);
  }
  if (productTypeId) {
    conditions.push(`product.productTypeId = $${params.length + 1}`);
    params.push(productTypeId);
  }
  if (metalId) {
    conditions.push(`product.metalId = $${params.length + 1}`);
    params.push(metalId);
  }
  if (issuingCountryId) {
    conditions.push(`product.issuingCountryId = $${params.length + 1}`);
    params.push(issuingCountryId);
  }
  if (producerId) {
    conditions.push(`product.producerId = $${params.length + 1}`);
    params.push(producerId);
  }
  if (minPrice) {
    conditions.push(`product.price >= $${params.length + 1}`);
    params.push(minPrice);
  }
  if (maxPrice) {
    conditions.push(`product.price <= $${params.length + 1}`);
    params.push(maxPrice);
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

// PUT update product
router.put("/products/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { productName, productTypeId, metalId, issuingCountryId, producerId, fineWeight, unitOfMeasure, price } = req.body;
  try {
    const result = await pool.query(
      "UPDATE product SET productName = $1, productTypeId = $2, metalId = $3, issuingCountryId = $4, producerId = $5,fineWeight = $6, unitOfMeasure = $7, price = $8, updatedAt = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *", 
      [productName, productTypeId, metalId, issuingCountryId, producerId, fineWeight, unitOfMeasure,price, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Failed to update product", details: (error as Error).message });
  }
});

// DELETE product
router.delete("/products/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM product WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product", details: (error as Error).message });
  }
});

// GET product by id
router.get("/products/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT id, productName, productTypeId, metalId, issuingCountryId, producerId,fineWeight,unitOfMeasure, price, createdAt, updatedAt FROM product WHERE id = $1", [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product", details: (error as Error).message });
  }
});

export default router;