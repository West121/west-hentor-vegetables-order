"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  ScrollText,
  Settings2,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/app/lib/cn";
import { adminSectionHref } from "@/app/lib/admin-navigation";

import {
  buildAdminUserMenuItems,
  type AdminUserMenuItemKey,
} from "./admin-user-menu-model";
import {
  ADMIN_SHELL_PREFERENCES_CHANGED_EVENT,
  DEFAULT_ADMIN_LAYOUT_PREFERENCES,
  notifyAdminShellPreferencesChanged,
  readAdminLayoutPreferences,
  writeAdminLayoutPreferences,
  type AdminLayoutMode,
  type AdminLayoutPreferences,
} from "./admin-shell-preferences";

const menuIconMap: Record<AdminUserMenuItemKey, LucideIcon> = {
  "layout-settings": Settings2,
  logout: LogOut,
  "operation-logs": ScrollText,
  password: KeyRound,
  profile: UserRound,
  "role-switch": UsersRound,
};

const layoutModeOptions: Array<{
  description: string;
  label: string;
  recommended?: boolean;
  value: AdminLayoutMode;
}> = [
  {
    description: "大多数后台用户最熟悉",
    label: "垂直菜单",
    recommended: true,
    value: "vertical",
  },
  {
    description: "适合两级菜单较多的运营后台",
    label: "双列菜单",
    recommended: true,
    value: "double",
  },
  {
    description: "适合菜单较少、横向切换",
    label: "水平菜单",
    value: "horizontal",
  },
  {
    description: "适合大屏表格或看板",
    label: "内容全屏",
    value: "content-full",
  },
];

const layoutWidthOptions = [
  { label: "通栏", value: "fluid" },
  { label: "居中", value: "contained" },
] as const;

const layoutDensityOptions = [
  { label: "标准", value: "standard" },
  { label: "紧凑", value: "compact" },
] as const;

const sidebarOptions = [
  { label: "展开", value: false },
  { label: "收起", value: true },
] as const;

const passwordFields = [
  ["currentPassword", "当前密码"],
  ["newPassword", "新密码"],
  ["confirmPassword", "确认新密码"],
] as const;

function LayoutModePreview({
  active,
  mode,
}: {
  active: boolean;
  mode: AdminLayoutMode;
}) {
  const lineClassName = active ? "bg-[#1f8f4f]" : "bg-[#9aa8a0]";
  const blockClassName = active ? "bg-[#cdebd3]" : "bg-[#d7ded9]";

  if (mode === "double") {
    return (
      <div className="grid h-16 grid-cols-[16px_32px_1fr] gap-1 rounded-xl bg-[#f4f7f3] p-1">
        <div className={cn("space-y-1 rounded-lg p-1", lineClassName)}>
          <div className="h-1 rounded bg-white/90" />
          <div className="h-1 rounded bg-white/70" />
          <div className="h-1 rounded bg-white/70" />
        </div>
        <div className="space-y-1 rounded-lg bg-[#22342a] p-1">
          <div className="h-1 rounded bg-white/80" />
          <div className="h-1 rounded bg-white/50" />
          <div className="h-1 rounded bg-white/50" />
        </div>
        <div className="space-y-1">
          <div className={cn("h-5 rounded", blockClassName)} />
          <div className={cn("h-8 rounded", blockClassName)} />
        </div>
      </div>
    );
  }

  if (mode === "horizontal") {
    return (
      <div className="h-16 rounded-xl bg-[#f4f7f3] p-1">
        <div className={cn("mb-1 flex h-3 gap-1 rounded px-1 py-1", lineClassName)}>
          <div className="h-1 w-4 rounded bg-white/90" />
          <div className="h-1 w-4 rounded bg-white/70" />
          <div className="h-1 w-4 rounded bg-white/70" />
        </div>
        <div className="grid grid-cols-2 gap-1">
          <div className={cn("h-5 rounded", blockClassName)} />
          <div className={cn("h-5 rounded", blockClassName)} />
          <div className={cn("col-span-2 h-5 rounded", blockClassName)} />
        </div>
      </div>
    );
  }

  if (mode === "content-full") {
    return (
      <div className="grid h-16 gap-1 rounded-xl bg-[#f4f7f3] p-1">
        <div className="grid grid-cols-2 gap-1">
          <div className={cn("h-6 rounded", blockClassName)} />
          <div className={cn("h-6 rounded", blockClassName)} />
        </div>
        <div className={cn("h-8 rounded", blockClassName)} />
      </div>
    );
  }

  return (
    <div className="grid h-16 grid-cols-[22px_1fr] gap-1 rounded-xl bg-[#f4f7f3] p-1">
      <div className={cn("space-y-1 rounded-lg p-1", lineClassName)}>
        <div className="h-1 rounded bg-white/90" />
        <div className="h-1 rounded bg-white/70" />
        <div className="h-1 rounded bg-white/70" />
        <div className="h-1 rounded bg-white/70" />
      </div>
      <div className="space-y-1">
        <div className={cn("h-5 rounded", blockClassName)} />
        <div className="grid grid-cols-2 gap-1">
          <div className={cn("h-8 rounded", blockClassName)} />
          <div className={cn("h-8 rounded", blockClassName)} />
        </div>
      </div>
    </div>
  );
}

