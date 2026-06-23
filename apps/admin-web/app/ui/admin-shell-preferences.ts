export const ADMIN_SIDEBAR_COLLAPSED_KEY = "hentor.admin.sidebar.collapsed";
export const ADMIN_NAV_OPEN_GROUPS_KEY = "hentor.admin.nav.openGroups";

export type AdminShellPreferencesStorage = Pick<
  Storage,
  "getItem" | "setItem"
>;

export type AdminShellPreferences = {
  collapsed: boolean;
  openGroups: Record<string, boolean>;
};

export function readAdminShellPreferences(
  storage: AdminShellPreferencesStorage,
  defaults: Pick<AdminShellPreferences, "openGroups">,
): AdminShellPreferences {
  const collapsed = storage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY) === "true";
  const openGroups = { ...defaults.openGroups };
  const rawOpenGroups = storage.getItem(ADMIN_NAV_OPEN_GROUPS_KEY);

  if (rawOpenGroups) {
    try {
      const parsed = JSON.parse(rawOpenGroups) as unknown;
      if (parsed && typeof parsed === "object") {
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value === "boolean") {
            openGroups[key] = value;
          }
        }
      }
    } catch {
      return { collapsed, openGroups };
    }
  }

  return { collapsed, openGroups };
}

export function writeAdminShellPreferences(
  storage: AdminShellPreferencesStorage,
  preferences: AdminShellPreferences,
) {
  storage.setItem(ADMIN_SIDEBAR_COLLAPSED_KEY, String(preferences.collapsed));
  storage.setItem(
    ADMIN_NAV_OPEN_GROUPS_KEY,
    JSON.stringify(preferences.openGroups),
  );
}
