export const ADMIN_SIDEBAR_COLLAPSED_KEY = "hentor.admin.sidebar.collapsed";
export const ADMIN_NAV_OPEN_GROUPS_KEY = "hentor.admin.nav.openGroups";
export const ADMIN_LAYOUT_DENSITY_KEY = "hentor.admin.layout.density";
export const ADMIN_LAYOUT_MODE_KEY = "hentor.admin.layout.mode";
export const ADMIN_LAYOUT_WIDTH_KEY = "hentor.admin.layout.width";
export const ADMIN_SHELL_PREFERENCES_CHANGED_EVENT =
  "hentor.admin.shell.preferences.changed";

export type AdminLayoutDensity = "standard" | "compact";
export type AdminLayoutMode = "vertical" | "double" | "horizontal" | "content-full";
export type AdminLayoutWidth = "fluid" | "contained";

export type AdminShellPreferencesStorage = Pick<
  Storage,
  "getItem" | "setItem"
>;

export type AdminLayoutPreferences = {
  collapsed: boolean;
  density: AdminLayoutDensity;
  mode: AdminLayoutMode;
  width: AdminLayoutWidth;
};

export type AdminShellPreferences = {
  collapsed: boolean;
  density: AdminLayoutDensity;
  mode: AdminLayoutMode;
  openGroups: Record<string, boolean>;
  width: AdminLayoutWidth;
};

export const DEFAULT_ADMIN_LAYOUT_PREFERENCES: AdminLayoutPreferences = {
  collapsed: false,
  density: "standard",
  mode: "vertical",
  width: "fluid",
};

function readLayoutDensity(value: string | null): AdminLayoutDensity {
  return value === "compact" ? "compact" : "standard";
}

function readLayoutMode(value: string | null): AdminLayoutMode {
  return value === "double" ||
    value === "horizontal" ||
    value === "content-full"
    ? value
    : "vertical";
}

function readLayoutWidth(value: string | null): AdminLayoutWidth {
  return value === "contained" ? "contained" : "fluid";
}

export function readAdminLayoutPreferences(
  storage: AdminShellPreferencesStorage,
): AdminLayoutPreferences {
  return {
    collapsed: storage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY) === "true",
    density: readLayoutDensity(storage.getItem(ADMIN_LAYOUT_DENSITY_KEY)),
    mode: readLayoutMode(storage.getItem(ADMIN_LAYOUT_MODE_KEY)),
    width: readLayoutWidth(storage.getItem(ADMIN_LAYOUT_WIDTH_KEY)),
  };
}

export function writeAdminLayoutPreferences(
  storage: AdminShellPreferencesStorage,
  preferences: AdminLayoutPreferences,
) {
  storage.setItem(ADMIN_SIDEBAR_COLLAPSED_KEY, String(preferences.collapsed));
  storage.setItem(ADMIN_LAYOUT_DENSITY_KEY, preferences.density);
  storage.setItem(ADMIN_LAYOUT_MODE_KEY, preferences.mode);
  storage.setItem(ADMIN_LAYOUT_WIDTH_KEY, preferences.width);
}

export function notifyAdminShellPreferencesChanged() {
  window.dispatchEvent(new Event(ADMIN_SHELL_PREFERENCES_CHANGED_EVENT));
}

export function readAdminShellPreferences(
  storage: AdminShellPreferencesStorage,
  defaults: Pick<AdminShellPreferences, "openGroups">,
): AdminShellPreferences {
  const layout = readAdminLayoutPreferences(storage);
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
      return { ...layout, openGroups };
    }
  }

  return { ...layout, openGroups };
}

export function writeAdminShellPreferences(
  storage: AdminShellPreferencesStorage,
  preferences: AdminShellPreferences,
) {
  writeAdminLayoutPreferences(storage, preferences);
  storage.setItem(
    ADMIN_NAV_OPEN_GROUPS_KEY,
    JSON.stringify(preferences.openGroups),
  );
}
