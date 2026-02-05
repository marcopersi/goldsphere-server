/**
 * Auth Service Interface
 * Defines authentication operations
 */

import { 
  LoginRequest, 
  LoginResponse, 
  AuthResult, 
  TokenPayload,
  AuthUser 
} from './types';

export interface IAuthService {
  /**
   * Authenticate user with email and password
   */
  login(request: LoginRequest): Promise<AuthResult<LoginResponse>>;

  /**
   * Validate JWT token and return payload
   */
  validateToken(token: string): Promise<AuthResult<TokenPayload>>;

  /**
   * Refresh an existing token
   */
  refreshToken(token: string): Promise<AuthResult<LoginResponse>>;

  /**
   * Get current user from token
   */
  getCurrentUser(token: string): Promise<AuthResult<AuthUser>>;
}
