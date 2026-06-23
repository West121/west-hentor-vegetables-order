export const ADMIN_DEFAULT_PAGE_SIZE = 10;
export const ADMIN_MAX_PAGE_SIZE = 200;

function positiveInteger(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function getAdminPaginationParams(
  searchParams: URLSearchParams,
  options: {
    defaultPageSize?: number;
    maxPageSize?: number;
  } = {},
) {
  const maxPageSize = options.maxPageSize ?? ADMIN_MAX_PAGE_SIZE;
  const defaultPageSize = Math.min(
    Math.max(options.defaultPageSize ?? ADMIN_DEFAULT_PAGE_SIZE, 1),
    maxPageSize,
  );
  const page = positiveInteger(searchParams.get("page")) ?? 1;
  const pageSize = Math.min(
    positiveInteger(searchParams.get("pageSize")) ??
      positiveInteger(searchParams.get("take")) ??
      defaultPageSize,
    maxPageSize,
  );

  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
