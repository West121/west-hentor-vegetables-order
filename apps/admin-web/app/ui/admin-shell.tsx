"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
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
  Settings,
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
  readAdminShellPreferences,
  writeAdminShellPreferences,
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
};

export function AdminShell({
  brand,
  groups,
  children,
}: AdminShellProps) {
  const searchParams = useSearchParams();
  const defaultOpenGroups = getDefaultOpenAdminNavGroups(groups);
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] =
    useState<Record<string, boolean>>(defaultOpenGroups);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  useEffect(() => {
    const preferences = readAdminShellPreferences(window.localStorage, {
      openGroups: defaultOpenGroups,
    });

    setCollapsed(preferences.collapsed);
    setOpenGroups(preferences.openGroups);
    setPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) {
      return;
    }

    writeAdminShellPreferences(window.localStorage, {
      collapsed,
      openGroups,
    });
  }, [collapsed, openGroups, preferencesLoaded]);

  function sectionHref(section: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", section);
    return `?${params.toString()}`;
  }

  return (
    <div className="min-h-screen bg-[#f5f8f3]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-20 flex flex-col bg-[#0f2418] text-white transition-[width] duration-200",
          collapsed ? "w-[72px]" : "w-[220px]",
        )}
      >
        <button
          aria-label={collapsed ? "展开侧边栏" : "折叠侧边栏"}
          className="absolute right-0 top-6 z-30 grid h-10 w-10 translate-x-1/2 place-items-center rounded-2xl border border-[#cfe3d3] bg-white text-[#1f8f4f] shadow-lg shadow-[#0f2418]/18 transition hover:border-[#9fc8ab] hover:bg-[#f4fbf5]"
          onClick={() => setCollapsed((value) => !value)}
          title={collapsed ? "展开侧边栏" : "折叠侧边栏"}
          type="button"
        >
          <CollapseIcon size={20} />
        </button>

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

      <div
        className={cn(
          "min-h-screen transition-[padding-left] duration-200",
          collapsed ? "pl-[72px]" : "pl-[220px]",
        )}
      >
        {children}
      </div>
    </div>
  );
}
