/**
 * Email Service Mock Implementation
 * 
 * Mock implementation for testing without sending real emails
 */

import { IEmailService } from '../IEmailService';
import { EmailUserInfo } from '../types/EmailTypes';

export class EmailServiceMock implements IEmailService {
  private sentEmails: Array<{
    email: string;
    token: string;
    userInfo: EmailUserInfo;
    sentAt: Date;
  }> = [];

  async sendEmailVerification(
    email: string,
    token: string,
    userInfo: EmailUserInfo
  ): Promise<void> {
    console.log(`📧 [MOCK] Email verification sent to ${email} with token ${token}`);
    
    this.sentEmails.push({
      email,
      token,
      userInfo,
      sentAt: new Date()
    });
  }

  async testConnection(): Promise<boolean> {
    console.log('✅ [MOCK] Email service connection test passed');
    return true;
  }

  // Test helper methods
  getSentEmails() {
    return [...this.sentEmails];
  }

  getLastSentEmail() {
    return this.sentEmails[this.sentEmails.length - 1] || null;
  }

  clear() {
    this.sentEmails = [];
  }
}
