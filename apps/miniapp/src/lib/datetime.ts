function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatMiniDate(value?: string | null) {
  const date = parseDate(value);
  if (!date) {
    return "--";
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

export function formatMiniDateTimeMinute(value?: string | null) {
  const date = parseDate(value);
  if (!date) {
    return "--";
  }

  return `${formatMiniDate(value)} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}
