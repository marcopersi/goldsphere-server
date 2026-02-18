export interface StandardPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

type PaginationSource = {
  page?: unknown;
  currentPage?: unknown;
  limit?: unknown;
  itemsPerPage?: unknown;
  total?: unknown;
  totalItems?: unknown;
  totalCount?: unknown;
  totalPages?: unknown;
  hasNext?: unknown;
  hasNextPage?: unknown;
  hasPrev?: unknown;
  hasPrevious?: unknown;
  hasPreviousPage?: unknown;
};

function toInteger(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

export function normalizePagination(input: PaginationSource | undefined): StandardPagination {
  const pageCandidate = toInteger(input?.page ?? input?.currentPage, 1);
  const page = Math.max(1, pageCandidate);

  const limitCandidate = toInteger(input?.limit ?? input?.itemsPerPage, 20);
  const limit = Math.max(1, limitCandidate);

  const totalCandidate = toInteger(input?.total ?? input?.totalItems ?? input?.totalCount, 0);
  const total = Math.max(0, totalCandidate);

  const explicitTotalPages = toInteger(input?.totalPages, -1);
  const totalPages = explicitTotalPages >= 0 ? explicitTotalPages : Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}
