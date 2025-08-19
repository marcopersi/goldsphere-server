/**
 * Password Service Implementation
 * 
 * Handles secure password hashing and verification using bcrypt
 * with configurable salt rounds for security.
 */

import bcrypt from 'bcrypt';
import { IPasswordService } from '../interfaces/IUserRegistrationService';

export class PasswordService implements IPasswordService {
  private readonly saltRounds: number;

  constructor(saltRounds = 12) {
    if (saltRounds < 10) {
      throw new Error('Salt rounds must be at least 10 for security');
    }
    this.saltRounds = saltRounds;
  }

  async hashPassword(password: string): Promise<string> {
    if (!password || password.length === 0) {
      throw new Error('Password cannot be empty');
    }

    try {
      const hashedPassword = await bcrypt.hash(password, this.saltRounds);
      return hashedPassword;
    } catch (error) {
      console.error('Error hashing password:', error);
      throw new Error('Failed to hash password');
    }
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!password || password.length === 0) {
      throw new Error('Password cannot be empty');
    }

    if (!hash || hash.length === 0) {
      throw new Error('Hash cannot be empty');
    }

    try {
      const isValid = await bcrypt.compare(password, hash);
      return isValid;
    } catch (error) {
      console.error('Error verifying password:', error);
      throw new Error('Failed to verify password');
    }
  }
}
