import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("admin calendar locale", () => {
  it("uses Chinese month captions and weekday labels by default", () => {
    const source = readFileSync(
      join(process.cwd(), "components/ui/calendar.tsx"),
      "utf8",
    );

    expect(source).toContain('import { zhCN } from "date-fns/locale"');
    expect(source).toContain("const DEFAULT_CALENDAR_LOCALE = zhCN");
    expect(source).toContain('return `${month.getFullYear()}年${month.getMonth() + 1}月`');
    expect(source).toContain('"周日"');
    expect(source).toContain('"周一"');
    expect(source).toContain("formatCaption: formatChineseCalendarCaption");
    expect(source).toContain("formatWeekdayName: formatChineseCalendarWeekday");
  });
});
