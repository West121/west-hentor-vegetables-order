import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("miniapp account route", () => {
  it("updates nickname through PATCH and records an operation log", () => {
    const source = readFileSync(
      join(process.cwd(), "app/api/v1/account/route.ts"),
      "utf8",
    );

    expect(source).toContain("export async function PATCH");
    expect(source).toContain("nickname: z.string().trim().min(1).max(24)");
    expect(source).toContain("prisma.user.update");
    expect(source).toContain("MINIAPP_PROFILE_UPDATED");
    expect(source).toContain("createMiniappOperationLog");
  });
});
