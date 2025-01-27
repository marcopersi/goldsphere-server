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

// Issuing Countries Endpoints
router.get("/issuing-countries", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT id, name, iso_code FROM issuing_countries ORDER BY name");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching issuing countries:", error);
    res.status(500).json({ error: "Failed to fetch issuing countries", details: (error as Error).message });
  }
});

router.post("/issuing-countries", async (req: Request, res: Response) => {
  const { name, iso_code } = req.body;
  try {
    const result = await pool.query("INSERT INTO issuing_countries (name, iso_code) VALUES ($1, $2) RETURNING *", [name, iso_code]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding issuing country:", error);
    res.status(500).json({ error: "Failed to add issuing country", details: (error as Error).message });
  }
});

router.put("/issuing-countries/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, iso_code } = req.body;
  try {
    const result = await pool.query("UPDATE issuing_countries SET name = $1, iso_code = $2 WHERE id = $3 RETURNING *", [name, iso_code, id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating issuing country:", error);
    res.status(500).json({ error: "Failed to update issuing country", details: (error as Error).message });
  }
});

router.delete("/issuing-countries/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM issuing_countries WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting issuing country:", error);
    res.status(500).json({ error: "Failed to delete issuing country", details: (error as Error).message });
  }
});

router.get("/issuing-countries/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT id, name, iso_code FROM issuing_countries WHERE id = $1", [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching issuing country:", error);
    res.status(500).json({ error: "Failed to fetch issuing country", details: (error as Error).message });
  }
});

// Metals Endpoints
router.get("/metals", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT id, name FROM metals ORDER BY name");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching metals:", error);
    res.status(500).json({ error: "Failed to fetch metals", details: (error as Error).message });
  }
});

router.post("/metals", async (req: Request, res: Response) => {
  const { name } = req.body;
  try {
    const result = await pool.query("INSERT INTO metals (name) VALUES ($1) RETURNING *", [name]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding metal:", error);
    res.status(500).json({ error: "Failed to add metal", details: (error as Error).message });
  }
});

router.put("/metals/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const result = await pool.query("UPDATE metals SET name = $1 WHERE id = $2 RETURNING *", [name, id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating metal:", error);
    res.status(500).json({ error: "Failed to update metal", details: (error as Error).message });
  }
});

router.delete("/metals/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM metals WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting metal:", error);
    res.status(500).json({ error: "Failed to delete metal", details: (error as Error).message });
  }
});

router.get("/metals/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT id, name FROM metals WHERE id = $1", [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching metal:", error);
    res.status(500).json({ error: "Failed to fetch metal", details: (error as Error).message });
  }
});

// Product Types Endpoints
router.get("/product-types", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT id, name FROM product_types ORDER BY name");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching product types:", error);
    res.status(500).json({ error: "Failed to fetch product types", details: (error as Error).message });
  }
});

router.post("/product-types", async (req: Request, res: Response) => {
  const { name } = req.body;
  try {
    const result = await pool.query("INSERT INTO product_types (name) VALUES ($1) RETURNING *", [name]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding product type:", error);
    res.status(500).json({ error: "Failed to add product type", details: (error as Error).message });
  }
});

router.put("/product-types/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const result = await pool.query("UPDATE product_types SET name = $1 WHERE id = $2 RETURNING *", [name, id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating product type:", error);
    res.status(500).json({ error: "Failed to update product type", details: (error as Error).message });
  }
});

router.delete("/product-types/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM product_types WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting product type:", error);
    res.status(500).json({ error: "Failed to delete product type", details: (error as Error).message });
  }
});

router.get("/product-types/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT id, name FROM product_types WHERE id = $1", [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching product type:", error);
    res.status(500).json({ error: "Failed to fetch product type", details: (error as Error).message });
  }
});

// Manufacturers Endpoints
router.get("/manufacturers", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT id, name FROM manufacturers ORDER BY name");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching manufacturers:", error);
    res.status(500).json({ error: "Failed to fetch manufacturers", details: (error as Error).message });
  }
});

router.post("/manufacturers", async (req: Request, res: Response) => {
  const { name } = req.body;
  try {
    const result = await pool.query("INSERT INTO manufacturers (name) VALUES ($1) RETURNING *", [name]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding manufacturer:", error);
    res.status(500).json({ error: "Failed to add manufacturer", details: (error as Error).message });
  }
});

router.put("/manufacturers/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const result = await pool.query("UPDATE manufacturers SET name = $1 WHERE id = $2 RETURNING *", [name, id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating manufacturer:", error);
    res.status(500).json({ error: "Failed to update manufacturer", details: (error as Error).message });
  }
});

router.delete("/manufacturers/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM manufacturers WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting manufacturer:", error);
    res.status(500).json({ error: "Failed to delete manufacturer", details: (error as Error).message });
  }
});

router.get("/manufacturers/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT id, name FROM manufacturers WHERE id = $1", [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching manufacturer:", error);
    res.status(500).json({ error: "Failed to fetch manufacturer", details: (error as Error).message });
  }
});

export default router;
