/**
 * Custody Service Validators
 * 
 * Input validation logic for custody service operations
 * Extracted to keep CustodyServiceImpl under 300 lines
 */

import { CreateCustodyServiceDTO, UpdateCustodyServiceDTO } from '../types/CustodyTypes';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * UUID validation regex pattern
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Valid payment frequency values (matches database)
 */
const VALID_PAYMENT_FREQUENCIES = ['monthly', 'quarterly', 'annual', 'onetime'];

/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

/**
 * Validate data for creating a new custody service
 */
export function validateCreateData(data: CreateCustodyServiceDTO): ValidationResult {
  if (!data.custodyServiceName || data.custodyServiceName.trim().length === 0) {
    return { valid: false, error: 'Custody service name is required' };
  }

  if (!data.custodianId) {
    return { valid: false, error: 'Custodian ID is required' };
  }

  if (!isValidUUID(data.custodianId)) {
    return { valid: false, error: 'Invalid custodian ID format' };
  }

  if (data.fee === undefined || data.fee === null) {
    return { valid: false, error: 'Fee is required' };
  }

  if (data.fee <= 0) {
    return { valid: false, error: 'Fee must be a positive number' };
  }

  if (!VALID_PAYMENT_FREQUENCIES.includes(data.paymentFrequency)) {
    return { valid: false, error: 'Invalid payment frequency' };
  }

  if (!data.currency) {
    return { valid: false, error: 'Currency code is required' };
  }

  // Validate weight constraints
  if (data.minWeight !== undefined && data.minWeight !== null && data.maxWeight !== undefined && data.maxWeight !== null) {
    if (data.minWeight > data.maxWeight) {
      return { valid: false, error: 'Minimum weight cannot be greater than maximum weight' };
    }
  }

  return { valid: true };
}

/**
 * Validate data for updating a custody service
 */
export function validateUpdateData(data: UpdateCustodyServiceDTO): ValidationResult {
  if (data.custodianId !== undefined && !isValidUUID(data.custodianId)) {
    return { valid: false, error: 'Invalid custodian ID format' };
  }

  if (data.fee !== undefined && data.fee < 0) {
    return { valid: false, error: 'Fee cannot be negative' };
  }

  if (data.paymentFrequency && !VALID_PAYMENT_FREQUENCIES.includes(data.paymentFrequency)) {
    return { valid: false, error: 'Invalid payment frequency' };
  }

  return { valid: true };
}
