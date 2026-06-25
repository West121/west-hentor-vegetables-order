import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readMiniappSource(fileName: string) {
  return readFileSync(join(process.cwd(), fileName), "utf8");
}

describe("miniapp required field markers", () => {
  it("defines a shared red required marker style", () => {
    const source = readMiniappSource("src/app.scss");

    expect(source).toContain(".required-mark");
    expect(source).toContain("#ef4444");
  });

  it("marks address form fields as required wherever users add addresses", () => {
    const addressSource = readMiniappSource("src/pages/addresses/index.tsx");
    const homeSource = readMiniappSource("src/pages/home/index.tsx");

    for (const label of ["收货人", "联系电话", "所在地区", "详细地址"]) {
      expect(addressSource).toContain(
        `${label}<Text className="required-mark">*</Text>`,
      );
      expect(homeSource).toContain(
        `${label}<Text className="required-mark">*</Text>`,
      );
    }
  });

  it("marks nickname as required in profile editing", () => {
    const source = readMiniappSource("src/pages/me/index.tsx");

    expect(source).toContain('type="nickname"');
    expect(source).toContain('昵称<Text className="required-mark">*</Text>');
  });
});
