import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("admin media routing", () => {
  it("proxies uploaded media from the admin origin to the Spring backend", () => {
    const source = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

    expect(source).toContain('source: "/uploads/:path*"');
    expect(source).toContain("destination: `${springApiBaseUrl}/uploads/:path*`");
  });
});
