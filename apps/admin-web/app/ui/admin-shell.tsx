"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useEffect,
  useState,
  type ComponentType,
  type FocusEvent,
  type ReactNode,
} from "react";
import {
  BadgeCheck,
  Boxes,
  Building2,
  ChevronDown,
  ClipboardList,
  FileClock,
  FolderTree,
  LayoutDashboard,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Printer,
  Settings,
  Settings2,
  ShieldCheck,
  Store,
  Truck,
  UserRound,
  UsersRound,
  type LucideProps,
} from "lucide-react";

import type { AdminNavGroup, AdminNavIcon } from "@/app/lib/admin-navigation";
import { cn } from "@/app/lib/cn";

import {
  ADMIN_SHELL_PREFERENCES_CHANGED_EVENT,
  readAdminShellPreferences,
  writeAdminShellPreferences,
  type AdminLayoutDensity,
  type AdminLayoutMode,
  type AdminLayoutWidth,
} from "./admin-shell-preferences";
import {
  getCollapsedAdminNavGroupTarget,
  getDefaultOpenAdminNavGroups,
  shouldRenderAdminNavItems,
} from "./admin-shell-navigation-state";

const iconMap: Record<AdminNavIcon, ComponentType<LucideProps>> = {
  "badge-check": BadgeCheck,
  boxes: Boxes,
  building: Building2,
  clipboard: ClipboardList,
  dashboard: LayoutDashboard,
  "file-clock": FileClock,
  "folder-tree": FolderTree,
  package: Package,
  printer: Printer,
  "settings-2": Settings2,
  settings: Settings,
  shield: ShieldCheck,
  store: Store,
  truck: Truck,
  user: UserRound,
  users: UsersRound,
};

type AdminShellProps = {
  brand: string;
  groups: AdminNavGroup[];
  children: ReactNode;
  topBarActions?: ReactNode;
};

