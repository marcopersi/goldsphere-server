/**
 * Pagination Helper
 * 
 * Common pagination logic extracted to reduce duplication
 */

export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Create pagination object from page, limit and total
 */
export function createPagination(page: number, limit: number, total: number): Pagination {
  const totalPages = Math.ceil(total / limit);
  return {
    currentPage: page,
    itemsPerPage: limit,
    totalItems: total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Create empty pagination for error cases
 */
export function emptyPagination(): Pagination {
  return {
    currentPage: 1,
    itemsPerPage: 20,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  };
}
