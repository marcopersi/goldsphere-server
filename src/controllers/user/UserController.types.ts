/**
 * User Controller Types
 *
 * Request/response contracts for tsoa endpoints.
 */

export interface UserResponse {
  id: string;
  email: string;
  role: string;
  accountStatus?: string;
  blockedAt?: Date | null;
  blockedBy?: string | null;
  blockReason?: string | null;
  emailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserListResponse {
  success: true;
  data: UserResponse[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface UserDetailsResponse {
  success: true;
  data: {
    user: UserResponse;
    profile: UserProfileData | null;
    address: UserAddressData | null;
    verificationStatus: VerificationStatusData | null;
  };
}

export interface UserProfileData {
  title?: string | null;
  firstName?: string;
  lastName?: string;
  birthDate?: Date;
  phone?: string | null;
  gender?: string | null;
  preferredCurrency?: string | null;
  preferredPaymentMethod?: string | null;
}

export interface UserAddressData {
  countryId?: string | null;
  postalCode?: string | null;
  city?: string | null;
  state?: string | null;
  street?: string | null;
  houseNumber?: string | null;
  addressLine2?: string | null;
  poBox?: string | null;
}

export interface VerificationStatusData {
  emailStatus?: string;
  identityStatus?: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  role?: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: Date;
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  role?: string;
  emailVerified?: boolean;
  identityVerified?: boolean;
  title?: string | null;
  firstName?: string;
  lastName?: string;
  birthDate?: Date;
}

export interface PatchUserProfileRequest {
  title?: string | null;
  firstName?: string;
  lastName?: string;
  birthDate?: Date;
  phone?: string | null;
  gender?: string | null;
  preferredCurrency?: string | null;
  preferredPaymentMethod?: string | null;
  address?: {
    countryId?: string | null;
    postalCode?: string | null;
    city?: string | null;
    state?: string | null;
    street?: string | null;
    houseNumber?: string | null;
    addressLine2?: string | null;
    poBox?: string | null;
  };
}

export interface UserProfilePatchResponse {
  success: true;
  data: {
    userId: string;
    profile: UserProfileData | null;
    address: UserAddressData | null;
    verificationStatus: VerificationStatusData | null;
  };
}

export interface BlockUserRequest {
  reason: string;
}

export interface BlockedUserResponse {
  id: string;
  email: string;
  accountStatus: string;
  blockedAt?: Date | null;
  blockedBy?: string | null;
  blockReason?: string | null;
}

export interface SuccessResponseWrapper<T> {
  success: true;
  data: T;
  message?: string;
}

export interface UserErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: {
    fields?: Array<{ path: string; message: string }>;
  };
}
