import { Router, Request, Response } from "express";
import pool from "../dbConfig"; // Import the shared pool configuration

const router = Router();

// GET all users
router.get("/users", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT id, username, email, passwordhash, createdat, updatedat FROM users ORDER BY username");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users", details: (error as Error).message });
  }
});

// POST new user
router.post("/users", async (req: Request, res: Response) => {
  const { username, email, passwordhash } = req.body;
  console.info("Adding user:", username, email, passwordhash);
  try {
    const result = await pool.query("INSERT INTO users (username, email, passwordhash) VALUES ($1, $2, $3) RETURNING *", [username, email, passwordhash]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).json({ error: "Failed to add user", details: (error as Error).message });
  }
});

// PUT update user
router.put("/users/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { username, email, passwordhash } = req.body;
  try {
    const result = await pool.query("UPDATE users SET username = $1, email = $2, passwordhash = $3, updatedat = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *", [username, email, passwordhash, id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user", details: (error as Error).message });
  }
});

// DELETE user
router.delete("/users/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user", details: (error as Error).message });
  }
});

// GET user by id
router.get("/users/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT id, username, email, passwordhash, createdat, updatedat FROM users WHERE id = $1", [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user", details: (error as Error).message });
  }
});

export default router;