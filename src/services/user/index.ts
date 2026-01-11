/**
 * User Service - Barrel Export
 * 
 * Central export point for User domain.
 * All user-related types, interfaces, and implementations are exported from here.
 */

// =============================================================================
// Types Module (Enums, Entities, DTOs, Mappers)
// =============================================================================
export * from './types';

// =============================================================================
// Registration Types (Zod Schemas, Request/Response)
// =============================================================================
export {
  PersonalInfo,
  Address,
  DocumentInfo,
  Consent,
  EnhancedRegistrationRequest,
  EnhancedRegistrationResponse,
  RegistrationErrorResponse,
  EnhancedRegistrationRequestSchema,
  ERROR_CODES,
  RegistrationResult,
  ValidationError as RegistrationValidationError,
} from './registrationTypes';

// =============================================================================
// Service Interfaces
// =============================================================================
export {
  IUserRegistrationService,
  IRegistrationRepository,
  IPasswordService,
  ITokenService,
  IEmailService,
  ValidationResult,
  RegistrationConfig,
} from './IRegistrationService';

export {
  IUserService,
  UserOperationResult,
  UserErrorCode,
  UserWithDetails,
  CreateUserInput,
  UpdateUserInput,
} from './service';

// =============================================================================
// Repository Interfaces
// =============================================================================
export {
  IUserRepository,
  TransactionCallback,
} from './repository';

// =============================================================================
// Implementations
// =============================================================================
export { PasswordService, TokenService, UserRegistrationServiceImpl } from './impl';
export { UserServiceImpl } from './service/UserServiceImpl';
export { UserRepositoryImpl, UserRepository } from './repository';

// =============================================================================
// Mocks (for testing)
// =============================================================================
export { UserRepositoryMock } from './mock';

// =============================================================================
// Factory
// =============================================================================
export { UserServiceFactory } from './UserServiceFactory';
