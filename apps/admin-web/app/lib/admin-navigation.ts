export type AdminNavIcon =
  | "badge-check"
  | "boxes"
  | "building"
  | "clipboard"
  | "dashboard"
  | "file-clock"
  | "folder-tree"
  | "package"
  | "printer"
  | "settings-2"
  | "settings"
  | "shield"
  | "store"
  | "truck"
  | "user"
  | "users";

export const ADMIN_SECTION_IDS = [
  "overview",
  "orders",
  "shipment-stats",
  "members",
  "user-packages",
  "package-templates",
  "dishes",
  "stores",
  "franchisees",
  "tasks",
  "admin-users",
  "roles",
  "menus",
  "dictionaries",
  "kuaidi-printers",
  "delivery-ranges",
  "online-sessions",
  "operation-logs",
  "system-settings",
] as const;

export type AdminSectionId = (typeof ADMIN_SECTION_IDS)[number];

export type AdminNavItem = {
  active?: boolean;
  icon: AdminNavIcon;
  label: string;
  section: AdminSectionId;
};

export type AdminNavGroup = {
  collapsible?: boolean;
  icon: AdminNavIcon;
  items: AdminNavItem[];
  label: string;
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    icon: "dashboard",
    label: "工作台",
    collapsible: true,
    items: [{ icon: "dashboard", label: "运营总览", section: "overview" }],
  },
  {
    icon: "clipboard",
    label: "订单管理",
    collapsible: true,
    items: [
      { icon: "clipboard", label: "订单列表", section: "orders" },
      { icon: "truck", label: "发货统计", section: "shipment-stats" },
    ],
  },
  {
    icon: "users",
    label: "会员管理",
    collapsible: true,
    items: [
      { icon: "users", label: "会员用户", section: "members" },
      { icon: "badge-check", label: "会员套餐", section: "user-packages" },
    ],
  },
  {
    icon: "package",
    label: "套餐管理",
    collapsible: true,
    items: [
      { icon: "package", label: "套餐模板", section: "package-templates" },
      { icon: "boxes", label: "菜品管理", section: "dishes" },
    ],
  },
  {
    icon: "file-clock",
    label: "任务管理",
    collapsible: true,
    items: [{ icon: "file-clock", label: "任务配置", section: "tasks" }],
  },
  {
    icon: "settings",
    label: "系统管理",
    collapsible: true,
    items: [
      { icon: "user", label: "后台用户", section: "admin-users" },
      { icon: "badge-check", label: "角色管理", section: "roles" },
      { icon: "folder-tree", label: "菜单管理", section: "menus" },
      { icon: "settings-2", label: "系统字典", section: "dictionaries" },
      { icon: "printer", label: "面单打印", section: "kuaidi-printers" },
      { icon: "truck", label: "配送范围", section: "delivery-ranges" },
      { icon: "users", label: "在线用户", section: "online-sessions" },
      { icon: "file-clock", label: "操作日志", section: "operation-logs" },
      { icon: "settings", label: "系统设置", section: "system-settings" },
    ],
  },
];

const adminSectionIdSet = new Set<string>(ADMIN_SECTION_IDS);
const systemSectionIdSet = new Set<AdminSectionId>([
  "admin-users",
  "roles",
  "menus",
  "dictionaries",
  "kuaidi-printers",
  "delivery-ranges",
  "online-sessions",
  "operation-logs",
  "system-settings",
]);
const hiddenSectionIdSet = new Set<AdminSectionId>([
  "stores",
  "franchisees",
]);

const sectionPermissionMap: Partial<Record<AdminSectionId, string[]>> = {
  dishes: ["dishes.read", "dishes.write"],
  members: ["members.read", "members.write"],
  orders: ["orders.read", "orders.write"],
  "package-templates": ["packages.read", "packages.write"],
  "shipment-stats": ["orders.read", "orders.write"],
  tasks: ["tasks.read", "tasks.write"],
  "user-packages": ["members.read", "members.write"],
};

function hasAnyPermission(
  permissionCodes: readonly string[],
  allowedCodes: readonly string[],
) {
  return allowedCodes.some((code) => permissionCodes.includes(code));
}

