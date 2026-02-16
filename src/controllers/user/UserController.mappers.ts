/**
 * User Controller Response Mappers
 */

import type { UserEntity, UserWithDetails } from '../../services/user';
import type {
  UserDetailsResponse,
  UserProfilePatchResponse,
  UserResponse,
  BlockedUserResponse,
} from './UserController.types';

export function mapUserResponse(user: UserEntity): UserResponse {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function mapBlockedUserResponse(user: UserEntity): BlockedUserResponse {
  return {
    id: user.id,
    email: user.email,
    accountStatus: user.accountStatus || 'blocked',
    blockedAt: user.blockedAt,
    blockedBy: user.blockedBy,
    blockReason: user.blockReason,
  };
}

export function mapUserDetailsData(data: UserWithDetails): UserDetailsResponse['data'] {
  const { user, profile, address, verificationStatus } = data;

  return {
    user: mapUserResponse(user),
    profile: profile
      ? {
          title: profile.title,
          firstName: profile.firstName,
          lastName: profile.lastName,
          birthDate: profile.birthDate,
          phone: profile.phone,
          gender: profile.gender,
          preferredCurrency: profile.preferredCurrency,
          preferredPaymentMethod: profile.preferredPaymentMethod,
        }
      : null,
    address: address
      ? {
          countryId: address.countryId,
          postalCode: address.postalCode,
          city: address.city,
          state: address.state,
          street: address.street,
          houseNumber: address.houseNumber,
          addressLine2: address.addressLine2,
          poBox: address.poBox,
        }
      : null,
    verificationStatus: verificationStatus
      ? {
          emailStatus: verificationStatus.emailVerificationStatus,
          identityStatus: verificationStatus.identityVerificationStatus,
        }
      : null,
  };
}

export function mapUserProfilePatchData(data: UserWithDetails): UserProfilePatchResponse['data'] {
  return {
    userId: data.user.id,
    profile: data.profile
      ? {
          title: data.profile.title,
          firstName: data.profile.firstName,
          lastName: data.profile.lastName,
          birthDate: data.profile.birthDate,
          phone: data.profile.phone,
          gender: data.profile.gender,
          preferredCurrency: data.profile.preferredCurrency,
          preferredPaymentMethod: data.profile.preferredPaymentMethod,
        }
      : null,
    address: data.address
      ? {
          countryId: data.address.countryId,
          postalCode: data.address.postalCode,
          city: data.address.city,
          state: data.address.state,
          street: data.address.street,
          houseNumber: data.address.houseNumber,
          addressLine2: data.address.addressLine2,
          poBox: data.address.poBox,
        }
      : null,
    verificationStatus: data.verificationStatus
      ? {
          emailStatus: data.verificationStatus.emailVerificationStatus,
          identityStatus: data.verificationStatus.identityVerificationStatus,
        }
      : null,
  };
}
