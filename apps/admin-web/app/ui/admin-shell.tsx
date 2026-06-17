"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import {
  Boxes,
  Building2,
  ChevronDown,
  ClipboardList,
  FileClock,
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

const iconMap: Record<AdminNavIcon, ComponentType<LucideProps>> = {
  boxes: Boxes,
  building: Building2,
  clipboard: ClipboardList,
  dashboard: LayoutDashboard,
  "file-clock": FileClock,
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
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    系统管理: true,
  });
  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <div className="min-h-screen bg-[#f5f8f3]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-20 flex flex-col bg-[#0f2418] text-white transition-[width] duration-200",
          collapsed ? "w-[84px]" : "w-[260px]",
        )}
      >
        <div className="flex h-20 items-center justify-between px-5">
          <div className={cn("min-w-0", collapsed && "hidden")}>
            <div className="text-xl font-semibold">{brand}</div>
            <div className="mt-1 text-sm text-white/62">蔬菜预订运营台</div>
          </div>
          <button
            aria-label="折叠菜单"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/12 bg-white/6 text-white/90 transition hover:bg-white/12"
            onClick={() => setCollapsed((value) => !value)}
            type="button"
          >
            <CollapseIcon size={20} />
          </button>
        </div>

        <nav className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6">
          {groups.map((group) => {
            const groupOpen = openGroups[group.label] ?? true;
            return (
              <div className="mb-4" key={group.label}>
                <button
                  className={cn(
                    "mb-1 flex h-9 w-full items-center rounded-lg px-3 text-left text-[15px] font-semibold text-[#9cc4a5]",
                    collapsed && "justify-center px-0",
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
                  {collapsed ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#9cc4a5]" />
                  ) : (
                    <>
                      <span className="flex-1">{group.label}</span>
                      {group.collapsible ? (
                        <ChevronDown
                          className={cn("transition", !groupOpen && "-rotate-90")}
                          size={15}
                        />
                      ) : null}
                    </>
                  )}
                </button>
                {groupOpen ? (
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const ItemIcon = iconMap[item.icon];
                      return (
                        <button
                          className={cn(
                            "flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[16px] font-medium text-white/76 transition hover:bg-white/8 hover:text-white",
                            item.active && "bg-[#2c9858] text-white",
                            collapsed && "justify-center px-0",
                          )}
                          key={item.label}
                          title={item.label}
                          type="button"
                        >
                          <ItemIcon size={18} />
                          <span className={cn("truncate", collapsed && "hidden")}>
                            {item.label}
                          </span>
                        </button>
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
          collapsed ? "pl-[84px]" : "pl-[260px]",
        )}
      >
        {children}
      </div>
    </div>
  );
}
