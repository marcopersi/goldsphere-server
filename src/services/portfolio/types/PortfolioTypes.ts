/**
 * Portfolio Domain Types
 * 
 * All type definitions for the Portfolio domain
 * Centralized for consistency and reusability
 */

import { z } from 'zod';
import { CommonPaginationSchema, PositionSchema, UuidSchema } from '@marcopersi/shared';

// ============================================================================
// Shared Schema Types
// ============================================================================

export type Position = z.infer<typeof PositionSchema>;
export type Pagination = z.infer<typeof CommonPaginationSchema>;

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const CreatePortfolioRequestSchema = z.object({
  portfolioName: z.string().min(1, 'Portfolio name is required').max(200, 'Portfolio name too long'),
  ownerId: UuidSchema,
  description: z.string().max(1000, 'Description too long').optional()
});

export const UpdatePortfolioRequestSchema = z.object({
  portfolioName: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().optional()
});

// ============================================================================
// Request/Response Types
// ============================================================================

export type CreatePortfolioRequest = z.infer<typeof CreatePortfolioRequestSchema>;
export type UpdatePortfolioRequest = z.infer<typeof UpdatePortfolioRequestSchema>;

// ============================================================================
// Result Type (like AuthResult pattern)
// ============================================================================

export const PortfolioErrorCode = {
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_NAME: 'DUPLICATE_NAME',
  OWNER_NOT_FOUND: 'OWNER_NOT_FOUND',
  HAS_POSITIONS: 'HAS_POSITIONS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type PortfolioErrorCode = typeof PortfolioErrorCode[keyof typeof PortfolioErrorCode];

export interface PortfolioError {
  code: PortfolioErrorCode;
  message: string;
}

export interface PortfolioResult<T> {
  success: boolean;
  data?: T;
  error?: PortfolioError;
}

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
  ownerId?: string;  // Optional: filter by owner
  isActive?: boolean;
  minValue?: number;
  maxValue?: number;
  minPositionCount?: number;
  maxPositionCount?: number;
  minGainLoss?: number;
  maxGainLoss?: number;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  metal?: 'gold' | 'silver' | 'platinum' | 'palladium';
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

// ============================================================================
// Validation Helpers
// ============================================================================

export function validateCreateRequest(data: unknown): PortfolioResult<CreatePortfolioRequest> {
  const result = CreatePortfolioRequestSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: {
      code: PortfolioErrorCode.VALIDATION_ERROR,
      message: result.error.issues.map(i => i.message).join(', '),
    },
  };
}

export function validateUpdateRequest(data: unknown): PortfolioResult<UpdatePortfolioRequest> {
  const result = UpdatePortfolioRequestSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: {
      code: PortfolioErrorCode.VALIDATION_ERROR,
      message: result.error.issues.map(i => i.message).join(', '),
    },
  };
}

