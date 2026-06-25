import { describe, expect, it } from "vitest";

import {
  ADMIN_LAYOUT_DENSITY_KEY,
  ADMIN_LAYOUT_MODE_KEY,
  ADMIN_LAYOUT_WIDTH_KEY,
  ADMIN_NAV_OPEN_GROUPS_KEY,
  ADMIN_SIDEBAR_COLLAPSED_KEY,
  readAdminLayoutPreferences,
  readAdminShellPreferences,
  writeAdminLayoutPreferences,
  writeAdminShellPreferences,
  type AdminShellPreferencesStorage,
} from "./admin-shell-preferences";

function memoryStorage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  const storage: AdminShellPreferencesStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };

  return { data, storage };
}

describe("admin shell preferences", () => {
  it("uses default sidebar and group states without saved preferences", () => {
    const { storage } = memoryStorage();

    expect(
      readAdminShellPreferences(storage, { openGroups: { 系统管理: true } }),
    ).toEqual({
      collapsed: false,
      density: "standard",
      mode: "vertical",
      openGroups: { 系统管理: true },
      width: "fluid",
    });
  });

  it("restores collapsed sidebar and group open states from storage", () => {
    const { storage } = memoryStorage({
      [ADMIN_NAV_OPEN_GROUPS_KEY]: JSON.stringify({
        系统管理: false,
      }),
      [ADMIN_LAYOUT_DENSITY_KEY]: "compact",
      [ADMIN_LAYOUT_MODE_KEY]: "double",
      [ADMIN_LAYOUT_WIDTH_KEY]: "contained",
      [ADMIN_SIDEBAR_COLLAPSED_KEY]: "true",
    });

    expect(
      readAdminShellPreferences(storage, { openGroups: { 系统管理: true } }),
    ).toEqual({
      collapsed: true,
      density: "compact",
      mode: "double",
      openGroups: { 系统管理: false },
      width: "contained",
    });
  });

  it("restores layout preferences independently from nav groups", () => {
    const { storage } = memoryStorage({
      [ADMIN_LAYOUT_DENSITY_KEY]: "compact",
      [ADMIN_LAYOUT_MODE_KEY]: "horizontal",
      [ADMIN_LAYOUT_WIDTH_KEY]: "contained",
      [ADMIN_SIDEBAR_COLLAPSED_KEY]: "true",
    });

    expect(readAdminLayoutPreferences(storage)).toEqual({
      collapsed: true,
      density: "compact",
      mode: "horizontal",
      width: "contained",
    });
  });

  it("ignores unknown layout preference values", () => {
    const { storage } = memoryStorage({
      [ADMIN_LAYOUT_DENSITY_KEY]: "huge",
      [ADMIN_LAYOUT_MODE_KEY]: "floating",
      [ADMIN_LAYOUT_WIDTH_KEY]: "tiny",
    });

    expect(readAdminLayoutPreferences(storage)).toEqual({
      collapsed: false,
      density: "standard",
      mode: "vertical",
      width: "fluid",
    });
  });

  it("writes stable keys for sidebar and group preferences", () => {
    const { data, storage } = memoryStorage();

    writeAdminShellPreferences(storage, {
      collapsed: true,
      density: "compact",
      mode: "content-full",
      openGroups: { 系统管理: false },
      width: "contained",
    });

    expect(data.get(ADMIN_SIDEBAR_COLLAPSED_KEY)).toBe("true");
    expect(data.get(ADMIN_LAYOUT_DENSITY_KEY)).toBe("compact");
    expect(data.get(ADMIN_LAYOUT_MODE_KEY)).toBe("content-full");
    expect(data.get(ADMIN_LAYOUT_WIDTH_KEY)).toBe("contained");
    expect(data.get(ADMIN_NAV_OPEN_GROUPS_KEY)).toBe(
      JSON.stringify({ 系统管理: false }),
    );
  });

  it("writes layout preferences without touching open group state", () => {
    const { data, storage } = memoryStorage({
      [ADMIN_NAV_OPEN_GROUPS_KEY]: JSON.stringify({ 订单管理: true }),
    });

    writeAdminLayoutPreferences(storage, {
      collapsed: true,
      density: "compact",
      mode: "double",
      width: "contained",
    });

    expect(data.get(ADMIN_SIDEBAR_COLLAPSED_KEY)).toBe("true");
    expect(data.get(ADMIN_LAYOUT_DENSITY_KEY)).toBe("compact");
    expect(data.get(ADMIN_LAYOUT_MODE_KEY)).toBe("double");
    expect(data.get(ADMIN_LAYOUT_WIDTH_KEY)).toBe("contained");
    expect(data.get(ADMIN_NAV_OPEN_GROUPS_KEY)).toBe(
      JSON.stringify({ 订单管理: true }),
    );
  });
});
