export const CUTOFF_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function normalizeCutoffTimeValue(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return CUTOFF_TIME_PATTERN.test(normalized) ? normalized : null;
}
