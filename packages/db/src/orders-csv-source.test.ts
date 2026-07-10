import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("order csv export hardening", () => {
  it("neutralizes spreadsheet formulas before quoting csv cells", () => {
    const source = readFileSync(join(__dirname, "orders.ts"), "utf8");

    expect(source).toContain("/^[=+\\-@]/.test(rawText.trimStart())");
    expect(source).toContain("`'${rawText}`");
    expect(source).toContain("csvCell(order.userVisibleRemark ?? \"\")");
    expect(source).toContain("csvCell(order.internalRemark ?? \"\")");
  });
});
