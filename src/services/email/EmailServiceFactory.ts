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
  /**
   * Create production Email service with nodemailer
   * @param baseUrl Base URL for verification links
   * @param fromEmail From email address (default: noreply@goldsphere.com)
   */
  static create(
    baseUrl: string = process.env.BASE_URL || 'http://localhost:8080',
    fromEmail = 'noreply@goldsphere.com'
  ): IEmailService {
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
    return new EmailServiceImpl(config);
  }

  /**
   * Create mock Email service for testing
   */
  static createMock(): IEmailService {
    return new EmailServiceMock();
  }
}
