"use client";

import {
  KeyRound,
  Maximize2,
  Minimize2,
  Pencil,
  RefreshCcw,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import { useMemo, useRef, useState, type PointerEvent } from "react";

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
  updatedAt: string;
  username: string;
};

export type OperationLogPanelItem = {
  action: string;
  createdAt: string;
  id: string;
  operator: {
    id: string;
    name: string;
    username: string;
  };
  resource: string;
  resourceId: string | null;
  store: {
    id: string;
    name: string;
  } | null;
};

type SystemManagementPanelProps = {
  initialAdminUsers: AdminUserPanelItem[];
  initialLogs: OperationLogPanelItem[];
  logStoreId: string | null;
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

const ACTION_LABELS: Record<string, string> = {
  ADMIN_USER_CREATED: "新建后台用户",
  ADMIN_USER_PASSWORD_RESET: "重置密码",
  ADMIN_USER_UPDATED: "编辑后台用户",
  DISH_CREATED: "新建菜品",
  DISH_DELETED: "删除菜品",
  DISH_INVENTORY_ADJUSTED: "调整库存",
  DISH_UPDATED: "编辑菜品",
  MEMBER_UPDATED: "编辑会员",
  ORDER_REMARK_UPDATED: "编辑订单备注",
  ORDER_SHIPPED: "订单发货",
  PACKAGE_TEMPLATE_CREATED: "新建套餐模板",
  PACKAGE_TEMPLATE_UPDATED: "编辑套餐模板",
  TASK_COPIED: "复制任务",
  TASK_CREATED: "新建任务",
  TASK_UPDATED: "编辑任务",
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
  initialLogs,
  logStoreId,
  roles,
  stores,
}: SystemManagementPanelProps) {
  const [adminUsers, setAdminUsers] = useState(initialAdminUsers);
  const [logs, setLogs] = useState(initialLogs);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [form, setForm] = useState<FormState>(() => buildFormState(null, roles));
  const [fullscreen, setFullscreen] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
  } | null>(null);

  const summary = useMemo(
    () =>
      adminUsers.reduce(
        (value, item) => {
          value.total += 1;
          if (item.status === "ACTIVE") {
            value.active += 1;
          }
          if (item.status === "DISABLED") {
            value.disabled += 1;
          }
          return value;
        },
        { active: 0, disabled: 0, total: 0 },
      ),
    [adminUsers],
  );

  function resetModalPosition() {
    setFullscreen(false);
    setOffset({ x: 0, y: 0 });
    setError(null);
  }

  function openCreateModal() {
    setModal({ item: null, mode: "create" });
    setForm(buildFormState(null, roles));
    resetModalPosition();
  }

  function openEditModal(item: AdminUserPanelItem) {
    setModal({ item, mode: "edit" });
    setForm(buildFormState(item, roles));
    resetModalPosition();
  }

  function openPasswordModal(item: AdminUserPanelItem) {
    setModal({ item, mode: "password" });
    setForm({ ...buildFormState(item, roles), password: "" });
    resetModalPosition();
  }

  function closeModal() {
    if (saving) {
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

  async function reloadAdminUsers() {
    const response = await fetch("/api/admin/admin-users");
    const result = (await response.json()) as {
      data?: { items: AdminUserPanelItem[] };
      success: boolean;
    };

    if (response.ok && result.success && result.data?.items) {
      setAdminUsers(result.data.items);
    }
  }

  async function reloadLogs() {
    const params = new URLSearchParams({ resource: "admin_user" });
    if (logStoreId) {
      params.set("storeId", logStoreId);
    }
    const response = await fetch(`/api/admin/operation-logs?${params.toString()}`);
    const result = (await response.json()) as {
      data?: { items: OperationLogPanelItem[] };
      success: boolean;
    };

    if (response.ok && result.success && result.data?.items) {
      setLogs(result.data.items);
    }
  }

  async function submitModal() {
    if (!modal) {
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

      await Promise.all([reloadAdminUsers(), reloadLogs()]);
      setModal(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
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
              总部账号可管理全部门店，加盟门店账号按授权门店进入。
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

        <div className="mt-5 overflow-hidden rounded-xl border border-[#dbe6dc]">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-[#f5f8f3] text-[#66756d]">
              <tr>
                <th className="px-4 py-3 font-medium">账号</th>
                <th className="px-4 py-3 font-medium">角色</th>
                <th className="px-4 py-3 font-medium">授权门店</th>
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
                    <div className="max-w-52 truncate">
                      {item.storeNames.length ? item.storeNames.join("、") : "全部门店"}
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
                  <td className="px-4 py-10 text-center text-[#66756d]" colSpan={6}>
                    暂无后台用户
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="rounded-2xl border border-[#dbe6dc] bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-normal">操作日志</h2>
            <p className="mt-2 text-sm leading-6 text-[#66756d]">
              记录关键后台变更和操作账号。
            </p>
          </div>
          <button
            className="grid h-10 w-10 place-items-center rounded-xl border border-[#dbe6dc] text-[#1f8f4f] hover:bg-[#f3f7f1]"
            onClick={reloadLogs}
            title="刷新日志"
            type="button"
          >
            <RefreshCcw size={17} />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {logs.slice(0, 10).map((log) => (
            <div className="rounded-xl border border-[#edf2ed] p-4" key={log.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold">
                    {ACTION_LABELS[log.action] ?? log.action}
                  </div>
                  <div className="mt-1 truncate text-xs text-[#66756d]">
                    {log.operator.name} · {log.store?.name ?? "全局"}
                  </div>
                </div>
                <div className="shrink-0 text-xs text-[#66756d]">
                  {formatDateTime(log.createdAt)}
                </div>
              </div>
            </div>
          ))}
          {logs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#dbe6dc] p-8 text-center text-sm text-[#66756d]">
              暂无操作日志
            </div>
          ) : null}
        </div>
      </aside>

      {modal ? (
        <div className="fixed inset-0 z-50 bg-[#0f2418]/35 p-5">
          <div
            className={[
              "mx-auto flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-2xl",
              fullscreen
                ? "h-full w-full"
                : "h-[66vh] w-[820px] max-w-full resize",
            ].join(" ")}
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
              onPointerUp={handleHeaderPointerUp}
            >
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold">
                  {modal.mode === "create"
                    ? "新建后台用户"
                    : modal.mode === "edit"
                      ? `编辑 · ${modal.item.name}`
                      : `重置密码 · ${modal.item.name}`}
                </div>
                <div className="mt-1 truncate text-sm text-[#66756d]">
                  后台用户与会员用户独立管理
                </div>
              </div>
              <div className="flex items-center gap-2">
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
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    登录账号
                    <input
                      className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f] disabled:bg-[#f5f8f3]"
                      disabled={modal.mode === "edit"}
                      onChange={(event) => updateForm("username", event.target.value)}
                      value={form.username}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    姓名
                    <input
                      className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) => updateForm("name", event.target.value)}
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
                      value={form.phone}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    状态
                    <select
                      className="h-11 rounded-xl border border-[#dbe6dc] bg-white px-3 outline-none focus:border-[#1f8f4f]"
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
                  <div className="md:col-span-2">
                    <div className="mb-2 text-sm font-medium">授权门店</div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {stores.map((store) => (
                        <label
                          className="flex h-11 items-center gap-3 rounded-xl border border-[#dbe6dc] px-3 text-sm"
                          key={store.id}
                        >
                          <input
                            checked={form.storeIds.includes(store.id)}
                            onChange={() =>
                              updateForm(
                                "storeIds",
                                toggleValue(form.storeIds, store.id),
                              )
                            }
                            type="checkbox"
                          />
                          <span className="truncate">{store.name}</span>
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
                disabled={saving}
                onClick={closeModal}
                type="button"
              >
                取消
              </button>
              <button
                className="h-10 rounded-xl bg-[#1f8f4f] px-5 font-semibold text-white disabled:opacity-60"
                disabled={saving}
                onClick={submitModal}
                type="button"
              >
                {saving ? "保存中" : "保存"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
