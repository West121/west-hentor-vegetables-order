import { describe, expect, it } from "vitest";

import { formatMiniDate, formatMiniDateTimeMinute } from "./datetime";

describe("miniapp date display helpers", () => {
  it("formats visible dates and date-times with full year and zero padding", () => {
    expect(formatMiniDate("2026-01-01T01:00:08")).toBe("2026-01-01");
    expect(formatMiniDateTimeMinute("2026-01-01T01:00:08")).toBe(
      "2026-01-01 01:00",
    );
  });

  it("falls back for empty or invalid date values", () => {
    expect(formatMiniDate(null)).toBe("--");
    expect(formatMiniDateTimeMinute("bad-value")).toBe("--");
  });
});
