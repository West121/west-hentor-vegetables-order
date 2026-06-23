"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  ChevronDown,
  ClipboardList,
  LogOut,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/app/lib/cn";

import {
  buildAdminUserMenuItems,
  type AdminUserMenuItemKey,
} from "./admin-user-menu-model";

const menuIconMap: Record<AdminUserMenuItemKey, LucideIcon> = {
  logout: LogOut,
  "operation-logs": ClipboardList,
  profile: UserRound,
  "role-switch": UsersRound,
};

type AdminUserMenuProps = {
  canOpenOperationLogs: boolean;
  name: string;
  roles: string;
  scopeLabel: string;
};

type ActivePanel = "profile" | "roles";

export function AdminUserMenu({
  canOpenOperationLogs,
  name,
  roles,
  scopeLabel,
}: AdminUserMenuProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel | null>(null);
  const items = buildAdminUserMenuItems({ canOpenOperationLogs });
  const initial = name.slice(0, 1).toUpperCase();
  const roleList = roles
    .split(/[、,，/]/)
    .map((role) => role.trim())
    .filter(Boolean);

  function sectionHref(section: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", section);
    return `?${params.toString()}`;
  }

  async function logout() {
    await Promise.allSettled([
      fetch("/api/admin/auth/logout", { method: "POST" }),
      fetch("/api/local-admin/auth/logout", { method: "POST" }),
    ]);
    router.replace("/login");
    router.refresh();
  }

  function openPanel(panel: ActivePanel) {
    setOpen(false);
    setActivePanel(panel);
  }

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex min-w-64 items-center gap-3 rounded-2xl border border-[#dbe6dc] bg-[#f8fbf7] px-4 py-2 text-left transition hover:border-[#b9d0bf] hover:bg-white"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <div className="grid h-10 w-10 place-items-center rounded-full bg-[#1f8f4f] text-sm font-semibold text-white">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{name}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#66756d]">
            <ShieldCheck size={13} />
            <span className="truncate">
              {roles} · {scopeLabel}
            </span>
          </div>
        </div>
        <ChevronDown
          className={cn("text-[#66756d] transition", open && "rotate-180")}
          size={17}
        />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-30 w-72 overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-xl shadow-[#14351d]/10"
          role="menu"
        >
          <div className="border-b border-[#e5eee6] px-4 py-3">
            <div className="truncate text-sm font-semibold text-[#14231a]">
              {name}
            </div>
            <div className="mt-1 text-xs text-[#66756d]">
              {roles} · {scopeLabel}
            </div>
          </div>
          <div className="p-2">
            {items.map((item) => {
              const ItemIcon = menuIconMap[item.key];
              const content = (
                <>
                  <ItemIcon size={16} />
                  <span className="flex-1">{item.label}</span>
                  {item.helper ? (
                    <span className="text-xs text-[#8b9a91]">{item.helper}</span>
                  ) : null}
                </>
              );
              const itemClassName = cn(
                "flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-[#26352c] transition",
                item.disabled
                  ? "cursor-not-allowed text-[#8b9a91]"
                  : "hover:bg-[#edf6ef] hover:text-[#0f6d38]",
              );

              if (item.key === "logout") {
                return (
                  <button
                    className={cn(
                      itemClassName,
                      "mt-1 border-t border-[#edf1ee] pt-3 text-[#9b312e] hover:bg-[#fff1ef] hover:text-[#9b312e]",
                    )}
                    key={item.key}
                    onClick={() => void logout()}
                    role="menuitem"
                    type="button"
                  >
                    {content}
                  </button>
                );
              }

              if (item.key === "operation-logs" && !item.disabled) {
                return (
                  <Link
                    className={itemClassName}
                    href={sectionHref("operation-logs")}
                    key={item.key}
                    onClick={() => setOpen(false)}
                    role="menuitem"
                  >
                    {content}
                  </Link>
                );
              }

              if (item.key === "profile") {
                return (
                  <button
                    className={itemClassName}
                    key={item.key}
                    onClick={() => openPanel("profile")}
                    role="menuitem"
                    type="button"
                  >
                    {content}
                  </button>
                );
              }

              if (item.key === "role-switch") {
                return (
                  <button
                    className={itemClassName}
                    key={item.key}
                    onClick={() => openPanel("roles")}
                    role="menuitem"
                    type="button"
                  >
                    {content}
                  </button>
                );
              }

              return (
                <button
                  className={itemClassName}
                  disabled={item.disabled}
                  key={item.key}
                  role="menuitem"
                  type="button"
                >
                  {content}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {activePanel ? (
        <div
          className="fixed inset-0 z-40 bg-[#0f2418]/20"
          onClick={() => setActivePanel(null)}
        >
          <div
            aria-label={activePanel === "profile" ? "账号资料" : "角色范围"}
            className="absolute right-7 top-20 w-[380px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-2xl shadow-[#14351d]/15"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-center justify-between border-b border-[#e5eee6] px-5 py-4">
              <div>
                <div className="text-base font-semibold text-[#14231a]">
                  {activePanel === "profile" ? "账号资料" : "角色范围"}
                </div>
                <div className="mt-1 text-xs text-[#66756d]">
                  来自当前真实登录会话
                </div>
              </div>
              <button
                className="grid h-8 w-8 place-items-center rounded-xl border border-red-100 bg-red-50 text-red-600"
                onClick={() => setActivePanel(null)}
                title="关闭"
                type="button"
              >
                <X size={16} />
              </button>
            </div>

            {activePanel === "profile" ? (
              <div className="space-y-4 p-5">
                <div className="flex items-center gap-3 rounded-2xl bg-[#f8fbf7] p-4">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-[#1f8f4f] text-base font-semibold text-white">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-[#14231a]">
                      {name}
                    </div>
                    <div className="mt-1 text-sm text-[#66756d]">{scopeLabel}</div>
                  </div>
                </div>
                <div className="grid gap-3 text-sm">
                  <div className="rounded-xl border border-[#dbe6dc] px-4 py-3">
                    <div className="text-[#66756d]">当前角色</div>
                    <div className="mt-1 font-medium text-[#14231a]">{roles}</div>
                  </div>
                  <div className="rounded-xl border border-[#dbe6dc] px-4 py-3">
                    <div className="text-[#66756d]">数据范围</div>
                    <div className="mt-1 font-medium text-[#14231a]">
                      {scopeLabel}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {activePanel === "roles" ? (
              <div className="space-y-4 p-5">
                <div className="rounded-2xl border border-[#cfe3d3] bg-[#f8fff8] p-4">
                  <div className="text-sm font-semibold text-[#14231a]">
                    当前账号已启用角色
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(roleList.length ? roleList : [roles]).map((role) => (
                      <span
                        className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-[#1f8f4f] ring-1 ring-[#cfe3d3]"
                        key={role}
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-[#dbe6dc] px-4 py-3 text-sm leading-6 text-[#66756d]">
                  当前版本按后台账号聚合权限执行操作。后续如果启用单角色会话，
                  这个入口可以直接承接角色切换。
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
