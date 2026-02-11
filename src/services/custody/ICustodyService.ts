/**
 * Custody Service Interface
 * Business logic for custody service management
 */

import {
  CustodyServiceDTO,
  CreateCustodyServiceDTO,
  UpdateCustodyServiceDTO,
  CustodyServiceResult,
  CustodyServicesListResult,
  ListCustodyServicesOptions,
  CustodianWithServices,
} from './types/CustodyTypes';
import { AuditTrailUser } from '../../utils/auditTrail';

export interface ICustodyService {
  /**
   * Get all custody services with optional filtering and pagination
   */
  getCustodyServices(
    options?: ListCustodyServicesOptions
  ): Promise<CustodyServicesListResult>;

  /**
   * Get a custody service by ID
   */
  getCustodyServiceById(id: string): Promise<CustodyServiceResult>;

  /**
   * Get the default custody service (Home Delivery)
   */
  getDefaultCustodyService(): Promise<CustodyServiceResult>;

  /**
   * Get all custodians with their custody services
   */
  getCustodiansWithServices(
    search?: string
  ): Promise<CustodyServiceResult<CustodianWithServices[]>>;

  /**
   * Create a new custody service
   */
  createCustodyService(
    data: CreateCustodyServiceDTO,
    authenticatedUser: AuditTrailUser
  ): Promise<CustodyServiceResult>;

  /**
   * Update a custody service
   */
  updateCustodyService(
    id: string,
    data: UpdateCustodyServiceDTO,
    authenticatedUser: AuditTrailUser
  ): Promise<CustodyServiceResult>;

  /**
   * Delete a custody service
   */
  deleteCustodyService(id: string, authenticatedUser: AuditTrailUser): Promise<CustodyServiceResult<void>>;

  /**
   * Validate if custody service can be deleted
   */
  canDeleteCustodyService(
    id: string
  ): Promise<CustodyServiceResult<{ canDelete: boolean; reason?: string }>>;
}
