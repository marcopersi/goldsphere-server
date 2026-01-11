/**
 * Email Service - Barrel Export
 * 
 * Central export point for Email domain
 */

// Interfaces
export { IEmailService } from './IEmailService';

// Types
export {
  EmailConfig,
  EmailUserInfo,
  EmailServiceConfig
} from './types/EmailTypes';

// Implementations
export { EmailServiceImpl } from './impl/EmailServiceImpl';

// Mocks
export { EmailServiceMock } from './mock/EmailServiceMock';

// Factory
export { EmailServiceFactory } from './EmailServiceFactory';
