export type ImportApiPayload<T> = {
  data?: T | { result?: T | null } | null;
  success: boolean;
};

export function getImportResultFromApiPayload<T>(
  payload: ImportApiPayload<T>,
): T | null {
  const data = payload.data;
  if (!data || typeof data !== "object") {
    return null;
  }

  if ("result" in data) {
    return data.result ?? null;
  }

  return data as T;
}
