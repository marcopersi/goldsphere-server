import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import pool from '../dbConfig';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export function generateToken(payload: { id: string; email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

/**
 * Verify user exists in database and fetch current role
 * Returns user data from DB, not from token
 */
async function verifyUserInDatabase(userId: string): Promise<{
  id: string;
  email: string;
  role: string;
  accountStatus: string;
} | null> {
  try {
    const result = await pool.query(
      'SELECT id, email, role, account_status FROM users WHERE id = $1', 
      [userId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      accountStatus: user.account_status
    };
  } catch (error) {
    console.error('Database verification error:', error);
    return null;
  }
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ 
      error: 'Access token required',
      details: 'Please provide a valid Bearer token in the Authorization header'
    });
    return;
  }

  try {
    const decoded = verifyToken(token);
    
    // Verify user exists in database and fetch current data
    const dbUser = await verifyUserInDatabase(decoded.id);
    if (!dbUser) {
      res.status(401).json({ 
        error: 'Invalid token',
        details: 'User no longer exists'
      });
      return;
    }
    
    // Check if user account is active
    if (dbUser.accountStatus !== 'active') {
      res.status(401).json({ 
        error: 'Account inactive',
        details: 'Your account has been deactivated'
      });
      return;
    }
    
    // SECURITY: Check if role has changed since token was issued
    if (dbUser.role !== decoded.role) {
      res.status(401).json({ 
        error: 'Token expired',
        details: 'User role has changed. Please re-authenticate to get a new token.'
      });
      return;
    }
    
    // Use DB data, not token data!
    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ 
        error: 'Token expired',
        details: 'Please refresh your token and try again'
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ 
        error: 'Invalid token',
        details: 'Please provide a valid JWT token'
      });
    } else {
      res.status(500).json({ 
        error: 'Token verification failed',
        details: (error as Error).message
      });
    }
  }
}

export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = verifyToken(token);
    
    // Verify user exists in database and fetch current data
    const dbUser = await verifyUserInDatabase(decoded.id);
    if (dbUser && dbUser.accountStatus === 'active' && dbUser.role === decoded.role) {
      // Use DB data, not token data!
      req.user = {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role
      };
    } else if (dbUser && dbUser.accountStatus !== 'active') {
      console.warn('Token valid but user account inactive:', decoded.id);
    } else if (dbUser && dbUser.role !== decoded.role) {
      console.warn('Token valid but user role changed:', decoded.id, 'token role:', decoded.role, 'db role:', dbUser.role);
    } else {
      console.warn('Token valid but user no longer exists:', decoded.id);
    }
  } catch (error) {
    // For optional auth, we don't reject invalid tokens, just ignore them
    console.warn('Invalid token in optional auth:', (error as Error).message);
  }

  next();
}

export function requireRole(role: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Authentication required',
        details: 'Please authenticate to access this resource'
      });
      return;
    }

    if (req.user.role !== role && req.user.role !== 'admin') {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        details: `This endpoint requires ${role} role or higher`
      });
      return;
    }

    next();
  };
}

export function requireAnyRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Authentication required',
        details: 'Please authenticate to access this resource'
      });
      return;
    }

    if (!roles.includes(req.user.role) && req.user.role !== 'admin') {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        details: `This endpoint requires one of the following roles: ${roles.join(', ')}`
      });
      return;
    }

    next();
  };
}
