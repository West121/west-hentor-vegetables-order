import { describe, expect, it } from "vitest";

import {
  formatDateOnly,
  formatDateTimeMinute,
  formatDateTimeSecond,
} from "./date-format";

describe("admin date display helpers", () => {
  it("formats visible dates in the system standard formats", () => {
    expect(formatDateTimeSecond("2026-01-01T01:00:08")).toBe(
      "2026-01-01 01:00:08",
    );
    expect(formatDateTimeMinute("2026-01-01T01:00:08")).toBe(
      "2026-01-01 01:00",
    );
    expect(formatDateOnly("2026-01-01T01:00:08")).toBe("2026-01-01");
  });

  it("uses the caller fallback for empty or invalid values", () => {
    expect(formatDateOnly(null)).toBe("未设置");
    expect(formatDateTimeSecond("bad-value", "未记录")).toBe("未记录");
  });
});
