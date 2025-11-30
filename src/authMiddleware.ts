import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getPool } from "./dbConfig";

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export default async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Access token required" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Verify user exists in database and role is current
    const dbUser = await verifyUserInDatabase(decoded.id, decoded.role);
    if (!dbUser) {
      res.status(401).json({ 
        error: "Invalid token",
        details: "User not found or has been deactivated"
      });
      return;
    }

    if (dbUser.role !== decoded.role) {
      res.status(401).json({ 
        error: "Token expired",
        details: "User role has changed, please re-authenticate"
      });
      return;
    }

    // Add verified user data to request
    (req as any).user = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role
    };
    next();

  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ 
        error: "Token expired",
        details: "Please refresh your token and try again"
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ 
        error: "Invalid token",
        details: "Please provide a valid JWT token"
      });
    } else {
      console.error('Authentication error:', error);
      res.status(500).json({ 
        error: "Authentication verification failed",
        details: "Unable to verify user status"
      });
    }
  }
}

async function verifyUserInDatabase(userId: string, _expectedRole: string): Promise<{
  id: string;
  email: string;
  role: string;
} | null> {
  try {
    const result = await getPool().query(
      "SELECT id, email FROM users WHERE id = $1", 
      [userId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    const userRole = user.email.includes('admin') ? 'admin' : 'user';
    
    return {
      id: user.id,
      email: user.email,
      role: userRole
    };
  } catch (error) {
    console.error('Database user verification error:', error);
    return null;
  }
}
