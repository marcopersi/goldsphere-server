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

export interface IPortfolioRepository {
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
  create(userId: string, name: string, description?: string): Promise<PortfolioSummary>;

  /**
   * Update portfolio
   */
  update(portfolioId: string, updates: Partial<PortfolioSummary>): Promise<void>;

  /**
   * Delete portfolio
   */
  delete(portfolioId: string): Promise<void>;
}
