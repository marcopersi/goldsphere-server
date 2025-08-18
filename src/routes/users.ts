import { Router, Request, Response } from "express";
import pool from "../dbConfig";
import { 
  UuidSchema
} from "@marcopersi/shared";
import { z } from 'zod';

const router = Router();

// User validation schemas using shared patterns
const UserSchema = z.object({
  id: UuidSchema,
  username: z.string().min(3).max(50),
  email: z.string().email("Invalid email format"),
  passwordhash: z.string().min(1),
  createdat: z.string().optional(),
  updatedat: z.string().optional()
});

const CreateUserRequestSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email("Invalid email format"),
  passwordhash: z.string().min(8, "Password must be at least 8 characters")
});

const UpdateUserRequestSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  email: z.string().email("Invalid email format").optional(),
  passwordhash: z.string().min(8).optional()
});

// GET all users with pagination
router.get("/users", async (req: Request, res: Response) => {
  try {
    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const result = await pool.query(
      "SELECT id, username, email, createdat, updatedat FROM users ORDER BY username LIMIT $1 OFFSET $2", 
      [limit, offset]
    );
    
    const countResult = await pool.query("SELECT COUNT(*) FROM users");
    const totalCount = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch users", 
      details: (error as Error).message 
    });
  }
});

// POST new user
router.post("/users", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = CreateUserRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid user data",
        details: validation.error.issues
      });
    }

    const { username, email, passwordhash } = validation.data;
    
    // Check for duplicate username or email
    const duplicateCheck = await pool.query(
      "SELECT id FROM users WHERE username = $1 OR email = $2", 
      [username, email]
    );
    
    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: "Username or email already exists"
      });
    }

    const result = await pool.query(
      "INSERT INTO users (username, email, passwordhash) VALUES ($1, $2, $3) RETURNING id, username, email, createdat, updatedat", 
      [username, email, passwordhash]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: "User created successfully"
    });
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to add user", 
      details: (error as Error).message 
    });
  }
});

// PUT update user
router.put("/users/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate user ID
    const idValidation = UuidSchema.safeParse(id);
    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID format"
      });
    }
    
    // Validate request body
    const validation = UpdateUserRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid user data",
        details: validation.error.issues
      });
    }

    const updates = validation.data;

    // Check if user exists
    const userExists = await pool.query("SELECT id FROM users WHERE id = $1", [id]);
    if (userExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    // Check for duplicates if username or email are being updated
    if (updates.username || updates.email) {
      const duplicateConditions = [];
      const duplicateValues = [];
      
      if (updates.username) {
        duplicateConditions.push("username = $" + (duplicateValues.length + 1));
        duplicateValues.push(updates.username);
      }
      if (updates.email) {
        duplicateConditions.push("email = $" + (duplicateValues.length + 1));
        duplicateValues.push(updates.email);
      }
      
      duplicateValues.push(id);
      const duplicateQuery = `SELECT id FROM users WHERE (${duplicateConditions.join(" OR ")}) AND id != $${duplicateValues.length}`;
      
      const duplicateCheck = await pool.query(duplicateQuery, duplicateValues);
      if (duplicateCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: "Username or email already exists"
        });
      }
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (updates.username !== undefined) {
      updateFields.push(`username = $${paramIndex++}`);
      updateValues.push(updates.username);
    }
    if (updates.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      updateValues.push(updates.email);
    }
    if (updates.passwordhash !== undefined) {
      updateFields.push(`passwordhash = $${paramIndex++}`);
      updateValues.push(updates.passwordhash);
    }

    updateFields.push(`updatedat = CURRENT_TIMESTAMP`);
    updateValues.push(id);

    if (updateFields.length === 1) { // Only timestamp update
      return res.status(400).json({
        success: false,
        error: "No valid fields provided for update"
      });
    }

    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING id, username, email, createdat, updatedat
    `;

    const result = await pool.query(updateQuery, updateValues);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: "User updated successfully"
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to update user", 
      details: (error as Error).message 
    });
  }
});

// DELETE user
router.delete("/users/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate user ID
    const idValidation = UuidSchema.safeParse(id);
    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID format"
      });
    }

    // Check if user exists
    const userExists = await pool.query("SELECT id, username FROM users WHERE id = $1", [id]);
    if (userExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    // Check for referential integrity (orders, portfolios, etc.)
    const orderCheck = await pool.query("SELECT COUNT(*) as count FROM orders WHERE userid = $1", [id]);
    if (parseInt(orderCheck.rows[0].count) > 0) {
      return res.status(409).json({
        success: false,
        error: "Cannot delete user with existing orders. Please remove orders first."
      });
    }

    const portfolioCheck = await pool.query("SELECT COUNT(*) as count FROM portfolio WHERE ownerid = $1", [id]);
    if (parseInt(portfolioCheck.rows[0].count) > 0) {
      return res.status(409).json({
        success: false,
        error: "Cannot delete user with existing portfolios. Please remove portfolios first."
      });
    }

    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    
    res.json({
      success: true,
      message: `User '${userExists.rows[0].username}' deleted successfully`
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to delete user", 
      details: (error as Error).message 
    });
  }
});

// GET user by id
router.get("/users/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate user ID
    const idValidation = UuidSchema.safeParse(id);
    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID format"
      });
    }

    const result = await pool.query(
      "SELECT id, username, email, createdat, updatedat FROM users WHERE id = $1", 
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch user", 
      details: (error as Error).message 
    });
  }
});

export default router;