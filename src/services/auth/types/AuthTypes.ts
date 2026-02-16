/**
 * Auth Types
 * Type definitions for authentication domain
 */

import { z } from 'zod';
import type { SessionSuccessResponse } from '../contract/AuthContract';

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
  role: z.enum(['admin', 'user', 'customer', 'advisor', 'investor']),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

// =============================================================================
// Error Codes (as object for runtime use)
// =============================================================================

export const AuthErrorCode = {
  INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',
  USER_INACTIVE: 'AUTH_USER_INACTIVE',
  STALE_ROLE_CLAIM: 'AUTH_STALE_ROLE_CLAIM',
  INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'AUTH_INTERNAL_ERROR',
} as const;

export type AuthErrorCode = typeof AuthErrorCode[keyof typeof AuthErrorCode];

// =============================================================================
// Types
// =============================================================================

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export interface AuthResponseEnvelope<T> {
  success: true;
  data: T;
}

export type LoginResponse = SessionSuccessResponse;

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
  firstName: string;
  lastName: string;
  role: string;
  status: 'active' | 'blocked' | 'suspended' | 'deleted' | 'inactive' | 'pending' | 'locked';
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

