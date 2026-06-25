type DateInput = Date | string | null | undefined;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseDate(value: DateInput) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateOnly(value: DateInput, fallback = "未设置") {
  const date = parseDate(value);
  if (!date) {
    return fallback;
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

export function formatDateTimeMinute(value: DateInput, fallback = "未设置") {
  const date = parseDate(value);
  if (!date) {
    return fallback;
  }

  return `${formatDateOnly(date)} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

export function formatDateTimeSecond(value: DateInput, fallback = "未设置") {
  const date = parseDate(value);
  if (!date) {
    return fallback;
  }

  return `${formatDateTimeMinute(value)}:${pad(date.getSeconds())}`;
}
