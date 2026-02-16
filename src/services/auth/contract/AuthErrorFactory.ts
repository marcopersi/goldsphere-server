export const AUTH_ERROR_CODES = {
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',
  AUTH_USER_INACTIVE: 'AUTH_USER_INACTIVE',
  AUTH_STALE_ROLE_CLAIM: 'AUTH_STALE_ROLE_CLAIM',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_INTERNAL_ERROR: 'AUTH_INTERNAL_ERROR',
} as const;

export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES];

export interface AuthErrorDetails {
  fields?: Array<{
    path: string;
    message: string;
  }>;
}

export interface AuthErrorResponse {
  success: false;
  code: AuthErrorCode;
  error: string;
  details?: AuthErrorDetails;
}

export interface AuthHttpError extends Error {
  status: number;
  authErrorResponse: AuthErrorResponse;
}

export function getAuthHttpStatus(code: AuthErrorCode): number {
  switch (code) {
    case AUTH_ERROR_CODES.VALIDATION_ERROR:
      return 400;
    case AUTH_ERROR_CODES.AUTH_ACCOUNT_LOCKED:
    case AUTH_ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS:
      return 403;
    case AUTH_ERROR_CODES.AUTH_INTERNAL_ERROR:
      return 500;
    default:
      return 401;
  }
}

export function createAuthError(
  code: AuthErrorCode,
  error: string,
  details?: AuthErrorDetails
): AuthErrorResponse {
  return {
    success: false,
    code,
    error,
    ...(details ? { details } : {}),
  };
}

export function createValidationError(path: string, message: string): AuthErrorResponse {
  return createAuthError(AUTH_ERROR_CODES.VALIDATION_ERROR, 'Validation failed', {
    fields: [{ path, message }],
  });
}

export function createAuthHttpError(
  code: AuthErrorCode,
  error: string,
  details?: AuthErrorDetails,
  status?: number
): AuthHttpError {
  const err = new Error(error) as AuthHttpError;
  err.status = status ?? getAuthHttpStatus(code);
  err.authErrorResponse = createAuthError(code, error, details);
  return err;
}
