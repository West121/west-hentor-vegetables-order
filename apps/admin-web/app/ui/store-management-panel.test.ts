import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("store management modal affordances", () => {
  it("keeps store and franchisee dialogs draggable, fullscreen-capable and resizable", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/store-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("cursor-move");
    expect(source).toContain("setFullscreen");
    expect(source).toContain("resize");
    expect(source).not.toContain(["右下角", "可伸缩"].join(""));
  });
});
