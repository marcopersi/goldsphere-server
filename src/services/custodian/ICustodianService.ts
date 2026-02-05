/**
 * Custodian Service Interface
 * Business logic for custodian management
 */

import {
  CustodianDTO,
  CreateCustodianDTO,
  UpdateCustodianDTO,
  CustodianResult,
  CustodiansListResult,
  ListCustodiansOptions,
} from './types/CustodianTypes';
import { AuditTrailUser } from '../../utils/auditTrail';

export interface ICustodianService {
  /**
   * Get all custodians with optional filtering and pagination
   */
  getCustodians(options?: ListCustodiansOptions): Promise<CustodiansListResult>;

  /**
   * Get a custodian by ID
   */
  getCustodianById(id: string): Promise<CustodianResult>;

  /**
   * Create a new custodian
   */
  createCustodian(data: CreateCustodianDTO, authenticatedUser?: AuditTrailUser): Promise<CustodianResult>;

  /**
   * Update a custodian
   */
  updateCustodian(
    id: string,
    data: UpdateCustodianDTO,
    authenticatedUser?: AuditTrailUser
  ): Promise<CustodianResult>;

  /**
   * Delete a custodian
   */
  deleteCustodian(id: string, authenticatedUser?: AuditTrailUser): Promise<CustodianResult<void>>;

  /**
   * Validate if custodian can be deleted
   */
  canDeleteCustodian(id: string): Promise<CustodianResult<{ canDelete: boolean; reason?: string }>>;
}
