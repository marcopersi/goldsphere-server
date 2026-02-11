/**
 * Custody Service Implementation
 * Business logic with Dependency Injection
 */

import { ICustodyService } from '../ICustodyService';
import { ICustodyRepository } from '../repository/ICustodyRepository';
import {
  CreateCustodyServiceDTO,
  UpdateCustodyServiceDTO,
  CustodyServiceResult,
  CustodyServicesListResult,
  ListCustodyServicesOptions,
  CustodianWithServices,
  mapEntityToDTO,
  mapEntitiesToDTOs,
} from '../types/CustodyTypes';
import { isValidUUID, validateCreateData } from '../validators/CustodyValidators';
import { createPagination, emptyPagination } from '../../common/PaginationHelper';
import { AuditTrailUser } from '../../../utils/auditTrail';

export class CustodyServiceImpl implements ICustodyService {
  constructor(private readonly repository: ICustodyRepository) {}

  async getCustodyServices(
    options: ListCustodyServicesOptions = {}
  ): Promise<CustodyServicesListResult> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;
      const { custodyServices, total } = await this.repository.findAll(options);

      return {
        success: true,
        data: {
          custodyServices: mapEntitiesToDTOs(custodyServices),
          pagination: createPagination(page, limit, total),
        },
        message: `Retrieved ${custodyServices.length} custody services`,
      };
    } catch (error) {
      return {
        success: false,
        data: { custodyServices: [], pagination: emptyPagination() },
        message: `Failed to fetch custody services: ${(error as Error).message}`,
      };
    }
  }

  async getCustodyServiceById(id: string): Promise<CustodyServiceResult> {
    try {
      if (!isValidUUID(id)) {
        return { success: false, error: 'Invalid custody service ID format' };
      }
      const service = await this.repository.findById(id);
      if (!service) {
        return { success: false, error: 'Custody service not found' };
      }
      return {
        success: true,
        data: mapEntityToDTO(service),
        message: 'Custody service retrieved successfully',
      };
    } catch (error) {
      return { success: false, error: `Failed to fetch custody service: ${(error as Error).message}` };
    }
  }

  async getDefaultCustodyService(): Promise<CustodyServiceResult> {
    try {
      const service = await this.repository.findDefault();
      if (!service) {
        return { success: false, error: 'Default custody service not found' };
      }
      return {
        success: true,
        data: mapEntityToDTO(service),
        message: 'Default custody service retrieved successfully',
      };
    } catch (error) {
      return { success: false, error: `Failed to fetch default custody service: ${(error as Error).message}` };
    }
  }

  async getCustodiansWithServices(
    search?: string
  ): Promise<CustodyServiceResult<CustodianWithServices[]>> {
    try {
      const custodians = await this.repository.getCustodiansWithServices(search);
      return {
        success: true,
        data: custodians,
        message: `Retrieved ${custodians.length} custodians with services`,
      };
    } catch (error) {
      return { success: false, error: `Failed to fetch custodians with services: ${(error as Error).message}` };
    }
  }

  async createCustodyService(
    data: CreateCustodyServiceDTO,
    authenticatedUser: AuditTrailUser
  ): Promise<CustodyServiceResult> {
    try {
      const validation = validateCreateData(data);
      if (!validation.valid) return { success: false, error: validation.error };

      const custodianExists = await this.repository.custodianExists(data.custodianId);
      if (!custodianExists) return { success: false, error: 'Custodian not found' };

      const currencyId = await this.repository.getCurrencyIdByCode(data.currency);
      if (!currencyId) return { success: false, error: `Currency '${data.currency}' not found` };

      const exists = await this.repository.serviceNameExists(data.custodianId, data.custodyServiceName);
      if (exists) return { success: false, error: 'Custody service with this name already exists for this custodian' };

      const service = await this.repository.create({ ...data, currencyId }, authenticatedUser);
      return { success: true, data: mapEntityToDTO(service), message: 'Custody service created successfully' };
    } catch (error) {
      return { success: false, error: `Failed to create custody service: ${(error as Error).message}` };
    }
  }

  async updateCustodyService(
    id: string,
    data: UpdateCustodyServiceDTO,
    authenticatedUser: AuditTrailUser
  ): Promise<CustodyServiceResult> {
    try {
      if (!isValidUUID(id)) return { success: false, error: 'Invalid custody service ID format' };

      const existing = await this.repository.findById(id);
      if (!existing) return { success: false, error: 'Custody service not found' };

      if (data.custodianId) {
        const custodianExists = await this.repository.custodianExists(data.custodianId);
        if (!custodianExists) return { success: false, error: 'Custodian not found' };
      }

      let currencyId: string | undefined;
      if (data.currency) {
        const resolved = await this.repository.getCurrencyIdByCode(data.currency);
        if (!resolved) return { success: false, error: `Currency '${data.currency}' not found` };
        currencyId = resolved;
      }

      if (data.custodyServiceName) {
        const custodianId = data.custodianId || existing.custodianid;
        const nameExists = await this.repository.serviceNameExists(custodianId, data.custodyServiceName, id);
        if (nameExists) return { success: false, error: 'Custody service with this name already exists for this custodian' };
      }

      const updated = await this.repository.update(id, { ...data, currencyId }, authenticatedUser);
      return { success: true, data: mapEntityToDTO(updated), message: 'Custody service updated successfully' };
    } catch (error) {
      return { success: false, error: `Failed to update custody service: ${(error as Error).message}` };
    }
  }

  async deleteCustodyService(id: string, authenticatedUser: AuditTrailUser): Promise<CustodyServiceResult<void>> {
    try {
      if (!isValidUUID(id)) return { success: false, error: 'Invalid custody service ID format' };

      const service = await this.repository.findById(id);
      if (!service) return { success: false, error: 'Custody service not found' };

      const validation = await this.repository.canDelete(id);
      if (!validation.canDelete) return { success: false, error: validation.reason || 'Cannot delete custody service' };

      await this.repository.delete(id, authenticatedUser);
      return { success: true, message: `Custody service '${service.custodyservicename}' deleted successfully` };
    } catch (error) {
      return { success: false, error: `Failed to delete custody service: ${(error as Error).message}` };
    }
  }

  async canDeleteCustodyService(id: string): Promise<CustodyServiceResult<{ canDelete: boolean; reason?: string }>> {
    try {
      if (!isValidUUID(id)) return { success: false, error: 'Invalid custody service ID format' };

      const service = await this.repository.findById(id);
      if (!service) return { success: false, error: 'Custody service not found' };

      const validation = await this.repository.canDelete(id);
      return { success: true, data: { canDelete: validation.canDelete, reason: validation.reason } };
    } catch (error) {
      return { success: false, error: `Failed to validate deletion: ${(error as Error).message}` };
    }
  }
}
