import { z } from 'zod';
import { CommonPaginationSchema, PositionSchema } from '@marcopersi/shared';

// Local types inferred from shared schemas
export type Position = z.infer<typeof PositionSchema>;
export type Pagination = z.infer<typeof CommonPaginationSchema>;

export interface PortfolioSummary {
  id: string;
  portfolioName: string;
  ownerId: string;
  description?: string | null;
  isActive: boolean;
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercentage: number;
  positionCount: number;
  lastUpdated: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface PortfolioWithPositions extends PortfolioSummary {
  positions: Position[];
}

export interface ListPortfoliosOptions {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  minValue?: number;
  maxValue?: number;
  minPositionCount?: number;
  maxPositionCount?: number;
  sortBy?: 'portfolioName' | 'totalValue' | 'totalGainLoss' | 'positionCount' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface IPortfolioService {
  getUserPortfolios(userId: string, opts?: ListPortfoliosOptions): Promise<{ portfolios: PortfolioSummary[]; pagination: Pagination }>;
  getPortfolioById(portfolioId: string): Promise<PortfolioSummary | null>;
  getPortfolioWithPositions(portfolioId: string): Promise<PortfolioWithPositions | null>;
}

export default IPortfolioService;
