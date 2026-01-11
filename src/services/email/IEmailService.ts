/**
 * Email Service Interface
 * 
 * Defines the contract for email sending operations
 */

import { EmailUserInfo } from './types/EmailTypes';

export interface IEmailService {
  /**
   * Send email verification to user
   * @param email User's email address
   * @param token Verification token
   * @param userInfo User information for personalization
   */
  sendEmailVerification(
    email: string,
    token: string,
    userInfo: EmailUserInfo
  ): Promise<void>;

  /**
   * Test email service connection
   * @returns True if connection is successful
   */
  testConnection(): Promise<boolean>;
}
