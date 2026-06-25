"use client";

import {
  Eye,
  EyeOff,
  KeyRound,
  Maximize2,
  Minimize2,
  Pencil,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";

import {
  AdminPagination,
  normalizeAdminListPayload,
  type AdminPaginationMeta,
} from "./admin-pagination";
import { AdminAlertDialog } from "./admin-confirm-dialog";
import { RequiredLabel } from "./required-mark";
import {
  buildDetailPath,
  loadDetailResource,
  replaceItemById,
} from "./detail-loaders";
import { canCloseAdminModal } from "./admin-modal-close-guard";
import { hasAdminFormChanges } from "./admin-form-dirty";
import { formatDateTimeSecond } from "./date-format";

type AdminStatus = "ACTIVE" | "DISABLED";

type StoreOption = {
  id: string;
  name: string;
};

type RoleOption = {
  id: string;
  name: string;
};

export type AdminUserPanelItem = {
  createdAt: string;
  id: string;
  lastLoginAt: string | null;
  name: string;
  phone: string | null;
  roleIds: string[];
  roleNames: string[];
  status: AdminStatus;
  storeIds: string[];
  storeNames: string[];
  stores?: Array<{
    id: string;
    name: string;
  }>;
  updatedAt: string;
  username: string;
};

type SystemManagementPanelProps = {
  initialAdminUsers: AdminUserPanelItem[];
  initialPagination: AdminPaginationMeta;
  initialSummary: {
    active: number;
    disabled: number;
    total: number;
  };
  roles: RoleOption[];
  stores: StoreOption[];
};

type ModalState =
  | {
      item: null;
      mode: "create";
    }
  | {
      item: AdminUserPanelItem;
      mode: "detail";
    }
  | {
      item: AdminUserPanelItem;
      mode: "edit";
    }
  | {
      item: AdminUserPanelItem;
      mode: "password";
    };

type FormState = {
  name: string;
  password: string;
  phone: string;
  roleIds: string[];
  status: AdminStatus;
  storeIds: string[];
  username: string;
};

const STATUS_LABELS: Record<AdminStatus, string> = {
  ACTIVE: "启用",
  DISABLED: "停用",
};

const ROLE_OPTIONS_ENDPOINT = "/api/admin/roles?page=1&pageSize=200";

type ApiResponse<T> = {
  data?: T;
  error?: {
    message: string;
  };
  success: boolean;
};

function buildFormState(
  item: AdminUserPanelItem | null,
  roles: RoleOption[],
): FormState {
  return {
    name: item?.name ?? "",
    password: "",
    phone: item?.phone ?? "",
    roleIds: item?.roleIds ?? (roles[0] ? [roles[0].id] : []),
    status: item?.status ?? "ACTIVE",
    storeIds: item?.storeIds ?? [],
    username: item?.username ?? "",
  };
}

function validateAdminUserForm(mode: ModalState["mode"], form: FormState) {
  if (mode === "password") {
    return form.password.trim().length < 8 ? "新密码至少需要 8 位" : null;
  }

  if (!form.username.trim()) {
    return "请输入登录账号";
  }
  if (!form.name.trim()) {
    return "请输入用户姓名";
  }
  if (mode === "create" && form.password.trim().length < 8) {
    return "初始密码至少需要 8 位";
  }
  if (form.roleIds.length === 0) {
    return "请选择后台角色";
  }
  if (!form.status) {
    return "请选择用户状态";
  }

  return null;
}

function displayPhone(phone: string | null) {
  return phone ?? "未填写";
}

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function SystemManagementPanel({
  initialAdminUsers,
  initialPagination,
  initialSummary,
  roles,
  stores,
}: SystemManagementPanelProps) {
  const [adminUsers, setAdminUsers] = useState(initialAdminUsers);
  const [pagination, setPagination] = useState(initialPagination);
  const [summary, setSummary] = useState(initialSummary);
  const [roleOptions, setRoleOptions] = useState(roles);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [form, setForm] = useState<FormState>(() =>
    buildFormState(null, roleOptions),
  );
  const [initialForm, setInitialForm] = useState<FormState>(() =>
    buildFormState(null, roleOptions),
  );
  const [fullscreen, setFullscreen] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminStatus | "ALL">("ALL");
  const [storeFilter, setStoreFilter] = useState("ALL");
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    void reloadRoleOptions(false);
  }, []);

  function resetModalPosition() {
    setFullscreen(false);
    setOffset({ x: 0, y: 0 });
    setError(null);
    setPasswordVisible(false);
  }

  function openCreateModal() {
    const nextForm = buildFormState(null, roleOptions);
    setModal({ item: null, mode: "create" });
    setForm(nextForm);
    setInitialForm(nextForm);
    resetModalPosition();
    void reloadRoleOptions(true);
  }

  function openEditModal(item: AdminUserPanelItem) {
    const nextForm = buildFormState(item, roleOptions);
    setModal({ item, mode: "edit" });
    setForm(nextForm);
    setInitialForm(nextForm);
    resetModalPosition();
    void reloadRoleOptions(false);
    void hydrateAdminUserDetail(item);
  }

  function openDetailModal(item: AdminUserPanelItem) {
    const nextForm = buildFormState(item, roleOptions);
    setModal({ item, mode: "detail" });
    setForm(nextForm);
    setInitialForm(nextForm);
    resetModalPosition();
    void reloadRoleOptions(false);
    void hydrateAdminUserDetail(item);
  }

  function openPasswordModal(item: AdminUserPanelItem) {
    const nextForm = { ...buildFormState(item, roleOptions), password: "" };
    setModal({ item, mode: "password" });
    setForm(nextForm);
    setInitialForm(nextForm);
    resetModalPosition();
    void hydrateAdminUserDetail(item);
  }

  async function hydrateAdminUserDetail(item: AdminUserPanelItem) {
    setLoadingDetail(true);

    try {
      const detail = await loadDetailResource<AdminUserPanelItem>(
        buildDetailPath("admin-users", item.id),
        "adminUser",
      );

      setAdminUsers((value) => replaceItemById(value, detail));
      setModal((current) => {
        if (
          (current?.mode === "detail" ||
            current?.mode === "edit" ||
            current?.mode === "password") &&
          current.item.id === item.id
        ) {
          return { ...current, item: detail };
        }

        return current;
      });
      const detailForm = buildFormState(detail, roleOptions);
      setInitialForm({ ...detailForm, password: "" });
      setForm((current) =>
        current
          ? {
              ...detailForm,
              password: current.password,
            }
          : current,
      );
    } catch (detailError) {
      setError(
        detailError instanceof Error
          ? detailError.message
          : "后台用户详情加载失败",
      );
    } finally {
      setLoadingDetail(false);
    }
  }

  function closeModal() {
    if (saving) {
      return;
    }

    if (
      modal &&
      modal.mode !== "detail" &&
      !canCloseAdminModal({
        hasUnsavedChanges: hasAdminFormChanges({
          current: form,
          initial: initialForm,
        }),
      })
    ) {
      return;
    }

    setModal(null);
    setError(null);
  }

  function handleHeaderPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (fullscreen) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: offset.x,
      y: offset.y,
    };
  }

  function handleHeaderPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    setOffset({
      x: drag.x + event.clientX - drag.startX,
      y: drag.y + event.clientY - drag.startY,
    });
  }

  function handleHeaderPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function reloadRoleOptions(defaultCreateRole: boolean) {
    setLoadingRoles(true);
    try {
      const response = await fetch(ROLE_OPTIONS_ENDPOINT);
      const result = (await response.json()) as ApiResponse<{
        items: RoleOption[];
      }>;
      if (!response.ok || !result.success || !result.data?.items) {
        throw new Error(result.error?.message ?? "角色列表加载失败");
      }

      const nextRoles = result.data.items.map((role) => ({
        id: role.id,
        name: role.name,
      }));
      setRoleOptions(nextRoles);
      if (defaultCreateRole) {
        setForm((current) =>
          current.roleIds.length === 0 && nextRoles[0]
            ? { ...current, roleIds: [nextRoles[0].id] }
            : current,
        );
      }
    } catch (roleError) {
      setError(roleError instanceof Error ? roleError.message : "角色列表加载失败");
    } finally {
      setLoadingRoles(false);
    }
  }

  async function reloadAdminUsers(
    page = pagination.page,
    filters = { query, statusFilter, storeFilter },
  ) {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pagination.pageSize),
    });
    const nextQuery = filters.query.trim();
    if (nextQuery) {
      params.set("query", nextQuery);
    }
    if (filters.statusFilter !== "ALL") {
      params.set("status", filters.statusFilter);
    }
    if (filters.storeFilter !== "ALL") {
      params.set("storeId", filters.storeFilter);
    }

    setLoadingList(true);
    setError(null);

    const response = await fetch(`/api/admin/admin-users?${params.toString()}`);
    const result = (await response.json()) as {
      data?: {
        items: AdminUserPanelItem[];
        pagination: AdminPaginationMeta;
        summary: typeof initialSummary;
      };
      success: boolean;
    };

    if (response.ok && result.success && result.data?.items) {
      const nextList = normalizeAdminListPayload(
        result.data,
        initialSummary,
        pagination.pageSize,
      );
      setAdminUsers(nextList.items);
      setPagination(nextList.pagination);
      setSummary(nextList.summary);
    }
    setLoadingList(false);
  }

  function resetFilters() {
    setQuery("");
    setStatusFilter("ALL");
    setStoreFilter("ALL");
    void reloadAdminUsers(1, {
      query: "",
      statusFilter: "ALL",
      storeFilter: "ALL",
    });
  }

  async function submitModal() {
    if (!modal || modal.mode === "detail") {
      return;
    }

    const validationMessage = validateAdminUserForm(modal.mode, form);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setSaving(true);
    setError(null);

    const endpoint =
      modal.mode === "create"
        ? "/api/admin/admin-users"
        : modal.mode === "edit"
          ? `/api/admin/admin-users/${modal.item.id}`
          : `/api/admin/admin-users/${modal.item.id}/password`;
    const payload =
      modal.mode === "password"
        ? { newPassword: form.password }
        : {
            name: form.name,
            password: form.password,
            phone: form.phone || null,
            roleIds: form.roleIds,
            status: form.status,
            storeIds: form.storeIds,
            username: form.username,
          };

    try {
      const response = await fetch(endpoint, {
        body: JSON.stringify(payload),
        headers: { "content-type": "application/json" },
        method: modal.mode === "create" || modal.mode === "password" ? "POST" : "PATCH",
      });
      const result = (await response.json()) as {
        error?: { message: string };
        success: boolean;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message ?? "保存失败");
      }

      await reloadAdminUsers(modal.mode === "create" ? 1 : pagination.page);
      setModal(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-2xl border border-[#dbe6dc] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#1f8f4f]">
              <ShieldCheck size={18} />
              系统管理
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-normal">
              后台用户
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#66756d]">
              后台用户用于运营管理，角色权限决定可访问的功能范围。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["全部", summary.total],
              ["启用", summary.active],
              ["停用", summary.disabled],
            ].map(([label, value]) => (
              <div
                className="rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] px-4 py-2"
                key={label}
              >
                <div className="text-xs text-[#66756d]">{label}</div>
                <div className="mt-1 text-lg font-semibold">{value}</div>
              </div>
            ))}
            <button
              className="flex h-[58px] items-center gap-2 rounded-xl bg-[#1f8f4f] px-5 text-sm font-semibold text-white"
              onClick={openCreateModal}
              type="button"
            >
              <UserPlus size={17} />
              新建用户
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] p-3">
          <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-xs font-semibold text-[#66756d]">
            关键字
            <input
              className="h-10 rounded-xl border border-[#dbe6dc] bg-white px-3 text-sm font-normal text-[#15261d] outline-none focus:border-[#1f8f4f]"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void reloadAdminUsers(1);
                }
              }}
              placeholder="姓名 / 登录账号 / 手机号"
              value={query}
            />
          </label>
          <label className="flex w-36 flex-col gap-1 text-xs font-semibold text-[#66756d]">
            状态
            <select
              className="h-10 rounded-xl border border-[#dbe6dc] bg-white px-3 text-sm font-normal text-[#15261d] outline-none focus:border-[#1f8f4f]"
              onChange={(event) =>
                setStatusFilter(event.target.value as AdminStatus | "ALL")
              }
              value={statusFilter}
            >
              <option value="ALL">全部状态</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="h-10 rounded-xl bg-[#1f8f4f] px-5 text-sm font-semibold text-white disabled:opacity-60"
            disabled={loadingList}
            onClick={() => void reloadAdminUsers(1)}
            type="button"
          >
            查询
          </button>
          <button
            className="h-10 rounded-xl border border-[#dbe6dc] bg-white px-5 text-sm font-semibold text-[#66756d] hover:bg-[#f3f7f1]"
            disabled={loadingList}
            onClick={resetFilters}
            type="button"
          >
            重置
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-[#dbe6dc]">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-[#f5f8f3] text-[#66756d]">
              <tr>
                <th className="px-4 py-3 font-medium">账号</th>
                <th className="px-4 py-3 font-medium">角色</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">最近登录</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ed]">
              {adminUsers.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4">
                    <div className="max-w-48 truncate font-semibold">
                      {item.name}
                    </div>
                    <div className="mt-1 max-w-48 truncate text-xs text-[#66756d]">
                      {item.username} · {displayPhone(item.phone)}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="max-w-40 truncate">
                      {item.roleNames.join("、") || "未分配"}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-[#e8f6ed] px-3 py-1 text-xs font-semibold text-[#1f8f4f]">
                      {STATUS_LABELS[item.status]}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-[#66756d]">
                    {formatDateTimeSecond(item.lastLoginAt, "未登录")}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        className="grid h-9 w-9 place-items-center rounded-xl border border-[#dbe6dc] text-[#1f8f4f] hover:bg-[#f3f7f1]"
                        onClick={() => openDetailModal(item)}
                        title="查看详情"
                        type="button"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="grid h-9 w-9 place-items-center rounded-xl border border-[#dbe6dc] text-[#1f8f4f] hover:bg-[#f3f7f1]"
                        onClick={() => openEditModal(item)}
                        title="编辑用户"
                        type="button"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="grid h-9 w-9 place-items-center rounded-xl border border-[#dbe6dc] text-[#66756d] hover:bg-[#f3f7f1]"
                        onClick={() => openPasswordModal(item)}
                        title="重置密码"
                        type="button"
                      >
                        <KeyRound size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {adminUsers.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-[#66756d]" colSpan={5}>
                    暂无后台用户
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <AdminPagination
            disabled={loadingList}
            onPageChange={(nextPage) => void reloadAdminUsers(nextPage)}
            pagination={pagination}
          />
        </div>
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 bg-[#0f2418]/35 p-5">
          <div
            aria-modal="true"
            className={[
              "mx-auto flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-2xl",
              fullscreen
                ? "h-full w-full"
                : "h-[66vh] w-[820px] max-w-full resize",
            ].join(" ")}
            role="dialog"
            style={
              fullscreen
                ? undefined
                : { transform: `translate(${offset.x}px, ${offset.y}px)` }
            }
          >
            <div
              className="flex cursor-move items-center justify-between border-b border-[#dbe6dc] px-6 py-4"
              onPointerDown={handleHeaderPointerDown}
              onPointerMove={handleHeaderPointerMove}
              onPointerCancel={handleHeaderPointerUp}
              onPointerUp={handleHeaderPointerUp}
            >
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold">
                  {modal.mode === "create"
                    ? "新建后台用户"
                    : modal.mode === "detail"
                      ? `后台用户详情 · ${modal.item.name}`
                    : modal.mode === "edit"
                      ? `编辑 · ${modal.item.name}`
                      : `重置密码 · ${modal.item.name}`}
                </div>
                <div className="mt-1 truncate text-sm text-[#66756d]">
                  {loadingDetail
                    ? "正在加载最新后台用户详情"
                    : "后台用户与会员用户独立管理"}
                </div>
              </div>
              <div
                className="flex items-center gap-2"
                onPointerDown={(event) => event.stopPropagation()}
              >
                <button
                  className="grid h-9 w-9 place-items-center rounded-xl border border-[#cfe3d3] bg-[#eff8f1] text-[#1f8f4f]"
                  onClick={() => setFullscreen((value) => !value)}
                  title={fullscreen ? "退出全屏" : "全屏"}
                  type="button"
                >
                  {fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                </button>
                <button
                  className="grid h-9 w-9 place-items-center rounded-xl border border-red-100 bg-red-50 text-red-600"
                  onClick={closeModal}
                  title="关闭"
                  type="button"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {modal.mode === "password" ? (
                <div className="space-y-4">
                <div className="rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] p-4 text-sm">
                  <div className="font-semibold">{modal.item.name}</div>
                  <div className="mt-1 text-[#66756d]">
                    {modal.item.roleNames.join("、") || "未分配角色"} ·{" "}
                    数据范围已按当前系统配置保留
                  </div>
                </div>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  <RequiredLabel>新密码</RequiredLabel>
                  <div className="relative">
                    <input
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 pr-11 outline-none focus:border-[#1f8f4f]"
                      minLength={8}
                      onChange={(event) => updateForm("password", event.target.value)}
                      type={passwordVisible ? "text" : "password"}
                      value={form.password}
                    />
                    <button
                      className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-[#66756d] hover:bg-[#eff8f1] hover:text-[#1f8f4f]"
                      onClick={() => setPasswordVisible((value) => !value)}
                      title={passwordVisible ? "隐藏密码" : "显示密码"}
                      type="button"
                    >
                      {passwordVisible ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </label>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    <RequiredLabel>登录账号</RequiredLabel>
                    <input
                      className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f] disabled:bg-[#f5f8f3]"
                      disabled={modal.mode !== "create"}
                      onChange={(event) => updateForm("username", event.target.value)}
                      readOnly={modal.mode === "detail"}
                      value={form.username}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    <RequiredLabel>姓名</RequiredLabel>
                    <input
                      className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) => updateForm("name", event.target.value)}
                      readOnly={modal.mode === "detail"}
                      value={form.name}
                    />
                  </label>
                  {modal.mode === "create" ? (
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      <RequiredLabel>初始密码</RequiredLabel>
                      <div className="relative">
                        <input
                          className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 pr-11 outline-none focus:border-[#1f8f4f]"
                          minLength={8}
                          onChange={(event) =>
                            updateForm("password", event.target.value)
                          }
                          type={passwordVisible ? "text" : "password"}
                          value={form.password}
                        />
                        <button
                          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-[#66756d] hover:bg-[#eff8f1] hover:text-[#1f8f4f]"
                          onClick={() => setPasswordVisible((value) => !value)}
                          title={passwordVisible ? "隐藏密码" : "显示密码"}
                          type="button"
                        >
                          {passwordVisible ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </label>
                  ) : null}
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    手机号
                    <input
                      className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) => updateForm("phone", event.target.value)}
                      readOnly={modal.mode === "detail"}
                      value={form.phone}
                    />
                  </label>
                  <div className="flex flex-col gap-2 text-sm font-medium">
                    <RequiredLabel>状态</RequiredLabel>
                    <div className="grid h-11 grid-cols-2 gap-2 rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] p-1">
                      {(["ACTIVE", "DISABLED"] as const).map((status) => (
                        <button
                          className={[
                            "rounded-lg text-sm font-semibold transition",
                            form.status === status
                              ? "bg-white text-[#1f8f4f] shadow-sm"
                              : "text-[#66756d] hover:bg-white/70",
                          ].join(" ")}
                          disabled={modal.mode === "detail"}
                          key={status}
                          onClick={() => updateForm("status", status)}
                          type="button"
                        >
                          {STATUS_LABELS[status]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="mb-2 text-sm font-medium">
                      <RequiredLabel>
                        角色{loadingRoles ? "（刷新中）" : ""}
                      </RequiredLabel>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {roleOptions.map((role) => {
                        const checked = form.roleIds.includes(role.id);
                        return (
                          <button
                            aria-pressed={checked}
                            className={[
                              "flex h-11 items-center justify-between rounded-xl border px-3 text-left text-sm font-semibold transition",
                              checked
                                ? "border-[#8ecaa1] bg-[#eef8f0] text-[#1f8f4f]"
                                : "border-[#dbe6dc] bg-white text-[#405248] hover:bg-[#f8fbf7]",
                            ].join(" ")}
                            disabled={modal.mode === "detail"}
                            key={role.id}
                            onClick={() =>
                              updateForm("roleIds", toggleValue(form.roleIds, role.id))
                            }
                            type="button"
                          >
                            <span>{role.name}</span>
                            <span
                              className={[
                                "grid h-5 w-5 place-items-center rounded-full border text-xs",
                                checked
                                  ? "border-[#1f8f4f] bg-[#1f8f4f] text-white"
                                  : "border-[#bfd5c6] text-transparent",
                              ].join(" ")}
                            >
                              ✓
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

            </div>

            <div className="flex justify-end gap-3 border-t border-[#dbe6dc] px-6 py-4">
              <button
                className="h-10 rounded-xl border border-[#dbe6dc] px-5"
                disabled={saving || loadingDetail}
                onClick={closeModal}
                type="button"
              >
                {modal.mode === "detail" ? "关闭" : "取消"}
              </button>
              {modal.mode !== "detail" ? (
                <button
                  className="h-10 rounded-xl bg-[#1f8f4f] px-5 font-semibold text-white disabled:opacity-60"
                  disabled={saving}
                  onClick={submitModal}
                  type="button"
                >
                  {saving ? "保存中" : "保存"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      {modal && error ? (
        <AdminAlertDialog message={error} onClose={() => setError(null)} />
      ) : null}
    </section>
  );
}