export function AdminShell({
  brand,
  groups,
  children,
  topBarActions,
}: AdminShellProps) {
  const searchParams = useSearchParams();
  const defaultOpenGroups = getDefaultOpenAdminNavGroups(groups);
  const [collapsed, setCollapsed] = useState(false);
  const [density, setDensity] = useState<AdminLayoutDensity>("standard");
  const [layoutMode, setLayoutMode] = useState<AdminLayoutMode>("vertical");
  const [width, setWidth] = useState<AdminLayoutWidth>("fluid");
  const [openGroups, setOpenGroups] =
    useState<Record<string, boolean>>(defaultOpenGroups);
  const [horizontalOpenGroup, setHorizontalOpenGroup] = useState<string | null>(
    null,
  );
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  useEffect(() => {
    const preferences = readAdminShellPreferences(window.localStorage, {
      openGroups: defaultOpenGroups,
    });

    setCollapsed(preferences.collapsed);
    setDensity(preferences.density);
    setLayoutMode(preferences.mode);
    setOpenGroups(preferences.openGroups);
    setWidth(preferences.width);
    setPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    function handlePreferencesChanged() {
      const preferences = readAdminShellPreferences(window.localStorage, {
        openGroups,
      });

      setCollapsed(preferences.collapsed);
      setDensity(preferences.density);
      setLayoutMode(preferences.mode);
      setWidth(preferences.width);
    }

    window.addEventListener(
      ADMIN_SHELL_PREFERENCES_CHANGED_EVENT,
      handlePreferencesChanged,
    );
    return () =>
      window.removeEventListener(
        ADMIN_SHELL_PREFERENCES_CHANGED_EVENT,
        handlePreferencesChanged,
      );
  }, [openGroups]);

  useEffect(() => {
    if (!preferencesLoaded) {
      return;
    }

    writeAdminShellPreferences(window.localStorage, {
      collapsed,
      density,
      mode: layoutMode,
      openGroups,
      width,
    });
  }, [collapsed, density, layoutMode, openGroups, preferencesLoaded, width]);

  function sectionHref(section: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", section);
    return `?${params.toString()}`;
  }

  function handleHorizontalGroupBlur(
    event: FocusEvent<HTMLDivElement>,
    groupLabel: string,
  ) {
    const nextFocusTarget = event.relatedTarget;
    if (
      nextFocusTarget &&
      event.currentTarget.contains(nextFocusTarget as Node)
    ) {
      return;
    }

    setHorizontalOpenGroup((value) =>
      value === groupLabel ? null : value,
    );
  }

  const sidebarVisible = layoutMode === "vertical" || layoutMode === "double";
  const activeGroup =
    groups.find((group) => group.items.some((item) => item.active)) ?? groups[0];
  const contentPaddingClass = !sidebarVisible
    ? "pl-0"
    : layoutMode === "double"
      ? collapsed
        ? "pl-[72px]"
        : "pl-[236px]"
      : collapsed
        ? "pl-[72px]"
        : "pl-[220px]";

  function renderCollapseButton() {
    return (
      <button
        aria-label={collapsed ? "展开侧边栏" : "折叠侧边栏"}
        className="absolute right-0 top-6 z-30 grid h-10 w-10 translate-x-1/2 place-items-center rounded-2xl border border-[#cfe3d3] bg-white text-[#1f8f4f] shadow-lg shadow-[#0f2418]/18 transition hover:border-[#9fc8ab] hover:bg-[#f4fbf5]"
        onClick={() => setCollapsed((value) => !value)}
        title={collapsed ? "展开侧边栏" : "折叠侧边栏"}
        type="button"
      >
        <CollapseIcon size={20} />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen bg-[#f5f8f3]",
        density === "compact" && "admin-density-compact",
      )}
      data-admin-layout-density={density}
      data-admin-layout-mode={layoutMode}
      data-admin-layout-width={width}
    >
      {layoutMode === "vertical" ? (
        <aside
        className={cn(
          "fixed inset-y-0 left-0 z-20 flex flex-col bg-[#0f2418] text-white transition-[width] duration-200",
          collapsed ? "w-[72px]" : "w-[220px]",
        )}
      >
        {renderCollapseButton()}

        <div className="flex h-20 items-center px-5">
          <div className={cn("min-w-0", collapsed && "hidden")}>
            <div className="text-xl font-semibold">{brand}</div>
            <div className="mt-1 text-sm text-white/62">蔬菜预订运营台</div>
          </div>
        </div>

        <nav
          className={cn(
            "flex-1 pb-6",
            collapsed ? "overflow-visible px-3" : "overflow-y-auto px-4",
          )}
        >
          {groups.map((group) => {
            const groupOpen = openGroups[group.label] ?? false;
            const collapsedGroupTarget = getCollapsedAdminNavGroupTarget(group);
            const renderItems = shouldRenderAdminNavItems({
              collapsed,
              groupOpen,
            });
            const GroupIcon = iconMap[group.icon];
            return (
              <div className="mb-4" key={group.label}>
                {collapsed && collapsedGroupTarget ? (
                  <div className="group/nav relative mb-1">
                    <Link
                      className={cn(
                        "flex h-11 w-full items-center justify-center rounded-xl text-white/76 transition hover:bg-white/8 hover:text-white",
                        collapsedGroupTarget.active && "bg-[#2c9858] text-white",
                      )}
                      href={sectionHref(collapsedGroupTarget.section)}
                      title={collapsedGroupTarget.title}
                    >
                      <GroupIcon size={20} />
                    </Link>
                    <div className="pointer-events-none absolute left-full top-0 z-40 ml-3 min-w-44 translate-x-1 rounded-2xl border border-[#dbe6dc] bg-white p-2 text-[#14231a] opacity-0 shadow-2xl shadow-[#0f2418]/18 transition group-hover/nav:pointer-events-auto group-hover/nav:translate-x-0 group-hover/nav:opacity-100">
                      <div className="px-3 pb-2 pt-1 text-xs font-semibold text-[#66756d]">
                        {group.label}
                      </div>
                      <div className="space-y-1">
                        {group.items.map((item) => {
                          const FlyoutIcon = iconMap[item.icon];

                          return (
                            <Link
                              className={cn(
                                "flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[#435247] transition hover:bg-[#eef8f0] hover:text-[#1f8f4f]",
                                item.active && "bg-[#1f8f4f] text-white hover:bg-[#1f8f4f] hover:text-white",
                              )}
                              href={sectionHref(item.section)}
                              key={item.section}
                            >
                              <FlyoutIcon size={15} />
                              <span className="whitespace-nowrap">{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    aria-label={`${groupOpen ? "收起" : "展开"}${group.label}菜单`}
                    className={cn(
                      "mb-1 flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-[15px] font-semibold text-[#9cc4a5] transition hover:bg-white/6 hover:text-[#c7e3cc]",
                      !group.collapsible && "cursor-default",
                    )}
                    disabled={!group.collapsible}
                    onClick={() =>
                      setOpenGroups((value) => ({
                        ...value,
                        [group.label]: !groupOpen,
                      }))
                    }
                    type="button"
                  >
                    <>
                      <GroupIcon size={17} />
                      <span className="flex-1">{group.label}</span>
                      {group.collapsible ? (
                        <ChevronDown
                          className={cn("transition", !groupOpen && "-rotate-90")}
                          size={15}
                        />
                      ) : null}
                    </>
                  </button>
                )}
                {renderItems ? (
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const ItemIcon = iconMap[item.icon];
                      return (
                        <Link
                          className={cn(
                            "flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[16px] font-medium text-white/76 transition hover:bg-white/8 hover:text-white",
                            item.active && "bg-[#2c9858] text-white",
                          )}
                          href={sectionHref(item.section)}
                          key={item.label}
                          title={item.label}
                        >
                          <ItemIcon size={18} />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </aside>
      ) : null}

      {layoutMode === "double" ? (
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-20 flex bg-[#0f2418] text-white transition-[width] duration-200",
            collapsed ? "w-[72px]" : "w-[236px]",
          )}
        >
          {renderCollapseButton()}
          <div className="flex w-[72px] shrink-0 flex-col border-r border-white/10 px-3 py-4">
            <div className="mb-5 grid h-10 w-10 place-items-center rounded-2xl bg-[#1f8f4f] text-sm font-semibold">
              {brand.slice(0, 1)}
            </div>
            <div className="space-y-2">
              {groups.map((group) => {
                const GroupIcon = iconMap[group.icon];
                const groupTarget = getCollapsedAdminNavGroupTarget(group);
                const groupActive = group.items.some((item) => item.active);

                if (!groupTarget) {
                  return null;
                }

                return (
                  <Link
                    className={cn(
                      "grid h-11 w-11 place-items-center rounded-2xl text-white/72 transition hover:bg-white/8 hover:text-white",
                      groupActive && "bg-[#2c9858] text-white",
                    )}
                    href={sectionHref(groupTarget.section)}
                    key={group.label}
                    title={group.label}
                  >
                    <GroupIcon size={20} />
                  </Link>
                );
              })}
            </div>
          </div>

          {!collapsed && activeGroup ? (
            <div className="min-w-0 flex-1 px-4 py-5">
              <div className="mb-4">
                <div className="text-base font-semibold">{activeGroup.label}</div>
                <div className="mt-1 text-xs text-white/48">当前一级菜单</div>
              </div>
              <div className="space-y-1">
                {activeGroup.items.map((item) => {
                  const ItemIcon = iconMap[item.icon];

                  return (
                    <Link
                      className={cn(
                        "flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-white/72 transition hover:bg-white/8 hover:text-white",
                        item.active && "bg-[#2c9858] text-white",
                      )}
                      href={sectionHref(item.section)}
                      key={item.section}
                      title={item.label}
                    >
                      <ItemIcon size={16} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </aside>
      ) : null}

      {layoutMode === "horizontal" ? (
        <div className="sticky top-0 z-20 border-b border-[#dbe6dc] bg-white shadow-sm">
          <nav className="flex h-14 items-center gap-4 px-6">
            <div className="mr-2 text-base font-semibold text-[#10251a]">
              {brand}
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-visible">
              {groups.map((group) => {
                const GroupIcon = iconMap[group.icon];
                const groupTarget = getCollapsedAdminNavGroupTarget(group);
                const groupActive = group.items.some((item) => item.active);
                const horizontalMenuOpen = horizontalOpenGroup === group.label;

                if (!groupTarget) {
                  return null;
                }

                return (
                  <div
                    className="relative shrink-0"
                    key={group.label}
                    onBlur={(event) =>
                      handleHorizontalGroupBlur(event, group.label)
                    }
                    onFocus={() => setHorizontalOpenGroup(group.label)}
                    onMouseEnter={() => setHorizontalOpenGroup(group.label)}
                    onMouseLeave={() => setHorizontalOpenGroup(null)}
                  >
                    <Link
                      aria-expanded={horizontalMenuOpen}
                      aria-haspopup="menu"
                      className={cn(
                        "flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[#405248] transition hover:bg-[#eef8f0] hover:text-[#1f8f4f]",
                        groupActive && "bg-[#e8f6ed] text-[#1f8f4f]",
                      )}
                      href={sectionHref(groupTarget.section)}
                      onClick={() => setHorizontalOpenGroup(null)}
                      title={group.label}
                    >
                      <GroupIcon size={16} />
                      <span className="whitespace-nowrap">{group.label}</span>
                      {group.items.length > 0 ? (
                        <ChevronDown
                          className={cn(
                            "text-[#8a9a91] transition",
                            horizontalMenuOpen && "rotate-180",
                          )}
                          size={14}
                        />
                      ) : null}
                    </Link>
                    <div
                      className={cn(
                        "absolute left-0 top-full z-50 min-w-48 pt-2 transition",
                        horizontalMenuOpen
                          ? "pointer-events-auto translate-y-0 opacity-100"
                          : "pointer-events-none translate-y-1 opacity-0",
                      )}
                    >
                      <div
                        className="rounded-2xl border border-[#dbe6dc] bg-white p-2 text-[#14231a] shadow-2xl shadow-[#0f2418]/16"
                        role="menu"
                      >
                        <div className="px-3 pb-2 pt-1 text-xs font-semibold text-[#7a8a81]">
                          {group.label}
                        </div>
                        <div className="space-y-1">
                          {group.items.map((item) => {
                            const ItemIcon = iconMap[item.icon];

                            return (
                              <Link
                                className={cn(
                                  "flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[#435247] transition hover:bg-[#eef8f0] hover:text-[#1f8f4f]",
                                  item.active &&
                                    "bg-[#1f8f4f] text-white hover:bg-[#1f8f4f] hover:text-white",
                                )}
                                href={sectionHref(item.section)}
                                key={item.section}
                                onClick={() => setHorizontalOpenGroup(null)}
                                role="menuitem"
                                title={item.label}
                              >
                                <ItemIcon size={15} />
                                <span className="whitespace-nowrap">{item.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {topBarActions ? (
              <div className="admin-shell-top-actions flex shrink-0 items-center gap-3">
                {topBarActions}
              </div>
            ) : null}
          </nav>
        </div>
      ) : null}

      <div
        className={cn(
          "min-h-screen transition-[padding-left] duration-200",
          contentPaddingClass,
        )}
      >
        <div
          className={cn(
            "min-h-screen transition-[max-width] duration-200",
            width === "contained" && "mx-auto max-w-[1500px]",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
