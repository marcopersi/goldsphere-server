/**
 * Custody Service Types
 * All types, interfaces, DTOs and enums for the Custody Service domain
 */

// ============================================================================
// Entity Types (Database Models)
// ============================================================================

export interface CustodyServiceEntity {
  id: string;
  custodyservicename: string;
  custodianid: string;
  custodianname?: string; // From JOIN
  fee: string; // numeric in DB
  paymentfrequency: 'monthly' | 'quarterly' | 'annual' | 'onetime';
  currencyid: string;
  currency?: string; // ISO code from JOIN
  minweight: string | null; // numeric in DB
  maxweight: string | null; // numeric in DB
  createdat: Date;
  updatedat: Date;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

export interface CustodyServiceDTO {
  id: string;
  custodyServiceName: string;
  custodianId: string;
  custodianName: string;
  fee: number;
  paymentFrequency: 'monthly' | 'quarterly' | 'annual' | 'onetime';
  currencyId: string;
  currency: string;
  minWeight: number | null;
  maxWeight: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustodyServiceDTO {
  custodyServiceName: string;
  custodianId: string;
  fee: number;
  paymentFrequency: 'monthly' | 'quarterly' | 'annual' | 'onetime';
  currency: string; // ISO code (e.g., 'USD'), will be converted to currencyId
  minWeight?: number | null;
  maxWeight?: number | null;
}

export interface UpdateCustodyServiceDTO {
  custodyServiceName?: string;
  custodianId?: string;
  fee?: number;
  paymentFrequency?: 'monthly' | 'quarterly' | 'annual' | 'onetime';
  currency?: string; // ISO code (optional), will be converted to currencyId
  minWeight?: number | null;
  maxWeight?: number | null;
}

// ============================================================================
// Query Options
// ============================================================================

export interface ListCustodyServicesOptions {
  page?: number;
  limit?: number;
  search?: string;
  custodianId?: string;
  minFee?: number;
  maxFee?: number;
  paymentFrequency?: 'monthly' | 'quarterly' | 'annual' | 'onetime';
  currency?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Result Types
// ============================================================================

export interface CustodyServiceResult<T = CustodyServiceDTO> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CustodyServicesListResult {
  success: boolean;
  data: {
    custodyServices: CustodyServiceDTO[];
    pagination: {
      currentPage: number;
      itemsPerPage: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
  message?: string;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface DeleteCustodyServiceValidation {
  canDelete: boolean;
  reason?: string;
  activePositionCount?: number;
}

export interface CustodianWithServices {
  custodianId: string;
  custodianName: string;
  services: CustodyServiceDTO[];
}

// ============================================================================
// Mapper Functions
// ============================================================================

export const mapEntityToDTO = (
  entity: CustodyServiceEntity
): CustodyServiceDTO => ({
  id: entity.id,
  custodyServiceName: entity.custodyservicename,
  custodianId: entity.custodianid,
  custodianName: entity.custodianname || '',
  fee: parseFloat(entity.fee),
  paymentFrequency: entity.paymentfrequency,
  currencyId: entity.currencyid,
  currency: entity.currency || '',
  minWeight: entity.minweight ? parseFloat(entity.minweight) : null,
  maxWeight: entity.maxweight ? parseFloat(entity.maxweight) : null,
  createdAt: entity.createdat,
  updatedAt: entity.updatedat,
});

export const mapEntitiesToDTOs = (
  entities: CustodyServiceEntity[]
): CustodyServiceDTO[] => entities.map(mapEntityToDTO);
