/**
 * Portfolio Repository Interface
 * 
 * Defines data access layer contract for portfolio operations
 * Separates data access from business logic
 */

import { 
  PortfolioSummary, 
  PortfolioWithPositions, 
  ListPortfoliosOptions, 
  GetPortfoliosResult 
} from '../types/PortfolioTypes';
import { AuditTrailUser } from '../../../utils/auditTrail';

export interface IPortfolioRepository {
  /**
   * Get all portfolios with filtering and pagination (admin/global view)
   */
  getAllPortfolios(options: ListPortfoliosOptions): Promise<GetPortfoliosResult>;

  /**
   * Get user portfolios with filtering and pagination
   */
  getUserPortfolios(userId: string, options: ListPortfoliosOptions): Promise<GetPortfoliosResult>;

  /**
   * Get portfolio by ID (summary only)
   */
  getById(portfolioId: string): Promise<PortfolioSummary | null>;

  /**
   * Get portfolio with all positions
   */
  getWithPositions(portfolioId: string): Promise<PortfolioWithPositions | null>;

  /**
   * Create a new portfolio
   */
  create(userId: string, name: string, description: string | undefined, authenticatedUser: AuditTrailUser): Promise<PortfolioSummary>;

  /**
   * Update portfolio
   */
  update(portfolioId: string, updates: Partial<PortfolioSummary>, authenticatedUser: AuditTrailUser): Promise<PortfolioSummary | null>;

  /**
   * Delete portfolio
   */
  delete(portfolioId: string, authenticatedUser: AuditTrailUser): Promise<void>;

  /**
   * Check if user exists
   */
  userExists(userId: string): Promise<boolean>;

  /**
   * Check if portfolio name exists for user
   */
  nameExistsForUser(userId: string, name: string, excludePortfolioId?: string): Promise<boolean>;

  /**
   * Get position count for portfolio
   */
  getPositionCount(portfolioId: string): Promise<number>;
}

