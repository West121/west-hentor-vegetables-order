import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readUiFile(path: string) {
  return readFileSync(join(process.cwd(), "app/ui", path), "utf8");
}

describe("admin radio group", () => {
  it("uses native radio inputs for binary form choices", () => {
    const source = readUiFile("admin-radio-group.tsx");

    expect(source).toContain('type="radio"');
    expect(source).toContain("accent-[#1f8f4f]");
    expect(source).toContain("AdminRadioOption");
  });

  it.each([
    ["system-management-panel.tsx", "admin-user-status"],
    ["kuaidi-printer-management-panel.tsx", "kuaidi-printer-status"],
    ["member-management-panel.tsx", "create-member-status"],
    ["member-management-panel.tsx", "member-status"],
  ])("%s uses radio group %s", (file, name) => {
    const source = readUiFile(file);

    expect(source).toContain("AdminRadioGroup");
    expect(source).toContain(`name="${name}"`);
  });
});
