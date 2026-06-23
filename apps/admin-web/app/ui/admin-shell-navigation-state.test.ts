import { describe, expect, it } from "vitest";

import {
  getCollapsedAdminNavGroupTarget,
  getDefaultOpenAdminNavGroups,
  shouldRenderAdminNavItems,
} from "./admin-shell-navigation-state";

describe("admin shell navigation state", () => {
  it("renders second-level items only when the sidebar is expanded and the group is open", () => {
    expect(
      shouldRenderAdminNavItems({
        collapsed: false,
        groupOpen: false,
      }),
    ).toBe(false);

    expect(
      shouldRenderAdminNavItems({
        collapsed: false,
        groupOpen: true,
      }),
    ).toBe(true);

    expect(
      shouldRenderAdminNavItems({
        collapsed: true,
        groupOpen: false,
      }),
    ).toBe(false);
  });

  it("uses the first accessible second-level item as the collapsed group target", () => {
    expect(
      getCollapsedAdminNavGroupTarget({
        icon: "settings",
        label: "系统管理",
        items: [
          {
            active: false,
            icon: "user",
            label: "后台用户",
            section: "admin-users",
          },
          {
            active: true,
            icon: "settings",
            label: "系统设置",
            section: "system-settings",
          },
        ],
      }),
    ).toEqual({
      active: true,
      icon: "settings",
      items: [
        {
          active: false,
          icon: "user",
          label: "后台用户",
          section: "admin-users",
        },
        {
          active: true,
          icon: "settings",
          label: "系统设置",
          section: "system-settings",
        },
      ],
      label: "系统管理",
      section: "admin-users",
      title: "系统管理：后台用户、系统设置",
    });
  });

  it("does not render collapsed targets for empty groups", () => {
    expect(
      getCollapsedAdminNavGroupTarget({
        icon: "settings",
        label: "系统管理",
        items: [],
      }),
    ).toBeNull();
  });

  it("opens only the active first-level group by default in expanded mode", () => {
    expect(
      getDefaultOpenAdminNavGroups([
        {
          icon: "clipboard",
          label: "订单管理",
          items: [
            { label: "订单列表", active: true },
            { label: "发货统计", active: false },
          ],
        },
        {
          icon: "settings",
          label: "系统管理",
          items: [{ label: "系统设置", active: false }],
        },
      ]),
    ).toEqual({
      订单管理: true,
      系统管理: false,
    });
  });
});