type AdminUserMenuProps = {
  canOpenOperationLogs: boolean;
  name: string;
  roles: string;
  scopeLabel: string;
};

type ActivePanel = "profile" | "password" | "roles" | "layout";

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
  const [layoutPreferences, setLayoutPreferences] =
    useState<AdminLayoutPreferences>(DEFAULT_ADMIN_LAYOUT_PREFERENCES);
  const [passwordForm, setPasswordForm] = useState({
    confirmPassword: "",
    currentPassword: "",
    newPassword: "",
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const items = buildAdminUserMenuItems({ canOpenOperationLogs });
  const initial = name.slice(0, 1).toUpperCase();
  const roleList = roles
    .split(/[、,，/]/)
    .map((role) => role.trim())
    .filter(Boolean);

  useEffect(() => {
    function refreshLayoutPreferences() {
      setLayoutPreferences(readAdminLayoutPreferences(window.localStorage));
    }

    refreshLayoutPreferences();
    window.addEventListener(
      ADMIN_SHELL_PREFERENCES_CHANGED_EVENT,
      refreshLayoutPreferences,
    );
    return () =>
      window.removeEventListener(
        ADMIN_SHELL_PREFERENCES_CHANGED_EVENT,
        refreshLayoutPreferences,
      );
  }, []);

  function sectionHref(section: string) {
    return adminSectionHref(searchParams, section);
  }

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/login");
    router.refresh();
  }

  async function changePassword() {
    setPasswordError(null);
    if (!passwordForm.currentPassword) {
      setPasswordError("请输入当前密码");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError("新密码至少需要 8 位");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("两次输入的新密码不一致");
      return;
    }
    setPasswordSaving(true);
    try {
      const response = await fetch("/api/admin/auth/password", {
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error?.message ?? "修改密码失败");
      }
      setPasswordForm({
        confirmPassword: "",
        currentPassword: "",
        newPassword: "",
      });
      setActivePanel(null);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "修改密码失败");
    } finally {
      setPasswordSaving(false);
    }
  }

  function openPanel(panel: ActivePanel) {
    setOpen(false);
    setActivePanel(panel);
  }

  function updateLayoutPreferences(nextValue: Partial<AdminLayoutPreferences>) {
    const nextPreferences = { ...layoutPreferences, ...nextValue };
    setLayoutPreferences(nextPreferences);
    writeAdminLayoutPreferences(window.localStorage, nextPreferences);
    notifyAdminShellPreferencesChanged();
  }

  function layoutOptionClass(active: boolean) {
    return cn(
      "rounded-xl border px-3 py-2 text-sm font-semibold transition",
      active
        ? "border-[#1f8f4f] bg-[#e8f6ed] text-[#1f8f4f] dark:border-[#3f7350] dark:bg-white/10 dark:text-[#86d79f]"
        : "border-[#dbe6dc] bg-white text-[#405248] hover:bg-[#f8fbf7] dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70 dark:hover:bg-white/10",
    );
  }

  function layoutCardClass(active: boolean) {
    return cn(
      "rounded-2xl border p-2 text-left transition",
      active
        ? "border-[#1f8f4f] bg-[#f2fbf4] shadow-sm shadow-[#1f8f4f]/10 dark:border-[#3f7350] dark:bg-white/10 dark:shadow-black/20"
        : "border-[#dbe6dc] bg-white hover:border-[#a8d1b0] hover:bg-[#f8fbf7] dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-[#3f7350] dark:hover:bg-white/10",
    );
  }

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex min-w-64 items-center gap-3 rounded-2xl border border-[#dbe6dc] bg-[#f8fbf7] px-4 py-2 text-left transition hover:border-[#b9d0bf] hover:bg-white dark:border-[#254832] dark:bg-[#102219] dark:text-white dark:hover:border-[#3f7350] dark:hover:bg-[#132a1d]"
        onClick={() => setOpen((value) => !value)}
        title="打开账号菜单"
        type="button"
      >
        <div className="grid h-10 w-10 place-items-center rounded-full bg-[#1f8f4f] text-sm font-semibold text-white">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{name}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#66756d] dark:text-white/55">
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
          className="absolute right-0 top-[calc(100%+8px)] z-30 w-72 overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-xl shadow-[#14351d]/10 dark:border-[#254832] dark:bg-[#0d1d14] dark:shadow-black/35"
          role="menu"
        >
          <div className="border-b border-[#e5eee6] px-4 py-3 dark:border-white/10">
            <div className="truncate text-sm font-semibold text-[#14231a] dark:text-white">
              {name}
            </div>
            <div className="mt-1 text-xs text-[#66756d] dark:text-white/55">
              {roles} · {scopeLabel}
            </div>
          </div>
          <div className="p-2">
            {items.map((item) => {
              const ItemIcon = menuIconMap[item.key];
              const isLogout = item.key === "logout";
              const content = (
                <>
                  <span
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                      isLogout
                        ? "bg-red-50 text-[#b23a36] dark:bg-red-500/12 dark:text-red-300"
                        : "bg-[#f3f8f4] text-[#405248] dark:bg-white/10 dark:text-[#86d79f]",
                    )}
                  >
                    <ItemIcon size={16} strokeWidth={1.8} />
                  </span>
                  <span className="grid min-w-0 flex-1 grid-cols-[auto_1fr] items-center gap-3">
                    <span
                      className={cn(
                        "whitespace-nowrap text-sm font-medium",
                        isLogout
                          ? "text-[#9b312e] dark:text-red-300"
                          : "text-[#26352c] dark:text-white/90",
                      )}
                    >
                      {item.label}
                    </span>
                    {item.helper ? (
                      <span className="truncate text-right text-xs text-[#8b9a91] dark:text-white/45">
                        {item.helper}
                      </span>
                    ) : null}
                  </span>
                </>
              );
              const itemClassName = cn(
                "flex min-h-12 w-full items-center gap-3 rounded-xl px-2.5 text-left transition",
                item.disabled
                  ? "cursor-not-allowed opacity-60"
                  : "hover:bg-[#edf6ef] dark:hover:bg-white/[0.06]",
              );

              if (item.key === "logout") {
                return (
                  <button
                    className={cn(
                      itemClassName,
                      "mt-1 border-t border-[#edf1ee] pt-3 hover:bg-[#fff1ef] dark:border-white/10 dark:hover:bg-red-500/10",
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

              if (item.key === "password") {
                return (
                  <button
                    className={itemClassName}
                    key={item.key}
                    onClick={() => openPanel("password")}
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

              if (item.key === "layout-settings") {
                return (
                  <button
                    className={itemClassName}
                    key={item.key}
                    onClick={() => openPanel("layout")}
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
          className="fixed inset-0 z-40 bg-[#0f2418]/20 dark:bg-black/45"
          onClick={() => setActivePanel(null)}
        >
          <div
            aria-label={
              activePanel === "profile"
                ? "账号资料"
                : activePanel === "layout"
                  ? "布局设置"
                  : activePanel === "password"
                    ? "修改密码"
                  : "角色范围"
            }
            className="absolute right-7 top-20 w-[380px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-2xl shadow-[#14351d]/15 dark:border-[#254832] dark:bg-[#0d1d14] dark:shadow-black/35"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-center justify-between border-b border-[#e5eee6] px-5 py-4 dark:border-white/10">
              <div>
                <div className="text-base font-semibold text-[#14231a] dark:text-white">
                  {activePanel === "profile"
                    ? "账号资料"
                    : activePanel === "layout"
                      ? "布局设置"
                      : activePanel === "password"
                        ? "修改密码"
                      : "角色范围"}
                </div>
                <div className="mt-1 text-xs text-[#66756d] dark:text-white/55">
                  {activePanel === "layout"
                    ? "当前浏览器立即生效"
                    : activePanel === "password"
                      ? "修改后下次登录使用新密码"
                      : "来自当前真实登录会话"}
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
                <div className="flex items-center gap-3 rounded-2xl bg-[#f8fbf7] p-4 dark:bg-white/[0.04]">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-[#1f8f4f] text-base font-semibold text-white">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-[#14231a] dark:text-white">
                      {name}
                    </div>
                    <div className="mt-1 text-sm text-[#66756d] dark:text-white/55">{scopeLabel}</div>
                  </div>
                </div>
                <div className="grid gap-3 text-sm">
                  <div className="rounded-xl border border-[#dbe6dc] px-4 py-3 dark:border-white/10">
                    <div className="text-[#66756d] dark:text-white/50">当前角色</div>
                    <div className="mt-1 font-medium text-[#14231a] dark:text-white">{roles}</div>
                  </div>
                  <div className="rounded-xl border border-[#dbe6dc] px-4 py-3 dark:border-white/10">
                    <div className="text-[#66756d] dark:text-white/50">数据范围</div>
                    <div className="mt-1 font-medium text-[#14231a] dark:text-white">
                      {scopeLabel}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {activePanel === "password" ? (
              <div className="space-y-4 p-5">
                {passwordFields.map(([key, label]) => (
                  <label
                    className="grid gap-1.5 text-sm font-semibold text-[#405248] dark:text-white/70"
                    key={key}
                  >
                    {label}
                    <div className="relative">
                      <input
                        className="h-10 w-full rounded-xl border border-[#dbe6dc] bg-white px-3 pr-10 text-sm outline-none focus:border-[#1f8f4f] dark:border-white/10 dark:bg-[#07130c] dark:text-white"
                        onChange={(event) =>
                          setPasswordForm((value) => ({
                            ...value,
                            [key]: event.target.value,
                          }))
                        }
                        type={showPassword ? "text" : "password"}
                        value={passwordForm[key as keyof typeof passwordForm]}
                      />
                      <button
                        className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-[#66756d] hover:bg-[#f3f7f1] dark:text-white/50 dark:hover:bg-white/10"
                        onClick={() => setShowPassword((value) => !value)}
                        title={showPassword ? "隐藏密码" : "显示密码"}
                        type="button"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </label>
                ))}
                {passwordError ? (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                    {passwordError}
                  </div>
                ) : null}
                <div className="flex justify-end gap-2">
                  <button
                    className="h-10 rounded-xl border border-[#dbe6dc] px-4 text-sm font-semibold text-[#405248] dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10"
                    disabled={passwordSaving}
                    onClick={() => setActivePanel(null)}
                    type="button"
                  >
                    取消
                  </button>
                  <button
                    className="h-10 rounded-xl bg-[#1f8f4f] px-4 text-sm font-semibold text-white disabled:opacity-60"
                    disabled={passwordSaving}
                    onClick={() => void changePassword()}
                    type="button"
                  >
                    {passwordSaving ? "保存中" : "保存"}
                  </button>
                </div>
              </div>
            ) : null}

            {activePanel === "roles" ? (
              <div className="space-y-4 p-5">
                <div className="rounded-2xl border border-[#cfe3d3] bg-[#f8fff8] p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="text-sm font-semibold text-[#14231a] dark:text-white">
                    当前账号已启用角色
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(roleList.length ? roleList : [roles]).map((role) => (
                      <span
                        className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-[#1f8f4f] ring-1 ring-[#cfe3d3] dark:bg-white/10 dark:text-[#86d79f] dark:ring-white/10"
                        key={role}
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-[#dbe6dc] px-4 py-3 text-sm leading-6 text-[#66756d] dark:border-white/10 dark:text-white/55">
                  当前版本按后台账号聚合权限执行操作。后续如果启用单角色会话，
                  这个入口可以直接承接角色切换。
                </div>
              </div>
            ) : null}

            {activePanel === "layout" ? (
              <div className="space-y-4 p-5">
                <div className="rounded-2xl border border-[#dbe6dc] p-4 dark:border-white/10">
                  <div className="text-sm font-semibold text-[#14231a] dark:text-white">
                    布局
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {layoutModeOptions.map((option) => (
                      <button
                        aria-pressed={layoutPreferences.mode === option.value}
                        className={layoutCardClass(
                          layoutPreferences.mode === option.value,
                        )}
                        key={option.value}
                        onClick={() =>
                          updateLayoutPreferences({ mode: option.value })
                        }
                        type="button"
                      >
                        <LayoutModePreview
                          active={layoutPreferences.mode === option.value}
                          mode={option.value}
                        />
                        <span className="mt-2 flex items-center gap-1 text-sm font-semibold text-[#14231a] dark:text-white">
                          {option.label}
                          {option.recommended ? (
                            <span className="rounded-full bg-[#e8f6ed] px-1.5 py-0.5 text-[10px] font-semibold text-[#1f8f4f] dark:bg-white/10 dark:text-[#86d79f]">
                              常用
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block text-xs leading-4 text-[#66756d] dark:text-white/50">
                          {option.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#dbe6dc] p-4 dark:border-white/10">
                  <div className="text-sm font-semibold text-[#14231a] dark:text-white">
                    内容
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {layoutWidthOptions.map((option) => (
                      <button
                        aria-pressed={layoutPreferences.width === option.value}
                        className={layoutOptionClass(
                          layoutPreferences.width === option.value,
                        )}
                        key={option.value}
                        onClick={() =>
                          updateLayoutPreferences({ width: option.value })
                        }
                        type="button"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#dbe6dc] p-4 dark:border-white/10">
                  <div className="text-sm font-semibold text-[#14231a] dark:text-white">
                    侧边栏
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {sidebarOptions.map((option) => (
                      <button
                        aria-pressed={
                          layoutPreferences.collapsed === option.value
                        }
                        className={layoutOptionClass(
                          layoutPreferences.collapsed === option.value,
                        )}
                        key={option.label}
                        onClick={() =>
                          updateLayoutPreferences({ collapsed: option.value })
                        }
                        type="button"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#dbe6dc] p-4 dark:border-white/10">
                  <div className="text-sm font-semibold text-[#14231a] dark:text-white">
                    信息密度
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {layoutDensityOptions.map((option) => (
                      <button
                        aria-pressed={layoutPreferences.density === option.value}
                        className={layoutOptionClass(
                          layoutPreferences.density === option.value,
                        )}
                        key={option.value}
                        onClick={() =>
                          updateLayoutPreferences({ density: option.value })
                        }
                        type="button"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
