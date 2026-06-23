const BUSINESS_TIME_ZONE = "Asia/Shanghai";
const BUSINESS_TIME_ZONE_OFFSET = "+08:00";

function getDatePartsInBusinessZone(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
  }).formatToParts(now);
  const valueByType = new Map(parts.map((part) => [part.type, part.value]));

  return {
    day: valueByType.get("day") ?? "01",
    month: valueByType.get("month") ?? "01",
    year: valueByType.get("year") ?? "1970",
  };
}

export function getBusinessDayRange(now = new Date()) {
  const { day, month, year } = getDatePartsInBusinessZone(now);
  const start = new Date(
    `${year}-${month}-${day}T00:00:00${BUSINESS_TIME_ZONE_OFFSET}`,
  );
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { end, start };
}

export function getBusinessClockMinutes(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    timeZone: BUSINESS_TIME_ZONE,
  }).formatToParts(now);
  const valueByType = new Map(parts.map((part) => [part.type, part.value]));
  const hour = Number(valueByType.get("hour") ?? "0");
  const minute = Number(valueByType.get("minute") ?? "0");

  return hour * 60 + minute;
}

export function isInBusinessDay(value: Date, now = new Date()) {
  const { end, start } = getBusinessDayRange(now);
  return value >= start && value < end;
}
