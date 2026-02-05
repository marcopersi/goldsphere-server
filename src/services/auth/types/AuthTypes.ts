/**
 * Auth Types
 * Type definitions for authentication domain
 */

import { z } from 'zod';

// =============================================================================
// Zod Schemas
// =============================================================================

export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const TokenPayloadSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'advisor', 'investor']),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

// =============================================================================
// Error Codes (as object for runtime use)
// =============================================================================

export const AuthErrorCode = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type AuthErrorCode = typeof AuthErrorCode[keyof typeof AuthErrorCode];

// =============================================================================
// Types
// =============================================================================

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export interface LoginResponse {
  success: true;
  token: string;
  user: AuthUser;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export type TokenPayload = z.infer<typeof TokenPayloadSchema>;

export interface AuthResult<T> {
  success: boolean;
  data?: T;
  error?: AuthError;
}

export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

// =============================================================================
// Repository Types
// =============================================================================

export interface AuthUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  status: 'active' | 'inactive' | 'pending' | 'locked';
  lastLogin?: Date;
}

// =============================================================================
// Validation Helpers
// =============================================================================

export function validateLoginRequest(data: unknown): AuthResult<LoginRequest> {
  const result = LoginRequestSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: {
      code: AuthErrorCode.INVALID_CREDENTIALS,
      message: result.error.issues.map(i => i.message).join(', '),
    },
  };
}

