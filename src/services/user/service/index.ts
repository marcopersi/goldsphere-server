/**
 * Service Module Barrel Export
 * 
 * Re-exports all service interfaces and implementations for the User domain.
 */

// Interface
export {
  IUserService,
  UserOperationResult,
  UserErrorCode,
  UserWithDetails,
  CreateUserInput,
  UpdateUserInput,
} from './IUserService';

// Implementation
export { UserServiceImpl } from './UserServiceImpl';
