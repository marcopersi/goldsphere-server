/**
 * Portfolio Service Implementation
 * 
 * Handles portfolio business logic using clean architecture with DI
 * Delegates data access to repository
 */

import { IPortfolioService } from '../IPortfolioService';
import { IPortfolioRepository } from '../repository/IPortfolioRepository';
import {
  PortfolioSummary,
  PortfolioWithPositions,
  ListPortfoliosOptions,
  GetPortfoliosResult,
  CreatePortfolioRequest,
  UpdatePortfolioRequest,
  PortfolioResult,
  PortfolioErrorCode,
  validateCreateRequest,
  validateUpdateRequest
} from '../types/PortfolioTypes';
import { AuditTrailUser } from '../../../utils/auditTrail';

export class PortfolioServiceImpl implements IPortfolioService {
  constructor(private readonly portfolioRepository: IPortfolioRepository) {}

  async getAllPortfolios(options: ListPortfoliosOptions = {}): Promise<GetPortfoliosResult> {
    return await this.portfolioRepository.getAllPortfolios(options);
  }

  async getUserPortfolios(userId: string, options: ListPortfoliosOptions = {}): Promise<GetPortfoliosResult> {
    return await this.portfolioRepository.getUserPortfolios(userId, options);
  }

  async getPortfolioById(portfolioId: string): Promise<PortfolioResult<PortfolioSummary>> {
    try {
      const portfolio = await this.portfolioRepository.getById(portfolioId);
      if (!portfolio) {
        return {
          success: false,
          error: { code: PortfolioErrorCode.NOT_FOUND, message: 'Portfolio not found' }
        };
      }
      return { success: true, data: portfolio };
    } catch (error) {
      console.error('Error getting portfolio by ID:', error);
      return {
        success: false,
        error: { code: PortfolioErrorCode.INTERNAL_ERROR, message: 'Failed to get portfolio' }
      };
    }
  }

  async getPortfolioWithPositions(portfolioId: string): Promise<PortfolioResult<PortfolioWithPositions>> {
    try {
      const portfolio = await this.portfolioRepository.getWithPositions(portfolioId);
      if (!portfolio) {
        return {
          success: false,
          error: { code: PortfolioErrorCode.NOT_FOUND, message: 'Portfolio not found' }
        };
      }
      return { success: true, data: portfolio };
    } catch (error) {
      console.error('Error getting portfolio with positions:', error);
      return {
        success: false,
        error: { code: PortfolioErrorCode.INTERNAL_ERROR, message: 'Failed to get portfolio' }
      };
    }
  }

  async createPortfolio(
    request: CreatePortfolioRequest,
    authenticatedUser: AuditTrailUser
  ): Promise<PortfolioResult<PortfolioSummary>> {
    // Validate request
    const validation = validateCreateRequest(request);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    if (!validation.data) {
      return {
        success: false,
        error: { code: PortfolioErrorCode.VALIDATION_ERROR, message: 'Invalid portfolio payload' }
      };
    }

    try {
      const { portfolioName, ownerId, description } = validation.data;

      // Check if owner exists
      const ownerExists = await this.portfolioRepository.userExists(ownerId);
      if (!ownerExists) {
        return {
          success: false,
          error: { code: PortfolioErrorCode.OWNER_NOT_FOUND, message: 'Owner user does not exist' }
        };
      }

      // Check for duplicate name
      const nameExists = await this.portfolioRepository.nameExistsForUser(ownerId, portfolioName);
      if (nameExists) {
        return {
          success: false,
          error: { code: PortfolioErrorCode.DUPLICATE_NAME, message: 'A portfolio with this name already exists' }
        };
      }

      // Create portfolio
      const portfolio = await this.portfolioRepository.create(ownerId, portfolioName, description, authenticatedUser);
      return { success: true, data: portfolio };

    } catch (error) {
      console.error('Error creating portfolio:', error);
      return {
        success: false,
        error: { code: PortfolioErrorCode.INTERNAL_ERROR, message: 'Failed to create portfolio' }
      };
    }
  }

