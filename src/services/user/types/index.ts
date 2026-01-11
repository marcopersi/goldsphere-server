/**
 * User Types - Barrel Export
 * 
 * Central export point for all User domain types
 */

// Enums
export {
  UserRole,
  UserTitle,
  EmailVerificationStatus,
  IdentityVerificationStatus,
  DEFAULT_USER_ROLE,
  DEFAULT_EMAIL_VERIFICATION_STATUS,
  DEFAULT_IDENTITY_VERIFICATION_STATUS,
  isValidUserRole,
  isValidUserTitle,
  isValidEmailVerificationStatus,
  isValidIdentityVerificationStatus,
} from './UserEnums';

// Entity Types
export type {
  UserEntity,
  UserProfileEntity,
  UserAddressEntity,
  UserVerificationStatusEntity,
  DocumentProcessingLogEntity,
  ConsentLogEntity,
  UserWithProfile,
  UserWithDetails,
} from './UserEntityTypes';

// Database Row Types
export type {
  UserDbRow,
  UserProfileDbRow,
  UserAddressDbRow,
  UserVerificationStatusDbRow,
  DocumentProcessingLogDbRow,
  ConsentLogDbRow,
} from './UserEntityTypes';

// DTOs
export type {
  CreateUserData,
  UpdateUserData,
  CreateUserProfileData,
  UpdateUserProfileData,
  CreateUserAddressData,
  UpdateUserAddressData,
  CreateDocumentLogData,
  CreateConsentLogData,
  CreateVerificationStatusData,
  UpdateVerificationStatusData,
} from './UserDTOs';

// Query Options and Results
export type {
  ListUsersOptions,
  Pagination,
  GetUsersResult,
  ClientInfo,
  UserResponse,
  UserWithProfileResponse,
  UserDetailsResponse,
} from './UserDTOs';

// Mappers
export {
  mapUserEntity,
  mapUserToResponse,
  mapUserProfileEntity,
  mapUserAddressEntity,
  mapUserVerificationStatusEntity,
  mapDocumentProcessingLogEntity,
  mapConsentLogEntity,
} from './UserMappers';
