/**
 * IPortfolioService Interface
 * 
 * Defines the contract for portfolio-related business operations
 */

import {
  PortfolioSummary,
  PortfolioWithPositions,
  ListPortfoliosOptions,
  GetPortfoliosResult,
  CreatePortfolioRequest,
  UpdatePortfolioRequest,
  PortfolioResult
} from './types/PortfolioTypes';
import { AuditTrailUser } from '../../utils/auditTrail';

export interface IPortfolioService {
  // Query operations
  getAllPortfolios(options?: ListPortfoliosOptions): Promise<GetPortfoliosResult>;
  getUserPortfolios(userId: string, options?: ListPortfoliosOptions): Promise<GetPortfoliosResult>;
  getPortfolioById(portfolioId: string): Promise<PortfolioResult<PortfolioSummary>>;
  getPortfolioWithPositions(portfolioId: string): Promise<PortfolioResult<PortfolioWithPositions>>;
  
  // CRUD operations
  createPortfolio(request: CreatePortfolioRequest, authenticatedUser: AuditTrailUser): Promise<PortfolioResult<PortfolioSummary>>;
  updatePortfolio(portfolioId: string, request: UpdatePortfolioRequest, authenticatedUser: AuditTrailUser): Promise<PortfolioResult<PortfolioSummary>>;
  deletePortfolio(portfolioId: string, authenticatedUser: AuditTrailUser): Promise<PortfolioResult<void>>;
  
  // Validation
  validateOwnership(portfolioId: string, userId: string): Promise<boolean>;
  canDelete(portfolioId: string): Promise<PortfolioResult<{ canDelete: boolean; reason?: string }>>;
}

export default IPortfolioService;
