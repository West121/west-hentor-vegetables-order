export type AdminNavItemsVisibilityInput = {
  collapsed: boolean;
  groupOpen: boolean;
};

export type AdminNavOpenGroupInput = {
  icon?: string;
  items: Array<{
    active?: boolean;
    icon?: string;
    label?: string;
    section?: string;
  }>;
  label: string;
};

export function getCollapsedAdminNavGroupTarget(group: AdminNavOpenGroupInput) {
  const defaultItem = group.items[0];
  if (!defaultItem?.section || !group.icon || !defaultItem.label) {
    return null;
  }

  return {
    active: group.items.some((item) => item.active),
    icon: group.icon,
    items: group.items,
    label: group.label,
    section: defaultItem.section,
    title: `${group.label}：${group.items
      .map((item) => item.label)
      .filter(Boolean)
      .join("、")}`,
  };
}

export function getDefaultOpenAdminNavGroups(
  groups: AdminNavOpenGroupInput[],
) {
  return Object.fromEntries(
    groups.map((group) => [
      group.label,
      group.items.some((item) => item.active),
    ]),
  );
}

export function shouldRenderAdminNavItems({
  collapsed,
  groupOpen,
}: AdminNavItemsVisibilityInput) {
  return !collapsed && groupOpen;
}
