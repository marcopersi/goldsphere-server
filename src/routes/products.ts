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

// GET product by id
router.get("/products/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT id, productName, productTypeId, metalId, issuingCountryId, producerId, fineWeight, unitOfMeasure, price, createdAt, updatedAt FROM product WHERE id = $1", [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product", details: (error as Error).message });
  }
});

// GET product price by id
router.get("/products/price/:id", async (req: Request, res: Response) => {
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
router.post("/products/prices", async (req: Request, res: Response) => {
  const { productIds } = req.body;
  
  //fail fast if productIds is not an array or is empty
  if (!Array.isArray(productIds) || productIds.length === 0) {
     res.status(400).json({ error: "Invalid product IDs" });
  } else {
    const placeholders = productIds.map((_: any, index: number) => `$${index + 1}`).join(", ");
    const sql = `SELECT id, price FROM product WHERE id IN (${placeholders})`;

    try {
      const result = await pool.query(sql, productIds);
      const priceMap = result.rows.reduce((map, row) => {
        map[row.id] = row.price;
        return map;
      }, {});
      res.json(priceMap);
    } catch (error) {
      console.error("Error fetching product prices:", error);
      res.status(500).json({ error: "Failed to fetch product prices", details: (error as Error).message });
    }}
  })  ;

// PUT update product
router.put("/products/:id", async (req: Request, res: Response) => {
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

// POST new product
router.post("/products", async (req: Request, res: Response) => {
  const { productName, productTypeId, metalId, issuingCountryId, producerId, fineWeight, unitOfMeasure, price } = req.body;
  try {
    const result = await pool.query("INSERT INTO product (productName, productTypeId, metalId, issuingCountryId, producerId, fineWeight, unitOfMeasure, price) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *", [productName, productTypeId, metalId, issuingCountryId, producerId, fineWeight, unitOfMeasure, price]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ error: "Failed to add product", details: (error as Error).message });
  }
});

export default router;