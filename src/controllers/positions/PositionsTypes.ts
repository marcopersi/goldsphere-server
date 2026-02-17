import { PositionSchema } from "@marcopersi/shared";
import type { z } from "zod";

export interface PositionsErrorResponse {
  success: false;
  error: string;
  details?: string;
}

export interface PositionsPaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PositionsProductInfo {
  id: string;
  name: string;
  type: string;
  productTypeId: string;
  metal: { id: string; name: string; symbol: string };
  metalId: string;
  weight: number;
  weightUnit: string;
  purity: number;
  price: number;
  currency: string;
  producer: string;
  producerId: string;
  country: string | null;
  countryId?: string;
  year?: number;
  description: string;
  imageUrl: string;
  inStock: boolean;
  stockQuantity: number;
  minimumOrderQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PositionsCustodyInfo {
  custodyServiceId: string;
  custodyServiceName: string;
  custodianId: string;
  custodianName: string;
  fee: number;
  paymentFrequency: string;
}

export interface PositionDetail {
  id: string;
  userId: string;
  productId: string;
  portfolioId: string;
  product: PositionsProductInfo;
  purchaseDate: Date;
  purchasePrice: number;
  marketPrice: number;
  quantity: number;
  custodyServiceId: string | null;
  custody: PositionsCustodyInfo | null;
  status: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PositionsListResponse {
  positions: PositionDetail[];
  pagination: PositionsPaginationInfo;
  filters?: {
    status: string;
  };
}

export type PositionResponse = z.infer<typeof PositionSchema>;
