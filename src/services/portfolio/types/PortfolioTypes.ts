/**
 * Portfolio Domain Types
 * 
 * All type definitions for the Portfolio domain
 * Centralized for consistency and reusability
 */

import { z } from 'zod';
import { CommonPaginationSchema, PositionSchema } from '@marcopersi/shared';

// ============================================================================
// Shared Schema Types
// ============================================================================

export type Position = z.infer<typeof PositionSchema>;
export type Pagination = z.infer<typeof CommonPaginationSchema>;

// ============================================================================
// Portfolio Summary
// ============================================================================

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

// ============================================================================
// Portfolio with Positions
// ============================================================================

export interface PortfolioWithPositions extends PortfolioSummary {
  positions: Position[];
}

// ============================================================================
// Query Options
// ============================================================================

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

// ============================================================================
// Result Types
// ============================================================================

export interface GetPortfoliosResult {
  portfolios: PortfolioSummary[];
  pagination: Pagination;
}
