/**
 * Email Service Factory
 * 
 * Creates Email service instances with proper configuration
 */

import { IEmailService } from './IEmailService';
import { EmailServiceImpl } from './impl/EmailServiceImpl';
import { EmailServiceMock } from './mock/EmailServiceMock';
import { EmailServiceConfig } from './types/EmailTypes';

export class EmailServiceFactory {
  private static shouldUseMockEmailService(): boolean {
    return process.env.NODE_ENV === 'test';
  }

  /**
   * Create production Email service with nodemailer
   * @param baseUrl Base URL for verification links
   * @param fromEmail From email address
   */
  static create(baseUrl: string, fromEmail: string): IEmailService {
    if (this.shouldUseMockEmailService()) {
      return new EmailServiceMock();
    }

    const config: EmailServiceConfig = {
      baseUrl,
      fromEmail
    };

    return new EmailServiceImpl(config);
  }

  /**
   * Create Email service with custom configuration
   */
  static createWithConfig(config: EmailServiceConfig): IEmailService {
    if (this.shouldUseMockEmailService()) {
      return new EmailServiceMock();
    }

    return new EmailServiceImpl(config);
  }

  /**
   * Create mock Email service for testing
   */
  static createMock(): IEmailService {
    return new EmailServiceMock();
  }
}
