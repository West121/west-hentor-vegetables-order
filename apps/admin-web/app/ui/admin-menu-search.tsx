"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  Boxes,
  Building2,
  ChevronRight,
  ClipboardList,
  FileClock,
  FolderTree,
  LayoutDashboard,
  Package,
  Search,
  Settings,
  ShieldCheck,
  Store,
  Truck,
  UserRound,
  UsersRound,
  X,
  type LucideProps,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
} from "react";

import type { AdminNavGroup, AdminNavIcon } from "@/app/lib/admin-navigation";
import { cn } from "@/app/lib/cn";

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

type AdminMenuSearchProps = {
  groups: AdminNavGroup[];
};

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

export function AdminMenuSearch({ groups }: AdminMenuSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredGroups = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);

    return groups
      .map((group) => {
        const groupMatched = normalizeSearchText(group.label).includes(
          normalizedQuery,
        );
        const items = group.items.filter((item) => {
          const searchable = `${group.label} ${item.label} ${item.section}`;
          return (
            !normalizedQuery ||
            groupMatched ||
            normalizeSearchText(searchable).includes(normalizedQuery)
          );
        });

        return { ...group, items };
      })
      .filter((group) => group.items.length > 0);
  }, [groups, query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function sectionHref(section: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", section);
    return `?${params.toString()}`;
  }

  function navigateTo(section: string) {
    router.push(sectionHref(section));
    setOpen(false);
    setQuery("");
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      const firstItem = filteredGroups[0]?.items[0];
      if (firstItem) {
        navigateTo(firstItem.section);
      }
    }
  }

  return (
    <>
      <button
        className="flex h-10 w-[268px] items-center gap-2 rounded-lg border border-[#dbe6dc] bg-[#f8fbf7] px-4 text-left text-sm text-[#7f9086] transition hover:border-[#b8d3bf] hover:bg-white"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Search className="shrink-0 text-[#66756d]" size={16} />
        <span className="min-w-0 flex-1 truncate">搜索菜单 / 功能</span>
        <span className="rounded-md border border-[#dbe6dc] bg-white px-1.5 py-0.5 text-[11px] font-semibold text-[#7f9086]">
          ⌘K
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] bg-[#0f2418]/35 px-4 pt-24">
          <div
            className="absolute inset-0"
            onClick={() => setOpen(false)}
            role="presentation"
          />
          <div
            aria-modal="true"
            className="relative mx-auto max-h-[68vh] w-[560px] max-w-full overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-2xl shadow-[#0f2418]/20"
            role="dialog"
          >
            <div className="flex h-12 items-center gap-3 border-b border-[#dbe6dc] px-4">
              <Search className="shrink-0 text-[#66756d]" size={17} />
              <input
                className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#8a9a90]"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="搜索菜单，例如：订单、会员、日志"
                ref={inputRef}
                value={query}
              />
              <button
                aria-label="关闭菜单搜索"
                className="grid h-8 w-8 place-items-center rounded-lg text-[#66756d] transition hover:bg-[#f3f7f1] hover:text-[#10251a]"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X size={17} />
              </button>
            </div>

            <div className="max-h-[calc(68vh-48px)] overflow-y-auto p-2">
              {filteredGroups.length ? (
                filteredGroups.map((group) => {
                  const GroupIcon = iconMap[group.icon];

                  return (
                    <div className="py-2" key={group.label}>
                      <div className="mb-1 flex items-center gap-2 px-3 text-xs font-semibold text-[#66756d]">
                        <GroupIcon size={14} />
                        <span>{group.label}</span>
                      </div>
                      <div className="space-y-1">
                        {group.items.map((item) => {
                          const ItemIcon = iconMap[item.icon];

                          return (
                            <button
                              className={cn(
                                "flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left transition hover:bg-[#eef8f0]",
                                item.active && "bg-[#eef8f0]",
                              )}
                              key={item.section}
                              onClick={() => navigateTo(item.section)}
                              type="button"
                            >
                              <ItemIcon
                                className="shrink-0 text-[#1f8f4f]"
                                size={17}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-[#10251a]">
                                  {item.label}
                                </span>
                                <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-[#66756d]">
                                  <span>{group.label}</span>
                                  <ChevronRight size={12} />
                                  <span>{item.label}</span>
                                </span>
                              </span>
                              <ChevronRight
                                className="shrink-0 text-[#9aaba1]"
                                size={16}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-10 text-center text-sm text-[#66756d]">
                  没有匹配的菜单
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
