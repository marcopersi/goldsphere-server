/**
 * Token Service Implementation
 * 
 * Handles JWT token generation and verification token creation
 * for user authentication and email verification.
 */

import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { ITokenService } from '../IRegistrationService';
import { UserEntity, UserProfileEntity } from '../types';

export class TokenService implements ITokenService {
  private readonly jwtSecret: string;
  private readonly jwtExpirationTime: string;

  constructor(jwtSecret: string, jwtExpirationTime = '24h') {
    if (!jwtSecret || jwtSecret.length === 0) {
      throw new Error('JWT secret cannot be empty');
    }
    this.jwtSecret = jwtSecret;
    this.jwtExpirationTime = jwtExpirationTime;
  }

  async generateJwtToken(user: UserEntity, profile: UserProfileEntity): Promise<{
    token: string;
    expiresIn: number;
    expiresAt: string;
  }> {
    try {
      const payload = {
        id: user.id,
        email: user.email,
        userName: `${profile.firstName} ${profile.lastName}`,
        role: user.role,
      };

      const token = jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.jwtExpirationTime,
      } as jwt.SignOptions);

      const decoded = jwt.decode(token) as jwt.JwtPayload | null;
      if (!decoded || typeof decoded.exp !== 'number') {
        throw new Error('Unable to decode token expiration metadata');
      }

      const issuedAtSeconds = typeof decoded.iat === 'number'
        ? decoded.iat
        : Math.floor(Date.now() / 1000);
      const expiresIn = Math.max(0, decoded.exp - issuedAtSeconds);
      const expiresAt = new Date(decoded.exp * 1000).toISOString();

      return {
        token,
        expiresIn,
        expiresAt,
      };
    } catch (error) {
      console.error('Error generating JWT token:', error);
      throw new Error('Failed to generate authentication token');
    }
  }

  async generateVerificationToken(userId: string): Promise<string> {
    if (!userId || userId.length === 0) {
      throw new Error('User ID cannot be empty');
    }

    try {
      // Generate a UUID-based verification token
      const token = uuidv4();
      return token;
    } catch (error) {
      console.error('Error generating verification token:', error);
      throw new Error('Failed to generate verification token');
    }
  }

  /**
   * Verify a JWT token (utility method for future use)
   */
  async verifyJwtToken(token: string): Promise<any> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      return decoded;
    } catch (error) {
      console.error('Error verifying JWT token:', error);
      throw new Error('Invalid or expired token');
    }
  }
}
