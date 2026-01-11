/**
 * IPortfolioService Interface
 * 
 * Defines the contract for portfolio-related business operations
 */

import {
  PortfolioSummary,
  PortfolioWithPositions,
  ListPortfoliosOptions,
  GetPortfoliosResult
} from './types/PortfolioTypes';

export interface IPortfolioService {
  getUserPortfolios(userId: string, options?: ListPortfoliosOptions): Promise<GetPortfoliosResult>;
  getPortfolioById(portfolioId: string): Promise<PortfolioSummary | null>;
  getPortfolioWithPositions(portfolioId: string): Promise<PortfolioWithPositions | null>;
}

export default IPortfolioService;
