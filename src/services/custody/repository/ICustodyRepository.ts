/**
 * Custody Service Repository Interface
 * Defines all data access methods for custody service entities
 */

import {
  CustodyServiceEntity,
  ListCustodyServicesOptions,
  DeleteCustodyServiceValidation,
  CustodianWithServices,
} from '../types/CustodyTypes';
import { AuditTrailUser } from '../../../utils/auditTrail';

export interface ICustodyRepository {
  /**
   * Find all custody services with optional filtering and pagination
   */
  findAll(options?: ListCustodyServicesOptions): Promise<{
    custodyServices: CustodyServiceEntity[];
    total: number;
  }>;

  /**
   * Find a custody service by ID
   */
  findById(id: string): Promise<CustodyServiceEntity | null>;

  /**
   * Find custody services by custodian ID
   */
  findByCustodianId(custodianId: string): Promise<CustodyServiceEntity[]>;

  /**
   * Find the default custody service (Home Delivery)
   */
  findDefault(): Promise<CustodyServiceEntity | null>;

  /**
   * Get all custodians with their services
   */
  getCustodiansWithServices(search?: string): Promise<CustodianWithServices[]>;

  /**
   * Create a new custody service
   */
  create(data: {
    custodyServiceName: string;
    custodianId: string;
    fee: number;
    paymentFrequency: 'monthly' | 'quarterly' | 'annual' | 'onetime';
    currencyId: string;
    minWeight?: number | null;
    maxWeight?: number | null;
  }, authenticatedUser: AuditTrailUser): Promise<CustodyServiceEntity>;

  /**
   * Update a custody service
   */
  update(
    id: string,
    data: {
      custodyServiceName?: string;
      custodianId?: string;
      fee?: number;
      paymentFrequency?: 'monthly' | 'quarterly' | 'annual' | 'onetime';
      currencyId?: string;
      minWeight?: number | null;
      maxWeight?: number | null;
    },
    authenticatedUser: AuditTrailUser
  ): Promise<CustodyServiceEntity>;

  /**
   * Delete a custody service
   */
  delete(id: string, authenticatedUser: AuditTrailUser): Promise<void>;

  /**
   * Check if custody service can be deleted (no active positions)
   */
  canDelete(id: string): Promise<DeleteCustodyServiceValidation>;

  /**
   * Check if service name exists for a custodian (excluding specific ID)
   */
  serviceNameExists(
    custodianId: string,
    serviceName: string,
    excludeId?: string
  ): Promise<boolean>;

  /**
   * Validate if custodian exists
   */
  custodianExists(custodianId: string): Promise<boolean>;

  /**
   * Validate if currency exists
   */
  currencyExists(currencyId: string): Promise<boolean>;
  
  /**
   * Get currency ID by ISO code
   */
  getCurrencyIdByCode(isoCode: string): Promise<string | null>;
}