function canAccessSection(
  section: AdminSectionId,
  permissionCodes?: readonly string[],
) {
  if (!permissionCodes) {
    return true;
  }

  if (systemSectionIdSet.has(section)) {
    return permissionCodes.includes("system.manage");
  }

  if (hiddenSectionIdSet.has(section)) {
    return false;
  }

  const allowedCodes = sectionPermissionMap[section];
  if (allowedCodes) {
    return hasAnyPermission(permissionCodes, allowedCodes);
  }

  return true;
}

export function getDefaultAdminSection(): AdminSectionId {
  return "overview";
}

export function adminSectionHref(
  searchParams: URLSearchParams,
  section: string,
) {
  const params = new URLSearchParams();
  const storeId = searchParams.get("storeId")?.trim();

  if (storeId) {
    params.set("storeId", storeId);
  }
  params.set("section", section);
  return `?${params.toString()}`;
}

export function adminStoreHref(searchParams: URLSearchParams, storeId: string) {
  return adminSectionHref(
    new URLSearchParams({ storeId }),
    resolveAdminSection(searchParams.get("section")),
  );
}

export function adminFilterResetHref(
  searchParams: URLSearchParams,
  section: string,
) {
  return adminSectionHref(searchParams, section);
}

export function adminTransferHref({
  query,
  section,
  storeId,
}: {
  query?: string | null;
  section: string;
  storeId?: string | null;
}) {
  const params = new URLSearchParams();
  if (storeId?.trim()) {
    params.set("storeId", storeId.trim());
  }
  params.set("section", section);
  if (query?.trim()) {
    params.set("query", query.trim());
  }
  return `/?${params.toString()}`;
}

export function resolveAdminSection(
  value: string | null | undefined,
  permissionCodes?: readonly string[],
): AdminSectionId {
  if (!value || !adminSectionIdSet.has(value)) {
    return getDefaultAdminSection();
  }

  const section = value as AdminSectionId;

  return canAccessSection(section, permissionCodes)
    ? section
    : getDefaultAdminSection();
}

export function buildAdminNavGroups(
  activeSection: AdminSectionId,
  permissionCodes?: readonly string[],
): AdminNavGroup[] {
  return ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items
      .filter((item) => canAccessSection(item.section, permissionCodes))
      .map((item) => ({
        ...item,
        active: item.section === activeSection,
      })),
  })).filter((group) => group.items.length > 0);
}

export type AdminMenuTreeNode = {
  children: AdminMenuTreeNode[];
  icon: AdminNavIcon;
  id: string;
  label: string;
  level: 1 | 2;
  parentId: string | null;
  permissionCodes: string[];
  section: AdminSectionId | null;
  sortOrder: number;
  visible: boolean;
};

function getSectionPermissionCodes(section: AdminSectionId) {
  if (systemSectionIdSet.has(section)) {
    return ["system.manage"];
  }

  if (hiddenSectionIdSet.has(section)) {
    return ["stores.manage"];
  }

  return sectionPermissionMap[section] ?? [];
}

export function buildAdminMenuTree(): AdminMenuTreeNode[] {
  return ADMIN_NAV_GROUPS.map((group, groupIndex) => {
    const children = group.items.map((item, itemIndex) => ({
      children: [],
      icon: item.icon,
      id: item.section,
      label: item.label,
      level: 2 as const,
      parentId: group.label,
      permissionCodes: getSectionPermissionCodes(item.section),
      section: item.section,
      sortOrder: (groupIndex + 1) * 100 + itemIndex + 1,
      visible: true,
    }));

    return {
      children,
      icon: group.icon,
      id: group.label,
      label: group.label,
      level: 1 as const,
      parentId: null,
      permissionCodes: [
        ...new Set(children.flatMap((item) => item.permissionCodes)),
      ],
      section: null,
      sortOrder: (groupIndex + 1) * 100,
      visible: true,
    };
  });
}

export function getAdminSectionLabel(section: AdminSectionId) {
  for (const group of ADMIN_NAV_GROUPS) {
    const item = group.items.find((navItem) => navItem.section === section);
    if (item) {
      return item.label;
    }
  }

  return "运营总览";
}
