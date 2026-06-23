import { describe, expect, it } from "vitest";

import {
  ADMIN_NAV_OPEN_GROUPS_KEY,
  ADMIN_SIDEBAR_COLLAPSED_KEY,
  readAdminShellPreferences,
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
      openGroups: { 系统管理: true },
    });
  });

  it("restores collapsed sidebar and group open states from storage", () => {
    const { storage } = memoryStorage({
      [ADMIN_NAV_OPEN_GROUPS_KEY]: JSON.stringify({
        系统管理: false,
      }),
      [ADMIN_SIDEBAR_COLLAPSED_KEY]: "true",
    });

    expect(
      readAdminShellPreferences(storage, { openGroups: { 系统管理: true } }),
    ).toEqual({
      collapsed: true,
      openGroups: { 系统管理: false },
    });
  });

  it("writes stable keys for sidebar and group preferences", () => {
    const { data, storage } = memoryStorage();

    writeAdminShellPreferences(storage, {
      collapsed: true,
      openGroups: { 系统管理: false },
    });

    expect(data.get(ADMIN_SIDEBAR_COLLAPSED_KEY)).toBe("true");
    expect(data.get(ADMIN_NAV_OPEN_GROUPS_KEY)).toBe(
      JSON.stringify({ 系统管理: false }),
    );
  });
});
