import { Router, Request, Response } from "express";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const router = Router();
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD), // Ensure password is a string
  database: process.env.DB_NAME,
});

router.get("/products", async (req: Request, res: Response) => {
  console.log("GET /api/products");
  try {
    const result = await pool.query(
      "SELECT products.id, products.name AS product_name, product_types.name AS product_type, metals.name AS metal, issuing_countries.name AS issuing_country, manufacturers.name AS manufacturer, products.price FROM products JOIN product_types ON product_types.id = products.product_type_id JOIN metals ON metals.id = products.metal_id JOIN issuing_countries ON issuing_countries.id = products.issuing_country_id JOIN manufacturers ON manufacturers.id = products.manufacturer_id");
      res.json(result.rows);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products", details: (error as Error).message });
  }
});

router.get("/products/search", async (req: Request, res: Response) => { let query = "select * from products where products.product_type_id ='1ce6eb4b-0d97-4558-9f33-995c389ec116'";
  const { name, product_type_id, metal_id, issuing_country_id, manufacturer_id, min_price, max_price } = req.query;

  console.log("Received product_type_id:", product_type_id);

  let sql = "SELECT products.id, products.name AS product_name, product_types.name AS product_type, metals.name AS metal, issuing_countries.name AS issuing_country, manufacturers.name AS manufacturer, products.price FROM products JOIN product_types ON product_types.id = products.product_type_id JOIN metals ON metals.id = products.metal_id JOIN issuing_countries ON issuing_countries.id = products.issuing_country_id JOIN manufacturers ON manufacturers.id = products.manufacturer_id WHERE 1=1";
  const conditions: string[] = [];
  const params: any[] = [];

  if (name) {
    conditions.push(`products.name ILIKE $${params.length + 1}`);
    params.push(`%${name}%`);
  }
  if (product_type_id) {
    conditions.push(`products.product_type_id = $${params.length + 1}`);
    params.push(product_type_id);
  }
  if (metal_id) {
    conditions.push(`products.metal_id = $${params.length + 1}`);
    params.push(metal_id);
  }
  if (issuing_country_id) {
    conditions.push(`products.issuing_country_id = $${params.length + 1}`);
    params.push(issuing_country_id);
  }
  if (manufacturer_id) {
    conditions.push(`products.manufacturer_id = $${params.length + 1}`);
    params.push(manufacturer_id);
  }
  if (min_price) {
    conditions.push(`products.price >= $${params.length + 1}`);
    params.push(min_price);
  }
  if (max_price) {
    conditions.push(`products.price <= $${params.length + 1}`);
    params.push(max_price);
  }

  if (conditions.length > 0) {
    query += " AND " + conditions.join(" AND ");
  }

  try { 
    console.info("Search query:", sql); 
    console.info("Query parameters:", params);
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) { 
    console.error("Error searching products:", error); 
    res.status(500).json({ error: "Failed to search products", details: (error as Error).message }); 
  } 
});

// GET /api/products/:id - Get product by ID
router.get("/products/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT products.id, products.name AS product_name, product_types.name AS product_type, metals.name AS metal, issuing_countries.name AS issuing_country, manufacturers.name AS manufacturer, products.price FROM products JOIN product_types ON product_types.id = products.product_type_id JOIN metals ON metals.id = products.metal_id JOIN issuing_countries ON issuing_countries.id = products.issuing_country_id JOIN manufacturers ON manufacturers.id = products.manufacturer_id WHERE products.id = $1", [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product", details: (error as Error).message });
  }
});

// POST /api/products - Add new product
router.post("/products/", async (req: Request, res: Response) => {
  const { name, product_type_id, metal_id, issuing_country_id, manufacturer_id, price } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO products (name, product_type_id, metal_id, issuing_country_id, manufacturer_id, price) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *", [name, product_type_id, metal_id, issuing_country_id, manufacturer_id, price]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ error: "Failed to add product", details: (error as Error).message });
  }
});

// PUT /api/products/:id - Update product
router.put("/products/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, product_type_id, metal_id, issuing_country_id, manufacturer_id, price } = req.body;
  try {
    const result = await pool.query(
      "UPDATE products SET name = $1, product_type_id = $2, metal_id = $3, issuing_country_id = $4, manufacturer_id = $5, price = $6 WHERE id = $7 RETURNING *", [name, product_type_id, metal_id, issuing_country_id, manufacturer_id, price, id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Failed to update product", details: (error as Error).message });
  }
});

// DELETE /api/products/:id - Delete product
router.delete("/products/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM products WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product", details: (error as Error).message });
  }
});

export default router;