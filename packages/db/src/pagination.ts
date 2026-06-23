export type ListPaginationInput = {
  skip?: number;
  take?: number;
};

export type ListPagination = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
  total: number;
  totalPages: number;
};

const DEFAULT_TAKE = 20;
const MAX_TAKE = 200;

export function normalizePagination(input: ListPaginationInput = {}) {
  const take = Math.min(Math.max(input.take ?? DEFAULT_TAKE, 1), MAX_TAKE);
  const skip = Math.max(input.skip ?? 0, 0);

  return { skip, take };
}

export function buildPaginationMeta(
  input: {
    skip: number;
    take: number;
  },
  total: number,
): ListPagination {
  return {
    page: Math.floor(input.skip / input.take) + 1,
    pageSize: input.take,
    skip: input.skip,
    take: input.take,
    total,
    totalPages: Math.max(1, Math.ceil(total / input.take)),
  };
}
