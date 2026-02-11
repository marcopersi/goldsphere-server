/**
 * Custodian Repository Interface
 * Defines all data access methods for custodian entities
 */

import {
  CustodianEntity,
  ListCustodiansOptions,
  DeleteCustodianValidation,
} from '../types/CustodianTypes';
import { AuditTrailUser } from '../../../utils/auditTrail';

export interface ICustodianRepository {
  /**
   * Find all custodians with optional filtering and pagination
   */
  findAll(options?: ListCustodiansOptions): Promise<{
    custodians: CustodianEntity[];
    total: number;
  }>;

  /**
   * Find a custodian by ID
   */
  findById(id: string): Promise<CustodianEntity | null>;

  /**
   * Find a custodian by name (case-insensitive)
   */
  findByName(name: string): Promise<CustodianEntity | null>;

  /**
   * Create a new custodian
   */
  create(name: string, authenticatedUser: AuditTrailUser): Promise<CustodianEntity>;

  /**
   * Update a custodian
   */
  update(id: string, name: string, authenticatedUser: AuditTrailUser): Promise<CustodianEntity>;

  /**
   * Delete a custodian
   */
  delete(id: string, authenticatedUser: AuditTrailUser): Promise<void>;

  /**
   * Check if custodian can be deleted (no custody services)
   */
  canDelete(id: string): Promise<DeleteCustodianValidation>;

  /**
   * Check if custodian name exists (excluding specific ID)
   */
  nameExists(name: string, excludeId?: string): Promise<boolean>;
}
