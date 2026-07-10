import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(process.cwd(), "app/ui/admin-rich-text-editor.tsx"),
  "utf8",
);

describe("AdminRichTextEditor", () => {
  it("keeps the expected rich text toolbar actions available", () => {
    expect(source).toContain("setParagraph");
    expect(source).toContain("toggleHeading({ level: 4 })");
    expect(source).toContain("toggleStrike");
    expect(source).toContain("toggleBlockquote");
    expect(source).toContain("setHorizontalRule");
    expect(source).toContain("undo().run");
    expect(source).toContain("redo().run");
  });
});
