import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("admin theme toggle", () => {
  it("persists theme and uses view-transition reveal from the clicked control", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/admin-theme-toggle.tsx"),
      "utf8",
    );

    expect(source).toContain("hentor-admin-theme");
    expect(source).toContain("startViewTransition");
    expect(source).toContain("theme-transitioning-to-dark");
    expect(source).toContain("theme-transitioning-to-light");
    expect(source).toContain("--theme-reveal-x");
    expect(source).toContain("--theme-reveal-y");
    expect(source).toContain("--theme-reveal-radius");
  });

  it("renders the toggle in the admin header next to the menu search", () => {
    const source = readFileSync(
      join(process.cwd(), "app/dashboard-client.tsx"),
      "utf8",
    );

    expect(source).toContain("AdminThemeToggle");
    expect(source).toMatch(/<AdminMenuSearch[\s\S]*?<AdminThemeToggle[\s\S]*?<AdminUserMenu/);
  });

  it("defines a dark green theme with clip-path transition css", () => {
    const source = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

    expect(source).toContain(".dark");
    expect(source).toContain("@keyframes admin-theme-reveal");
    expect(source).toContain("clip-path: circle");
    expect(source).toContain("::view-transition-new(root)");
    expect(source).toContain("animation-duration: 1500ms");
  });
});
