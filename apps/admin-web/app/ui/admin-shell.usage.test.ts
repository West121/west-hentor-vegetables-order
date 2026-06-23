import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("admin shell sidebar affordance", () => {
  it("places the sidebar collapse button on the right boundary as an icon-only control", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/admin-shell.tsx"),
      "utf8",
    );

    expect(source).toContain("absolute right-0 top-6");
    expect(source).toContain("translate-x-1/2");
    expect(source).toContain('aria-label={collapsed ? "展开侧边栏" : "折叠侧边栏"}');
    expect(source).toContain('title={collapsed ? "展开侧边栏" : "折叠侧边栏"}');
    expect(source).not.toContain(">展开<");
  });

  it("renders collapsed sidebar as first-level icon entries with combined group hints", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/admin-shell.tsx"),
      "utf8",
    );

    expect(source).toContain("getCollapsedAdminNavGroupTarget(group)");
    expect(source).toContain("collapsedGroupTarget.title");
    expect(source).toContain("sectionHref(collapsedGroupTarget.section)");
    expect(source).toContain("group-hover/nav:pointer-events-auto");
    expect(source).toContain("group.items.map((item)");
    expect(source).not.toContain("collapsed && \"justify-center px-0\"");
  });

  it("exposes stable labels for two-level group collapse controls", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/admin-shell.tsx"),
      "utf8",
    );

    expect(source).toContain(
      'aria-label={`${groupOpen ? "收起" : "展开"}${group.label}菜单`}',
    );
  });

  it("keeps the expanded and collapsed sidebar widths aligned with the Figma prototype", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/admin-shell.tsx"),
      "utf8",
    );

    expect(source).toContain('collapsed ? "w-[72px]" : "w-[220px]"');
    expect(source).toContain('collapsed ? "pl-[72px]" : "pl-[220px]"');
    expect(source).not.toContain("w-[84px]");
    expect(source).not.toContain("w-[260px]");
    expect(source).not.toContain("pl-[84px]");
    expect(source).not.toContain("pl-[260px]");
  });

  it("keeps long two-level navigation visibly scrollable", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/admin-shell.tsx"),
      "utf8",
    );

    expect(source).toContain('collapsed ? "overflow-visible px-3" : "overflow-y-auto px-4"');
    expect(source).not.toContain("no-scrollbar flex-1 overflow-y-auto");
  });
});
