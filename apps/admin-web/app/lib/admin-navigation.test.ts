import { describe, expect, it } from "vitest";

import {
  ADMIN_NAV_GROUPS,
  buildAdminMenuTree,
  buildAdminNavGroups,
  getDefaultAdminSection,
  resolveAdminSection,
} from "./admin-navigation";

describe("admin navigation", () => {
  it("keeps the server-to-client navigation model serializable", () => {
    for (const group of ADMIN_NAV_GROUPS) {
      expect(typeof group.icon).toBe("string");
      for (const item of group.items) {
        expect(typeof item.icon).toBe("string");
        expect(typeof item.section).toBe("string");
      }
    }
  });

  it("uses stable unique section ids for every second-level menu item", () => {
    const sections = ADMIN_NAV_GROUPS.flatMap((group) =>
      group.items.map((item) => item.section),
    );

    expect(new Set(sections).size).toBe(sections.length);
    expect(sections).toContain("orders");
    expect(sections).toContain("members");
    expect(sections).toContain("user-packages");
    expect(sections).toContain("admin-users");
    expect(sections).toContain("roles");
    expect(sections).toContain("menus");
  });

  it("makes every first-level group collapsible in the two-level sidebar", () => {
    expect(ADMIN_NAV_GROUPS.map((group) => group.label)).toEqual([
      "工作台",
      "订单管理",
      "会员管理",
      "套餐管理",
      "任务管理",
      "系统管理",
    ]);
    expect(ADMIN_NAV_GROUPS.every((group) => group.collapsible)).toBe(true);
  });

  it("resolves invalid or missing sections to the dashboard overview", () => {
    expect(getDefaultAdminSection()).toBe("overview");
    expect(resolveAdminSection(undefined)).toBe("overview");
    expect(resolveAdminSection("")).toBe("overview");
    expect(resolveAdminSection("unknown")).toBe("overview");
    expect(resolveAdminSection("orders")).toBe("orders");
  });

  it("marks exactly one navigation item active for the requested section", () => {
    const groups = buildAdminNavGroups("members");
    const activeItems = groups.flatMap((group) =>
      group.items.filter((item) => item.active),
    );

    expect(activeItems).toHaveLength(1);
    expect(activeItems[0]).toMatchObject({
      label: "会员用户",
      section: "members",
    });
  });

  it("hides system management sections without system.manage permission", () => {
    const groups = buildAdminNavGroups("overview", []);
    const sections = groups.flatMap((group) =>
      group.items.map((item) => item.section),
    );

    expect(sections).not.toContain("admin-users");
    expect(sections).not.toContain("roles");
    expect(sections).not.toContain("menus");
    expect(sections).not.toContain("operation-logs");
    expect(sections).not.toContain("system-settings");
  });

  it("keeps system management sections with system.manage permission", () => {
    const groups = buildAdminNavGroups("admin-users", ["system.manage"]);
    const sections = groups.flatMap((group) =>
      group.items.map((item) => item.section),
    );

    expect(sections).toContain("admin-users");
    expect(sections).toContain("roles");
    expect(sections).toContain("menus");
    expect(sections).toContain("operation-logs");
    expect(sections).toContain("system-settings");
  });

  it("rejects direct system section navigation without permission", () => {
    expect(resolveAdminSection("admin-users", [])).toBe("overview");
    expect(resolveAdminSection("roles", [])).toBe("overview");
    expect(resolveAdminSection("menus", [])).toBe("overview");
    expect(resolveAdminSection("admin-users", ["system.manage"])).toBe(
      "admin-users",
    );
  });

  it("keeps store management sections hidden while the feature is field-only", () => {
    const groups = buildAdminNavGroups("overview", ["stores.manage"]);
    const sections = groups.flatMap((group) =>
      group.items.map((item) => item.section),
    );

    expect(sections).not.toContain("stores");
    expect(sections).not.toContain("franchisees");
  });

  it("rejects direct store management navigation even with permission", () => {
    expect(resolveAdminSection("stores", [])).toBe("overview");
    expect(resolveAdminSection("franchisees", [])).toBe("overview");
    expect(resolveAdminSection("stores", ["stores.manage"])).toBe("overview");
    expect(resolveAdminSection("franchisees", ["stores.manage"])).toBe(
      "overview",
    );
  });

  it("hides business sections without their matching read or write permissions", () => {
    const groups = buildAdminNavGroups("overview", []);
    const sections = groups.flatMap((group) =>
      group.items.map((item) => item.section),
    );

    expect(sections).not.toContain("orders");
    expect(sections).not.toContain("shipment-stats");
    expect(sections).not.toContain("members");
    expect(sections).not.toContain("user-packages");
    expect(sections).not.toContain("package-templates");
    expect(sections).not.toContain("dishes");
    expect(sections).not.toContain("tasks");
  });

  it("keeps business sections when their read or write permissions are present", () => {
    const groups = buildAdminNavGroups("orders", [
      "dishes.write",
      "members.read",
      "orders.read",
      "packages.write",
      "tasks.read",
    ]);
    const sections = groups.flatMap((group) =>
      group.items.map((item) => item.section),
    );

    expect(sections).toContain("orders");
    expect(sections).toContain("shipment-stats");
    expect(sections).toContain("members");
    expect(sections).toContain("user-packages");
    expect(sections).toContain("package-templates");
    expect(sections).toContain("dishes");
    expect(sections).toContain("tasks");
  });

  it("rejects direct business section navigation without matching permission", () => {
    expect(resolveAdminSection("orders", [])).toBe("overview");
    expect(resolveAdminSection("members", [])).toBe("overview");
    expect(resolveAdminSection("package-templates", [])).toBe("overview");
    expect(resolveAdminSection("dishes", [])).toBe("overview");
    expect(resolveAdminSection("tasks", [])).toBe("overview");
    expect(resolveAdminSection("user-packages", ["members.read"])).toBe(
      "user-packages",
    );
    expect(resolveAdminSection("dishes", ["dishes.read"])).toBe("dishes");
  });

  it("builds a tree table model for menu management with first-level icons", () => {
    const tree = buildAdminMenuTree();
    const systemGroup = tree.find((node) => node.label === "系统管理");

    expect(systemGroup).toMatchObject({
      icon: "settings",
      level: 1,
      section: null,
    });
    expect(systemGroup?.children.map((item) => item.section)).toEqual([
      "admin-users",
      "roles",
      "menus",
      "operation-logs",
      "system-settings",
    ]);
    expect(systemGroup?.children.find((item) => item.section === "menus"))
      .toMatchObject({
        icon: "folder-tree",
        permissionCodes: ["system.manage"],
      });
  });
});