  async updatePortfolio(
    portfolioId: string,
    request: UpdatePortfolioRequest,
    authenticatedUser: AuditTrailUser
  ): Promise<PortfolioResult<PortfolioSummary>> {
    // Validate request
    const validation = validateUpdateRequest(request);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    if (!validation.data) {
      return {
        success: false,
        error: { code: PortfolioErrorCode.VALIDATION_ERROR, message: 'Invalid update payload' }
      };
    }

    try {
      // Check if portfolio exists
      const existing = await this.portfolioRepository.getById(portfolioId);
      if (!existing) {
        return {
          success: false,
          error: { code: PortfolioErrorCode.NOT_FOUND, message: 'Portfolio not found' }
        };
      }

      // Check for duplicate name if updating name
      if (validation.data.portfolioName) {
        const nameExists = await this.portfolioRepository.nameExistsForUser(
          existing.ownerId, 
          validation.data.portfolioName, 
          portfolioId
        );
        if (nameExists) {
          return {
            success: false,
            error: { code: PortfolioErrorCode.DUPLICATE_NAME, message: 'A portfolio with this name already exists' }
          };
        }
      }

      // Update portfolio
      const updated = await this.portfolioRepository.update(portfolioId, validation.data, authenticatedUser);
      if (!updated) {
        return {
          success: false,
          error: { code: PortfolioErrorCode.INTERNAL_ERROR, message: 'Failed to update portfolio' }
        };
      }
      return { success: true, data: updated };

    } catch (error) {
      console.error('Error updating portfolio:', error);
      return {
        success: false,
        error: { code: PortfolioErrorCode.INTERNAL_ERROR, message: 'Failed to update portfolio' }
      };
    }
  }

  async deletePortfolio(portfolioId: string, authenticatedUser: AuditTrailUser): Promise<PortfolioResult<void>> {
    try {
      // Check if portfolio exists
      const existing = await this.portfolioRepository.getById(portfolioId);
      if (!existing) {
        return {
          success: false,
          error: { code: PortfolioErrorCode.NOT_FOUND, message: 'Portfolio not found' }
        };
      }

      // Check if can delete
      const canDeleteResult = await this.canDelete(portfolioId);
      if (!canDeleteResult.success || !canDeleteResult.data?.canDelete) {
        return {
          success: false,
          error: { 
            code: PortfolioErrorCode.HAS_POSITIONS, 
            message: canDeleteResult.data?.reason || 'Cannot delete portfolio' 
          }
        };
      }

      await this.portfolioRepository.delete(portfolioId, authenticatedUser);
      return { success: true };

    } catch (error) {
      console.error('Error deleting portfolio:', error);
      return {
        success: false,
        error: { code: PortfolioErrorCode.INTERNAL_ERROR, message: 'Failed to delete portfolio' }
      };
    }
  }

  async validateOwnership(portfolioId: string, userId: string): Promise<boolean> {
    const portfolio = await this.portfolioRepository.getById(portfolioId);
    return portfolio?.ownerId === userId;
  }

  async canDelete(portfolioId: string): Promise<PortfolioResult<{ canDelete: boolean; reason?: string }>> {
    try {
      const positionCount = await this.portfolioRepository.getPositionCount(portfolioId);
      if (positionCount > 0) {
        return {
          success: true,
          data: {
            canDelete: false,
            reason: `Cannot delete portfolio with ${positionCount} positions. Please remove all positions first.`
          }
        };
      }
      return { success: true, data: { canDelete: true } };
    } catch (error) {
      console.error('Error checking if portfolio can be deleted:', error);
      return {
        success: false,
        error: { code: PortfolioErrorCode.INTERNAL_ERROR, message: 'Failed to check portfolio' }
      };
    }
  }
}

