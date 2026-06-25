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
  Settings2,
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
  "settings-2": Settings2,
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
  const resultRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const searchGroups = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    let resultIndex = 0;

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
        const results = items.map((item) => ({
          groupLabel: group.label,
          index: resultIndex++,
          item,
        }));

        return { ...group, results };
      })
      .filter((group) => group.results.length > 0);
  }, [groups, query]);

  const searchResults = useMemo(
    () => searchGroups.flatMap((group) => group.results),
    [searchGroups],
  );

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
    if (!open) {
      setActiveIndex(-1);
      return;
    }

    setActiveIndex(searchResults.length ? 0 : -1);
  }, [open, query, searchResults.length]);

  useEffect(() => {
    if (!open || activeIndex < 0) {
      return;
    }

    resultRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

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

  function moveActiveResult(direction: 1 | -1) {
    if (!searchResults.length) {
      return;
    }

    setActiveIndex((currentIndex) => {
      if (currentIndex < 0) {
        return direction > 0 ? 0 : searchResults.length - 1;
      }

      return (
        (currentIndex + direction + searchResults.length) % searchResults.length
      );
    });
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActiveResult(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveResult(-1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(searchResults.length ? 0 : -1);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(searchResults.length - 1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const activeResult = searchResults[activeIndex] ?? searchResults[0];
      if (activeResult) {
        navigateTo(activeResult.item.section);
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
                aria-activedescendant={
                  activeIndex >= 0
                    ? `admin-menu-search-result-${activeIndex}`
                    : undefined
                }
                aria-controls="admin-menu-search-results"
                aria-expanded={open}
                aria-autocomplete="list"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="搜索菜单，例如：订单、会员、日志"
                ref={inputRef}
                role="combobox"
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

            <div
              className="max-h-[calc(68vh-48px)] overflow-y-auto p-2"
              aria-label="菜单搜索结果"
              id="admin-menu-search-results"
              role="listbox"
            >
              {searchGroups.length ? (
                searchGroups.map((group) => {
                  const GroupIcon = iconMap[group.icon];

                  return (
                    <div className="py-2" key={group.label}>
                      <div className="mb-1 flex items-center gap-2 px-3 text-xs font-semibold text-[#66756d]">
                        <GroupIcon size={14} />
                        <span>{group.label}</span>
                      </div>
                      <div className="space-y-1">
                        {group.results.map((result) => {
                          const ItemIcon = iconMap[result.item.icon];
                          const highlighted = result.index === activeIndex;

                          return (
                            <button
                              aria-selected={highlighted}
                              className={cn(
                                "flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left transition hover:bg-[#eef8f0]",
                                result.item.active && "bg-[#f3f7f1]",
                                highlighted &&
                                  "bg-[#e7f5e9] ring-1 ring-[#a6d4ad]",
                              )}
                              id={`admin-menu-search-result-${result.index}`}
                              key={result.item.section}
                              onClick={() => navigateTo(result.item.section)}
                              onMouseEnter={() => setActiveIndex(result.index)}
                              ref={(node) => {
                                resultRefs.current[result.index] = node;
                              }}
                              role="option"
                              type="button"
                            >
                              <ItemIcon
                                className="shrink-0 text-[#1f8f4f]"
                                size={17}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-[#10251a]">
                                  {result.item.label}
                                </span>
                                <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-[#66756d]">
                                  <span>{result.groupLabel}</span>
                                  <ChevronRight size={12} />
                                  <span>{result.item.label}</span>
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
