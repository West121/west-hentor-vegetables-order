export function resolveMediaUrl(
  apiBaseUrl: string,
  url?: string | null,
): string {
  const normalized = url?.trim();
  if (!normalized) {
    return "";
  }
  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("wxfile://") ||
    normalized.startsWith("data:")
  ) {
    return normalized;
  }
  if (normalized.startsWith("/uploads")) {
    return `${apiBaseUrl.replace(/\/+$/, "")}${normalized}`;
  }
  return normalized;
}
