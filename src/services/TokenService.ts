/**
 * Token Service Implementation
 * 
 * Handles JWT token generation and verification token creation
 * for user authentication and email verification.
 */

import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { ITokenService } from '../interfaces/IUserRegistrationService';
import { UserEntity, UserProfileEntity } from '../types/registration';

export class TokenService implements ITokenService {
  private readonly jwtSecret: string;
  private readonly jwtExpirationTime: string;

  constructor(jwtSecret: string, jwtExpirationTime: string = '24h') {
    if (!jwtSecret || jwtSecret.length === 0) {
      throw new Error('JWT secret cannot be empty');
    }
    this.jwtSecret = jwtSecret;
    this.jwtExpirationTime = jwtExpirationTime;
  }

  async generateJwtToken(user: UserEntity, profile: UserProfileEntity): Promise<{
    token: string;
    expiresAt: string;
  }> {
    try {
      const payload = {
        id: user.id,
        email: user.email,
        userName: `${profile.firstname} ${profile.lastname}`,
        role: user.role,
      };

      const token = jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.jwtExpirationTime,
      } as jwt.SignOptions);

      // Calculate expiration timestamp
      const expiresAt = new Date();
      if (this.jwtExpirationTime.endsWith('h')) {
        const hours = parseInt(this.jwtExpirationTime.slice(0, -1));
        expiresAt.setHours(expiresAt.getHours() + hours);
      } else if (this.jwtExpirationTime.endsWith('d')) {
        const days = parseInt(this.jwtExpirationTime.slice(0, -1));
        expiresAt.setDate(expiresAt.getDate() + days);
      } else {
        // Default to 24 hours if format is unclear
        expiresAt.setHours(expiresAt.getHours() + 24);
      }

      return {
        token,
        expiresAt: expiresAt.toISOString(),
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
