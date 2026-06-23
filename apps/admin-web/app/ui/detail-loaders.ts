type FetchLike = (input: string) => Promise<Response>;

type ApiResponse<T> = {
  data?: Record<string, T>;
  error?: { message?: string };
  success: boolean;
};

export function buildStoreScopedDetailPath(
  resource: string,
  id: string,
  storeId: string,
) {
  const params = new URLSearchParams({ storeId });
  return `/api/admin/${resource}/${encodeURIComponent(id)}?${params.toString()}`;
}

export function buildDetailPath(resource: string, id: string) {
  return `/api/admin/${resource}/${encodeURIComponent(id)}`;
}

export async function loadDetailResource<T>(
  path: string,
  dataKey: string,
  fetcher: FetchLike = fetch,
) {
  const response = await fetcher(path);
  const result = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !result.success || !result.data?.[dataKey]) {
    throw new Error(result.error?.message ?? "详情加载失败");
  }

  return result.data[dataKey];
}

export function replaceItemById<T extends { id: string }>(items: T[], item: T) {
  return items.map((current) => (current.id === item.id ? item : current));
}
