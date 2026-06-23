import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("miniapp home route response shape", () => {
  it("returns package benefits so extra package items can be shown on the home card", () => {
    const source = readFileSync(
      join(process.cwd(), "app/api/v1/home/route.ts"),
      "utf8",
    );

    expect(source).toContain("getMiniappCurrentPackage");
    expect(source).toContain("benefits: userPackage.benefits");
  });
});
