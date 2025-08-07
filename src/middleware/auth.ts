import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

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

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
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
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
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

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = verifyToken(token);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
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
