/**
 * Custodian Service Implementation
 * Business logic with Dependency Injection
 */

import { ICustodianService } from '../ICustodianService';
import { ICustodianRepository } from '../repository/ICustodianRepository';
import {
  CustodianDTO,
  CreateCustodianDTO,
  UpdateCustodianDTO,
  CustodianResult,
  CustodiansListResult,
  ListCustodiansOptions,
  mapEntityToDTO,
  mapEntitiesToDTOs,
} from '../types/CustodianTypes';
import { AuditTrailUser } from '../../../utils/auditTrail';

export class CustodianServiceImpl implements ICustodianService {
  constructor(private readonly repository: ICustodianRepository) {}

  async getCustodians(
    options: ListCustodiansOptions = {}
  ): Promise<CustodiansListResult> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;

      const { custodians, total } = await this.repository.findAll(options);
      const custodianDTOs = mapEntitiesToDTOs(custodians);

      return {
        success: true,
        data: {
          custodians: custodianDTOs,
          pagination: {
            currentPage: page,
            itemsPerPage: limit,
            totalItems: total,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page < Math.ceil(total / limit),
            hasPreviousPage: page > 1,
          },
        },
        message: `Retrieved ${custodianDTOs.length} custodians`,
      };
    } catch (error) {
      return {
        success: false,
        data: {
          custodians: [],
          pagination: {
            currentPage: 1,
            itemsPerPage: 20,
            totalItems: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
        message: `Failed to fetch custodians: ${(error as Error).message}`,
      };
    }
  }

  async getCustodianById(id: string): Promise<CustodianResult> {
    try {
      // Validate UUID format
      if (!this.isValidUUID(id)) {
        return {
          success: false,
          error: 'Invalid custodian ID format',
        };
      }

      const custodian = await this.repository.findById(id);

      if (!custodian) {
        return {
          success: false,
          error: 'Custodian not found',
        };
      }

      return {
        success: true,
        data: mapEntityToDTO(custodian),
        message: 'Custodian retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch custodian: ${(error as Error).message}`,
      };
    }
  }

  async createCustodian(
    data: CreateCustodianDTO,
    authenticatedUser?: AuditTrailUser
  ): Promise<CustodianResult> {
    try {
      // Validate input
      if (!data.name || data.name.trim().length === 0) {
        return {
          success: false,
          error: 'Custodian name is required and must be non-empty',
        };
      }

      // Check for duplicate name
      const exists = await this.repository.nameExists(data.name.trim());
      if (exists) {
        return {
          success: false,
          error: 'Custodian with this name already exists',
        };
      }

      // Create custodian
      const custodian = await this.repository.create(data.name.trim(), authenticatedUser);

      return {
        success: true,
        data: mapEntityToDTO(custodian),
        message: 'Custodian created successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create custodian: ${(error as Error).message}`,
      };
    }
  }

  async updateCustodian(
    id: string,
    data: UpdateCustodianDTO,
    authenticatedUser?: AuditTrailUser
  ): Promise<CustodianResult> {
    try {
      // Validate UUID format
      if (!this.isValidUUID(id)) {
        return {
          success: false,
          error: 'Invalid custodian ID format',
        };
      }

      // Validate input
      if (!data.name || data.name.trim().length === 0) {
        return {
          success: false,
          error: 'Custodian name is required and must be non-empty',
        };
      }

      // Check if custodian exists
      const existing = await this.repository.findById(id);
      if (!existing) {
        return {
          success: false,
          error: 'Custodian not found',
        };
      }

      // Check for duplicate name (excluding current custodian)
      const nameExists = await this.repository.nameExists(data.name.trim(), id);
      if (nameExists) {
        return {
          success: false,
          error: 'Custodian with this name already exists',
        };
      }

      // Update custodian
      const updated = await this.repository.update(id, data.name.trim(), authenticatedUser);

      return {
        success: true,
        data: mapEntityToDTO(updated),
        message: 'Custodian updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update custodian: ${(error as Error).message}`,
      };
    }
  }

  async deleteCustodian(id: string, authenticatedUser?: AuditTrailUser): Promise<CustodianResult<void>> {
    try {
      // Validate UUID format
      if (!this.isValidUUID(id)) {
        return {
          success: false,
          error: 'Invalid custodian ID format',
        };
      }

      // Check if custodian exists
      const custodian = await this.repository.findById(id);
      if (!custodian) {
        return {
          success: false,
          error: 'Custodian not found',
        };
      }

      // Check if can be deleted
      const validation = await this.repository.canDelete(id);
      if (!validation.canDelete) {
        return {
          success: false,
          error: validation.reason || 'Cannot delete custodian',
        };
      }

      // Delete custodian
      await this.repository.delete(id, authenticatedUser);

      return {
        success: true,
        message: `Custodian '${custodian.custodianname}' deleted successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete custodian: ${(error as Error).message}`,
      };
    }
  }

  async canDeleteCustodian(
    id: string
  ): Promise<CustodianResult<{ canDelete: boolean; reason?: string }>> {
    try {
      if (!this.isValidUUID(id)) {
        return {
          success: false,
          error: 'Invalid custodian ID format',
        };
      }

      const custodian = await this.repository.findById(id);
      if (!custodian) {
        return {
          success: false,
          error: 'Custodian not found',
        };
      }

      const validation = await this.repository.canDelete(id);

      return {
        success: true,
        data: {
          canDelete: validation.canDelete,
          reason: validation.reason,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to validate deletion: ${(error as Error).message}`,
      };
    }
  }

  // Helper methods
  private isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
