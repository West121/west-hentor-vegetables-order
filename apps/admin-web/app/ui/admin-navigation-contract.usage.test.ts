import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const uiDirectory = join(process.cwd(), "app/ui");

function readUiFile(name: string) {
  return readFileSync(join(uiDirectory, name), "utf8");
}

function readUiSources() {
  const entries = readdirSync(uiDirectory, {
    encoding: "utf8",
    recursive: true,
  }) as string[];

  return entries
    .filter((entry) => /\.(ts|tsx)$/.test(entry))
    .map((entry) => ({
      name: entry,
      source: readFileSync(join(uiDirectory, entry), "utf8"),
    }));
}

describe("admin navigation contract", () => {
  it("uses the shared, whitelisted route builders for every cross-section jump", () => {
    expect(readUiFile("admin-shell.tsx")).toContain(
      "adminSectionHref(searchParams, section)",
    );
    expect(readUiFile("admin-menu-search.tsx")).toContain(
      "adminSectionHref(searchParams, section)",
    );
    expect(readUiFile("admin-user-menu.tsx")).toContain(
      "adminSectionHref(searchParams, section)",
    );
    expect(readUiFile("store-switcher.tsx")).toContain("adminStoreHref(");
    expect(readUiFile("member-management-panel.tsx")).toContain(
      "adminTransferHref(",
    );
  });

  it("keeps an explicit order transfer query until the user changes sections", () => {
    const source = readUiFile("order-management-panel.tsx");
    const transferEffect = source.slice(
      source.indexOf("useEffect(() => {\n    const nextQuery = initialQuery.trim();"),
      source.indexOf("\n  function applyStatusFilter"),
    );

    expect(transferEffect).not.toContain("router.replace(");
  });

  it("cleans a package transfer query only when that page is reset", () => {
    const source = readUiFile("package-management-panel.tsx");

    expect(source).toContain("adminFilterResetHref(");
  });

  it("requires every URL-aware list page to use the shared reset contract", () => {
    const queryAwarePanels = readUiSources().filter(
      ({ name, source }) => name.endsWith("-panel.tsx") && source.includes("initialQuery"),
    );

    expect(queryAwarePanels.map(({ name }) => name).sort()).toEqual([
      "order-management-panel.tsx",
      "package-management-panel.tsx",
    ]);
    for (const { source } of queryAwarePanels) {
      expect(source).toContain("adminFilterResetHref(");
    }
  });

  it("forbids future UI code from cloning every query parameter across sections", () => {
    const offenders = readUiSources()
      .filter(
        ({ name, source }) =>
          name !== "admin-navigation-contract.usage.test.ts" &&
          source.includes("new URLSearchParams(searchParams.toString())"),
      )
      .map(({ name }) => name);

    expect(offenders).toEqual([]);
  });
});
