"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
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
  MoreHorizontal,
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

import {
  adminSectionHref,
  type AdminNavGroup,
  type AdminNavIcon,
} from "@/app/lib/admin-navigation";
import { cn } from "@/app/lib/cn";

import { AdminCollapsedFlyout } from "./admin-collapsed-flyout";
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

const HORIZONTAL_VISIBLE_GROUP_LIMIT = 5;
const HORIZONTAL_MORE_BUTTON_WIDTH = 96;
const COLLAPSED_FLYOUT_GAP = 12;
const COLLAPSED_FLYOUT_CLOSE_DELAY = 120;
const SIDEBAR_MOTION_DURATION = 0.14;
const SIDEBAR_MOTION_EASE = [0.16, 1, 0.3, 1] as const;

type CollapsedFlyoutState = {
  anchorLeft: number;
  anchorTop: number;
  label: string;
};

function estimateHorizontalGroupWidth(group: AdminNavGroup) {
  const textWidth = Math.max(group.label.length, 2) * 16;
  const submenuWidth = group.items.length > 0 ? 22 : 0;
  return 46 + textWidth + submenuWidth;
}

function getHorizontalVisibleGroupLimit(
  groups: AdminNavGroup[],
  availableWidth: number,
) {
  if (groups.length === 0) {
    return 0;
  }

  if (availableWidth <= 0) {
    return Math.min(groups.length, HORIZONTAL_VISIBLE_GROUP_LIMIT);
  }

  let usedWidth = 0;
  let visibleCount = 0;

  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    if (!group) {
      continue;
    }

    const nextWidth = usedWidth + estimateHorizontalGroupWidth(group);
    const remainingCount = groups.length - index - 1;
    const reservedOverflowWidth =
      remainingCount > 0 ? HORIZONTAL_MORE_BUTTON_WIDTH : 0;

    if (nextWidth + reservedOverflowWidth <= availableWidth || visibleCount === 0) {
      usedWidth = nextWidth;
      visibleCount += 1;
      continue;
    }

    break;
  }

  return Math.min(groups.length, Math.max(1, visibleCount));
}

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
  const [collapsedFlyout, setCollapsedFlyout] =
    useState<CollapsedFlyoutState | null>(null);
  const [horizontalVisibleLimit, setHorizontalVisibleLimit] = useState(
    HORIZONTAL_VISIBLE_GROUP_LIMIT,
  );
  const horizontalNavListRef = useRef<HTMLDivElement | null>(null);
  const collapsedCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const collapsedOpenGroup = collapsedFlyout?.label ?? null;

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

  useEffect(() => {
    if (!collapsed || layoutMode !== "vertical") {
      setCollapsedFlyout(null);
    }
  }, [collapsed, layoutMode]);

  useEffect(
    () => () => {
      if (collapsedCloseTimerRef.current) {
        clearTimeout(collapsedCloseTimerRef.current);
      }
    },
    [],
  );

  function sectionHref(section: string) {
    return adminSectionHref(searchParams, section);
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

  function cancelCollapsedGroupClose() {
    if (!collapsedCloseTimerRef.current) {
      return;
    }

    clearTimeout(collapsedCloseTimerRef.current);
    collapsedCloseTimerRef.current = null;
  }

  function closeCollapsedGroup() {
    cancelCollapsedGroupClose();
    setCollapsedFlyout(null);
  }

  function scheduleCollapsedGroupClose() {
    cancelCollapsedGroupClose();
    collapsedCloseTimerRef.current = setTimeout(() => {
      setCollapsedFlyout(null);
      collapsedCloseTimerRef.current = null;
    }, COLLAPSED_FLYOUT_CLOSE_DELAY);
  }

  function openCollapsedGroup(
    event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>,
    groupLabel: string,
  ) {
    cancelCollapsedGroupClose();
    const trigger = event.currentTarget.getBoundingClientRect();
    setCollapsedFlyout({
      anchorLeft: trigger.right + COLLAPSED_FLYOUT_GAP,
      anchorTop: trigger.top,
      label: groupLabel,
    });
  }

  function handleHorizontalTriggerKeyDown(
    event: KeyboardEvent<HTMLElement>,
    groupLabel: string,
  ) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHorizontalOpenGroup(groupLabel);
      return;
    }

    if (event.key === "Escape") {
      setHorizontalOpenGroup(null);
    }
  }

  const sidebarVisible = layoutMode === "vertical" || layoutMode === "double";
  const activeGroup =
    groups.find((group) => group.items.some((item) => item.active)) ?? groups[0];
  const activeCollapsedGroup = groups.find(
    (group) => group.label === collapsedOpenGroup,
  );
  const horizontalEligibleGroups = useMemo(
    () =>
      groups.filter((group) =>
        Boolean(getCollapsedAdminNavGroupTarget(group)),
      ),
    [groups],
  );
  useEffect(() => {
    if (layoutMode !== "horizontal") {
      return;
    }

    const element = horizontalNavListRef.current;
    if (!element) {
      return;
    }

    const updateLimit = () => {
      setHorizontalVisibleLimit(
        getHorizontalVisibleGroupLimit(
          horizontalEligibleGroups,
          element.getBoundingClientRect().width,
        ),
      );
    };

    updateLimit();

    if (typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(updateLimit);
      resizeObserver.observe(element);
      return () => resizeObserver.disconnect();
    }

    window.addEventListener("resize", updateLimit);
    return () => window.removeEventListener("resize", updateLimit);
  }, [horizontalEligibleGroups, layoutMode]);

  const preferredHorizontalGroups = horizontalEligibleGroups.slice(
    0,
    horizontalVisibleLimit,
  );
  const activeHorizontalGroup = horizontalEligibleGroups.find((group) =>
    group.items.some((item) => item.active),
  );
  const horizontalVisibleGroups =
    activeHorizontalGroup &&
    !preferredHorizontalGroups.some((group) => group.label === activeHorizontalGroup.label)
      ? [
          ...preferredHorizontalGroups.slice(0, Math.max(horizontalVisibleLimit - 1, 1)),
          activeHorizontalGroup,
        ]
      : preferredHorizontalGroups;
  const horizontalVisibleGroupLabels = new Set(
    horizontalVisibleGroups.map((group) => group.label),
  );
  const horizontalOverflowGroups = horizontalEligibleGroups.filter(
    (group) => !horizontalVisibleGroupLabels.has(group.label),
  );
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
        onClick={() => {
          closeCollapsedGroup();
          setCollapsed((value) => !value);
        }}
        title={collapsed ? "展开侧边栏" : "折叠侧边栏"}
        type="button"
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.span
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            className="grid place-items-center"
            exit={{ opacity: 0, rotate: collapsed ? -18 : 18, scale: 0.82 }}
            initial={{ opacity: 0, rotate: collapsed ? 18 : -18, scale: 0.82 }}
            key={collapsed ? "expand" : "collapse"}
            transition={{ duration: 0.12, ease: SIDEBAR_MOTION_EASE }}
          >
            <CollapseIcon size={20} />
          </motion.span>
        </AnimatePresence>
      </button>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={cn(
          "min-h-screen bg-[#f5f8f3]",
          density === "compact" && "admin-density-compact",
        )}
        data-admin-layout-density={density}
        data-admin-layout-mode={layoutMode}
        data-admin-layout-width={width}
        onKeyDown={(event) => event.key === "Escape" && closeCollapsedGroup()}
      >
      {layoutMode === "vertical" ? (
        <motion.aside
        animate={{ width: collapsed ? 72 : 220 }}
        className={cn(
          "fixed inset-y-0 left-0 z-20 flex flex-col bg-[#0f2418] text-white",
          collapsed ? "w-[72px]" : "w-[220px]",
        )}
        initial={false}
        transition={{ duration: SIDEBAR_MOTION_DURATION, ease: SIDEBAR_MOTION_EASE }}
      >
        {renderCollapseButton()}

        <div className="flex h-full min-w-0 flex-col overflow-hidden">

        <div className="flex h-20 w-[220px] shrink-0 items-center overflow-hidden px-5">
          <AnimatePresence initial={false}>
            {!collapsed ? (
              <motion.div
                animate={{ opacity: 1, x: 0 }}
                className="min-w-0 whitespace-nowrap"
                exit={{ opacity: 0, x: -8 }}
                initial={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.1, ease: SIDEBAR_MOTION_EASE }}
              >
                <div className="text-xl font-semibold">{brand}</div>
                <div className="mt-1 text-sm text-white/62">蔬菜预订运营台</div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <nav
          className={cn(
            "flex-1 shrink-0 overflow-y-auto pb-6",
            collapsed ? "w-[72px] px-3" : "w-[220px] px-4",
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
                  <div
                    className="relative mb-1"
                    onBlur={scheduleCollapsedGroupClose}
                    onFocus={(event) => openCollapsedGroup(event, group.label)}
                    onMouseEnter={(event) =>
                      openCollapsedGroup(event, group.label)
                    }
                    onMouseLeave={scheduleCollapsedGroupClose}
                  >
                    <Link
                      className={cn(
                        "flex h-11 w-full items-center justify-center rounded-xl text-white/76 transition hover:bg-white/8 hover:text-white",
                        collapsedGroupTarget.active && "bg-[#2c9858] text-white",
                      )}
                      href={sectionHref(collapsedGroupTarget.section)}
                      onClick={closeCollapsedGroup}
                      title={collapsedGroupTarget.title}
                    >
                      <GroupIcon size={20} />
                    </Link>
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
                      <span className="flex-1 whitespace-nowrap">{group.label}</span>
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
        </div>
      </motion.aside>
      ) : null}

      <AnimatePresence initial={false} mode="wait">
        {layoutMode === "vertical" &&
        collapsed &&
        collapsedFlyout &&
        activeCollapsedGroup ? (
          <AdminCollapsedFlyout
            anchorLeft={collapsedFlyout.anchorLeft}
            anchorTop={collapsedFlyout.anchorTop}
            key={activeCollapsedGroup.label}
            label={activeCollapsedGroup.label}
            onBlur={scheduleCollapsedGroupClose}
            onFocus={cancelCollapsedGroupClose}
            onMouseEnter={cancelCollapsedGroupClose}
            onMouseLeave={scheduleCollapsedGroupClose}
          >
            {activeCollapsedGroup.items.map((item) => {
              const FlyoutIcon = iconMap[item.icon];

              return (
                <Link
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[#435247] transition hover:bg-[#eef8f0] hover:text-[#1f8f4f]",
                    item.active &&
                      "bg-[#1f8f4f] text-white hover:bg-[#1f8f4f] hover:text-white",
                  )}
                  href={sectionHref(item.section)}
                  key={item.section}
                  onClick={closeCollapsedGroup}
                  role="menuitem"
                >
                  <FlyoutIcon size={15} />
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </AdminCollapsedFlyout>
        ) : null}
      </AnimatePresence>

      {layoutMode === "double" ? (
        <motion.aside
          animate={{ width: collapsed ? 72 : 236 }}
          className={cn(
            "fixed inset-y-0 left-0 z-20 flex bg-[#0f2418] text-white",
            collapsed ? "w-[72px]" : "w-[236px]",
          )}
          initial={false}
          transition={{ duration: SIDEBAR_MOTION_DURATION, ease: SIDEBAR_MOTION_EASE }}
        >
          {renderCollapseButton()}
          <div className="flex h-full overflow-hidden">
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
            <div className="w-[164px] shrink-0 whitespace-nowrap px-4 py-5">
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
          </div>
        </motion.aside>
      ) : null}

      {layoutMode === "horizontal" ? (
        <div className="sticky top-0 z-20 border-b border-[#dbe6dc] bg-white shadow-sm dark:border-[#1f3a28] dark:bg-[#07130c]">
          <nav className="flex h-14 items-center gap-4 px-6">
            <div className="mr-2 text-base font-semibold text-[#10251a]">
              {brand}
            </div>
            <div
              className="flex min-w-0 flex-1 items-center gap-1 overflow-visible"
              ref={horizontalNavListRef}
            >
              {horizontalVisibleGroups.map((group) => {
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
                      onKeyDown={(event) =>
                        handleHorizontalTriggerKeyDown(event, group.label)
                      }
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
              {horizontalOverflowGroups.length > 0 ? (
                <div
                  className="relative shrink-0"
                  onBlur={(event) => handleHorizontalGroupBlur(event, "更多")}
                  onMouseEnter={() => setHorizontalOpenGroup("更多")}
                  onMouseLeave={() => setHorizontalOpenGroup(null)}
                >
                  <button
                    aria-expanded={horizontalOpenGroup === "更多"}
                    aria-haspopup="menu"
                    className={cn(
                      "flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[#405248] transition hover:bg-[#eef8f0] hover:text-[#1f8f4f]",
                      horizontalOverflowGroups.some((group) =>
                        group.items.some((item) => item.active),
                      ) && "bg-[#e8f6ed] text-[#1f8f4f]",
                    )}
                    onClick={() =>
                      setHorizontalOpenGroup((value) =>
                        value === "更多" ? null : "更多",
                      )
                    }
                    onKeyDown={(event) =>
                      handleHorizontalTriggerKeyDown(event, "更多")
                    }
                    title="更多菜单"
                    type="button"
                  >
                    <MoreHorizontal size={16} />
                    <span className="whitespace-nowrap">更多</span>
                    <ChevronDown
                      className={cn(
                        "text-[#8a9a91] transition",
                        horizontalOpenGroup === "更多" && "rotate-180",
                      )}
                      size={14}
                    />
                  </button>
                  <div
                    className={cn(
                      "absolute right-0 top-full z-50 min-w-56 pt-2 transition",
                      horizontalOpenGroup === "更多"
                        ? "pointer-events-auto translate-y-0 opacity-100"
                        : "pointer-events-none translate-y-1 opacity-0",
                    )}
                  >
                    <div
                      className="max-h-[70vh] overflow-y-auto rounded-2xl border border-[#dbe6dc] bg-white p-2 text-[#14231a] shadow-2xl shadow-[#0f2418]/16"
                      role="menu"
                    >
                      <div className="px-3 pb-2 pt-1 text-xs font-semibold text-[#7a8a81]">
                        更多菜单
                      </div>
                      <div className="space-y-2">
                        {horizontalOverflowGroups.map((group) => {
                          const GroupIcon = iconMap[group.icon];
                          const groupActive = group.items.some((item) => item.active);

                          return (
                            <div className="rounded-xl bg-[#f8fbf7] p-1" key={group.label}>
                              <div
                                className={cn(
                                  "flex h-8 items-center gap-2 px-2 text-xs font-semibold text-[#6f8076]",
                                  groupActive && "text-[#1f8f4f]",
                                )}
                              >
                                <GroupIcon size={14} />
                                <span className="min-w-0 flex-1 truncate">{group.label}</span>
                              </div>
                              <div className="space-y-1">
                                {group.items.map((item) => {
                                  const ItemIcon = iconMap[item.icon];

                                  return (
                                    <Link
                                      className={cn(
                                        "flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#435247] transition hover:bg-[#eef8f0] hover:text-[#1f8f4f]",
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
                                      <span className="min-w-0 flex-1 truncate">
                                        {item.label}
                                      </span>
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
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
          "min-h-screen transition-[padding-left] duration-[140ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
          contentPaddingClass,
        )}
      >
        <div
          className={cn(
            "min-h-screen transition-[max-width] duration-200",
            width === "contained" && "mx-auto max-w-[1500px]",
          )}
        >
          {layoutMode !== "horizontal" &&
          layoutMode !== "content-full" &&
          topBarActions ? (
            <div className="admin-shell-toolbar sticky top-0 z-10 border-b border-[#dbe6dc] bg-white/95 px-7 py-3 shadow-sm backdrop-blur dark:border-[#1f3a28] dark:bg-[#07130c]/95">
              <div className="admin-shell-toolbar-actions flex min-h-14 items-center justify-end gap-3">
                {topBarActions}
              </div>
            </div>
          ) : null}
          {children}
        </div>
      </div>
      </div>
    </MotionConfig>
  );
}
