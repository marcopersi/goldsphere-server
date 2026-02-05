/**
 * Custodian Service Types
 * All types, interfaces, DTOs and enums for the Custodian domain
 */

// ============================================================================
// Entity Types (Database Models)
// ============================================================================

export interface CustodianEntity {
  id: string;
  custodianname: string;
  createdat: Date;
  updatedat: Date;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

export interface CustodianDTO {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustodianDTO {
  name: string;
}

export interface UpdateCustodianDTO {
  name?: string;
}

// ============================================================================
// Query Options
// ============================================================================

export interface ListCustodiansOptions {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: 'custodianName' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Result Types
// ============================================================================

export interface CustodianResult<T = CustodianDTO> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CustodiansListResult {
  success: boolean;
  data: {
    custodians: CustodianDTO[];
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

export interface DeleteCustodianValidation {
  canDelete: boolean;
  reason?: string;
  custodyServiceCount?: number;
}

// ============================================================================
// Mapper Functions
// ============================================================================

export const mapEntityToDTO = (entity: CustodianEntity): CustodianDTO => ({
  id: entity.id,
  name: entity.custodianname,
  createdAt: entity.createdat,
  updatedAt: entity.updatedat,
});

export const mapEntitiesToDTOs = (entities: CustodianEntity[]): CustodianDTO[] =>
  entities.map(mapEntityToDTO);
