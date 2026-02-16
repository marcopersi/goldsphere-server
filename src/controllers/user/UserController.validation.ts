/**
 * User Controller Validation
 */

import { z } from 'zod';
import type { IUserService } from '../../services/user';
import type { PatchUserProfileRequest, UserErrorResponse } from './UserController.types';

export const PatchProfileSchema = z.object({
  title: z.string().max(32).nullable().optional(),
  firstName: z.string().min(2).max(100).optional(),
  lastName: z.string().min(2).max(100).optional(),
  birthDate: z.coerce.date().optional(),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format').max(20).nullable().optional(),
  gender: z.string().max(32).nullable().optional(),
  preferredCurrency: z.string().regex(/^[A-Z]{3}$/i, 'Currency must be an ISO 4217 alpha-3 code').nullable().optional(),
  preferredPaymentMethod: z.string().max(32).nullable().optional(),
  address: z
    .object({
      countryId: z
        .string()
        .regex(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
          'Invalid countryId format'
        )
        .nullable()
        .optional(),
      postalCode: z.string().min(3).max(20).nullable().optional(),
      city: z.string().min(2).max(100).nullable().optional(),
      state: z.string().min(2).max(100).nullable().optional(),
      street: z.string().min(2).max(200).nullable().optional(),
      houseNumber: z.string().max(50).nullable().optional(),
      addressLine2: z.string().max(200).nullable().optional(),
      poBox: z.string().max(100).nullable().optional(),
    })
    .optional(),
});

export function toValidationErrorResponse(
  issues: Array<{ path: Array<PropertyKey>; message: string }>
): UserErrorResponse {
  return {
    success: false,
    code: 'VALIDATION_ERROR',
    error: 'Validation failed',
    details: {
      fields: issues.map((issue) => ({
        path: issue.path.map(String).join('.'),
        message: issue.message,
      })),
    },
  };
}

function buildValidationError(path: string, message: string): UserErrorResponse {
  return {
    success: false,
    code: 'VALIDATION_ERROR',
    error: 'Validation failed',
    details: {
      fields: [{ path, message }],
    },
  };
}

export async function validatePatchProfileReferences(
  userService: IUserService,
  payload: PatchUserProfileRequest
): Promise<UserErrorResponse | null> {
  const validationResult = await userService.validateReferenceData({
    title: payload.title,
    gender: payload.gender,
    preferredCurrency: payload.preferredCurrency,
    preferredPaymentMethod: payload.preferredPaymentMethod,
    countryId: payload.address?.countryId,
  });

  if (validationResult.success) {
    return null;
  }

  if (validationResult.error === 'Unknown currency code') {
    return buildValidationError('preferredCurrency', validationResult.error);
  }

  if (validationResult.error === 'Unknown country ID') {
    return buildValidationError('address.countryId', validationResult.error);
  }

  if (validationResult.error?.startsWith('Unsupported gender value')) {
    return buildValidationError('gender', validationResult.error);
  }

  if (validationResult.error?.startsWith('Unsupported payment method')) {
    return buildValidationError('preferredPaymentMethod', validationResult.error);
  }

  if (validationResult.error?.startsWith('Unsupported title value')) {
    return buildValidationError('title', validationResult.error);
  }

  return buildValidationError('payload', validationResult.error || 'Reference validation failed');
}

export async function validateRoleAndTitleReferences(
  userService: IUserService,
  payload: { role?: string; title?: string | null }
): Promise<UserErrorResponse | null> {
  const validationResult = await userService.validateReferenceData({
    role: payload.role,
    title: payload.title,
  });

  if (validationResult.success) {
    return null;
  }

  if (validationResult.error?.startsWith('Unsupported role value')) {
    return buildValidationError('role', validationResult.error);
  }

  if (validationResult.error?.startsWith('Unsupported title value')) {
    return buildValidationError('title', validationResult.error);
  }

  return buildValidationError('payload', validationResult.error || 'Reference validation failed');
}
