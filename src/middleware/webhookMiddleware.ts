import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to parse raw body for webhook endpoints
 * This is needed for Stripe webhook signature verification
 */
export const rawBodyMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (req.originalUrl === '/api/payments/webhook') {
    let data = '';
    req.setEncoding('utf8');
    
    req.on('data', (chunk: string) => {
      data += chunk;
    });
    
    req.on('end', () => {
      req.body = data;
      next();
    });
  } else {
    next();
  }
};
