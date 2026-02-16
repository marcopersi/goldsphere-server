import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { getPool } from '../dbConfig';
import { UserErrorCode, UserServiceFactory } from '../services/user';

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

function getBearerToken(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }
  return authHeader.split(' ')[1] || null;
}

function respondVerificationFailure(res: Response, errorCode?: UserErrorCode, errorMessage?: string): void {
  if (errorCode === UserErrorCode.USER_NOT_FOUND) {
    res.status(401).json({
      error: 'Invalid token',
      details: 'User no longer exists'
    });
    return;
  }

  if (errorCode === UserErrorCode.UNAUTHORIZED && errorMessage === 'User account is inactive') {
    res.status(401).json({
      error: 'Account inactive',
      details: 'Your account has been deactivated'
    });
    return;
  }

  if (errorCode === UserErrorCode.UNAUTHORIZED && errorMessage === 'Token role is stale. Please re-authenticate.') {
    res.status(401).json({
      error: 'Token expired',
      details: 'User role has changed. Please re-authenticate to get a new token.'
    });
    return;
  }

  res.status(401).json({
    error: 'Invalid token',
    details: 'Please provide a valid JWT token'
  });
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const token = getBearerToken(req.headers['authorization']);

  if (!token) {
    res.status(401).json({ 
      error: 'Access token required',
      details: 'Please provide a valid Bearer token in the Authorization header'
    });
    return;
  }

  try {
    const decoded = verifyToken(token);

    const userService = UserServiceFactory.createUserService(getPool());
    const verification = await userService.verifyUser(decoded.id, decoded.role);

    if (!verification.success || !verification.data) {
      respondVerificationFailure(res, verification.errorCode, verification.error);
      return;
    }

    const dbUser = verification.data;
    
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
  const token = getBearerToken(req.headers['authorization']);

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = verifyToken(token);

    const userService = UserServiceFactory.createUserService(getPool());
    const verification = await userService.verifyUser(decoded.id, decoded.role);

    if (verification.success && verification.data) {
      const dbUser = verification.data;
      // Use DB data, not token data!
      req.user = {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role
      };
    } else if (verification.error === 'User account is inactive') {
      console.warn('Token valid but user account inactive:', decoded.id);
    } else if (verification.error === 'Token role is stale. Please re-authenticate.') {
      console.warn('Token valid but user role changed:', decoded.id, 'token role:', decoded.role);
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
