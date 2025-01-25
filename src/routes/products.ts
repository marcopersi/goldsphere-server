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
      "SELECT products.name AS product_name, product_types.name AS product_type, metals.name AS metal, issuing_countries.name AS issuing_country, manufacturers.name AS manufacturer, products.price FROM products JOIN product_types ON product_types.id = products.product_type_id JOIN metals ON metals.id = products.metal_id JOIN issuing_countries ON issuing_countries.id = products.issuing_country_id JOIN manufacturers ON manufacturers.id = products.manufacturer_id");
      res.json(result.rows);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products", details: (error as Error).message });
  }
});

export default router;
