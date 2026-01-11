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
  GetPortfoliosResult
} from '../types/PortfolioTypes';

export class PortfolioServiceImpl implements IPortfolioService {
  constructor(private readonly portfolioRepository: IPortfolioRepository) {}

  async getUserPortfolios(userId: string, options: ListPortfoliosOptions = {}): Promise<GetPortfoliosResult> {
    return await this.portfolioRepository.getUserPortfolios(userId, options);
  }

  async getPortfolioById(portfolioId: string): Promise<PortfolioSummary | null> {
    return await this.portfolioRepository.getById(portfolioId);
  }

  async getPortfolioWithPositions(portfolioId: string): Promise<PortfolioWithPositions | null> {
    return await this.portfolioRepository.getWithPositions(portfolioId);
  }
}
