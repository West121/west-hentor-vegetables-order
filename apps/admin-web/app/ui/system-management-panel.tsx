"use client";

import {
  Eye,
  KeyRound,
  Maximize2,
  Minimize2,
  Pencil,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";

import { AdminPagination, type AdminPaginationMeta } from "./admin-pagination";
import {
  buildDetailPath,
  loadDetailResource,
  replaceItemById,
} from "./detail-loaders";
import { canCloseAdminModal } from "./admin-modal-close-guard";
import { hasAdminFormChanges } from "./admin-form-dirty";

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

function formatDateTime(value: string | null) {
  if (!value) {
    return "未登录";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function maskPhone(phone: string | null) {
  if (!phone || phone.length < 7) {
    return phone ?? "未填写";
  }

  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
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
  const [modal, setModal] = useState<ModalState | null>(null);
  const [form, setForm] = useState<FormState>(() => buildFormState(null, roles));
  const [initialForm, setInitialForm] = useState<FormState>(() =>
    buildFormState(null, roles),
  );
  const [fullscreen, setFullscreen] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
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

  function resetModalPosition() {
    setFullscreen(false);
    setOffset({ x: 0, y: 0 });
    setError(null);
  }

  function openCreateModal() {
    const nextForm = buildFormState(null, roles);
    setModal({ item: null, mode: "create" });
    setForm(nextForm);
    setInitialForm(nextForm);
    resetModalPosition();
  }

  function openEditModal(item: AdminUserPanelItem) {
    const nextForm = buildFormState(item, roles);
    setModal({ item, mode: "edit" });
    setForm(nextForm);
    setInitialForm(nextForm);
    resetModalPosition();
    void hydrateAdminUserDetail(item);
  }

  function openDetailModal(item: AdminUserPanelItem) {
    const nextForm = buildFormState(item, roles);
    setModal({ item, mode: "detail" });
    setForm(nextForm);
    setInitialForm(nextForm);
    resetModalPosition();
    void hydrateAdminUserDetail(item);
  }

  function openPasswordModal(item: AdminUserPanelItem) {
    const nextForm = { ...buildFormState(item, roles), password: "" };
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
      const detailForm = buildFormState(detail, roles);
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
      setAdminUsers(result.data.items);
      setPagination(result.data.pagination);
      setSummary(result.data.summary);
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
                      {item.username} · {maskPhone(item.phone)}
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
                    {formatDateTime(item.lastLoginAt)}
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
                  新密码
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    minLength={8}
                    onChange={(event) => updateForm("password", event.target.value)}
                    type="password"
                    value={form.password}
                  />
                </label>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    登录账号
                    <input
                      className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f] disabled:bg-[#f5f8f3]"
                      disabled={modal.mode !== "create"}
                      onChange={(event) => updateForm("username", event.target.value)}
                      readOnly={modal.mode === "detail"}
                      value={form.username}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    姓名
                    <input
                      className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) => updateForm("name", event.target.value)}
                      readOnly={modal.mode === "detail"}
                      value={form.name}
                    />
                  </label>
                  {modal.mode === "create" ? (
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      初始密码
                      <input
                        className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                        minLength={8}
                        onChange={(event) =>
                          updateForm("password", event.target.value)
                        }
                        type="password"
                        value={form.password}
                      />
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
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    状态
                    <select
                      className="h-11 rounded-xl border border-[#dbe6dc] bg-white px-3 outline-none focus:border-[#1f8f4f]"
                      disabled={modal.mode === "detail"}
                      onChange={(event) =>
                        updateForm("status", event.target.value as AdminStatus)
                      }
                      value={form.status}
                    >
                      <option value="ACTIVE">启用</option>
                      <option value="DISABLED">停用</option>
                    </select>
                  </label>
                  <div className="md:col-span-2">
                    <div className="mb-2 text-sm font-medium">角色</div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {roles.map((role) => (
                        <label
                          className="flex h-11 items-center gap-3 rounded-xl border border-[#dbe6dc] px-3 text-sm"
                          key={role.id}
                        >
                          <input
                            checked={form.roleIds.includes(role.id)}
                            disabled={modal.mode === "detail"}
                            onChange={() =>
                              updateForm("roleIds", toggleValue(form.roleIds, role.id))
                            }
                            type="checkbox"
                          />
                          {role.name}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {error ? (
                <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}
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
    </section>
  );
}
