import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';

interface AuthTokenPayload {
  id: string;
  email: string;
  role: string;
}

const envJwtSecret = process.env.JWT_SECRET;
const envJwtExpiresIn = process.env.JWT_EXPIRES_IN;

if (!envJwtSecret || envJwtSecret.trim().length === 0) {
  throw new Error('JWT_SECRET is required in tests/helpers/authToken.ts');
}

if (!envJwtExpiresIn || envJwtExpiresIn.trim().length === 0) {
  throw new Error('JWT_EXPIRES_IN is required in tests/helpers/authToken.ts');
}

const JWT_SECRET: string = envJwtSecret;
const JWT_EXPIRES_IN: string = envJwtExpiresIn;

export function generateToken(payload: AuthTokenPayload): string {
  const signOptions: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };

  return jwt.sign(payload, JWT_SECRET, signOptions);
}
