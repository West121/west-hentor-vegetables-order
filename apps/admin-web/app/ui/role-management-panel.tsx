"use client";

import { BadgeCheck, Pencil, Plus, RefreshCcw, X } from "lucide-react";
import { useState } from "react";

import { AdminPagination, type AdminPaginationMeta } from "./admin-pagination";

export type RolePermissionOption = {
  code: string;
  id: string;
  name: string;
};

export type RolePanelItem = {
  code: string;
  createdAt: string;
  id: string;
  name: string;
  permissionCodes: string[];
  permissions: RolePermissionOption[];
  updatedAt: string;
  userCount: number;
};

type RoleManagementPanelProps = {
  initialPagination: AdminPaginationMeta;
  initialRoles: RolePanelItem[];
  initialSummary: {
    total: number;
  };
  permissions: RolePermissionOption[];
};

type RoleModalState =
  | {
      item: null;
      mode: "create";
    }
  | {
      item: RolePanelItem;
      mode: "edit";
    };

type RoleFormState = {
  code: string;
  name: string;
  permissionIds: string[];
};

type ApiResponse<T> = {
  data?: T;
  error?: {
    message: string;
  };
  success: boolean;
};

function buildForm(item: RolePanelItem | null): RoleFormState {
  return {
    code: item?.code ?? "",
    name: item?.name ?? "",
    permissionIds: item?.permissions.map((permission) => permission.id) ?? [],
  };
}

function permissionGroupName(code: string) {
  const [group = ""] = code.split(".");
  const labels: Record<string, string> = {
    dishes: "菜品",
    members: "会员",
    orders: "订单",
    packages: "套餐",
    stores: "业务配置",
    system: "系统",
    tasks: "任务",
  };

  return labels[group] ?? "其他";
}

function groupPermissions(permissions: RolePermissionOption[]) {
  const groups = new Map<string, RolePermissionOption[]>();

  for (const permission of permissions) {
    const group = permissionGroupName(permission.code);
    groups.set(group, [...(groups.get(group) ?? []), permission]);
  }

  return Array.from(groups.entries());
}

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function RoleManagementPanel({
  initialPagination,
  initialRoles,
  initialSummary,
  permissions,
}: RoleManagementPanelProps) {
  const [roles, setRoles] = useState(initialRoles);
  const [pagination, setPagination] = useState(initialPagination);
  const [summary, setSummary] = useState(initialSummary);
  const [modal, setModal] = useState<RoleModalState | null>(null);
  const [form, setForm] = useState<RoleFormState>(() => buildForm(null));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  function openCreateModal() {
    setModal({ item: null, mode: "create" });
    setForm(buildForm(null));
    setError(null);
  }

  function openEditModal(item: RolePanelItem) {
    setModal({ item, mode: "edit" });
    setForm(buildForm(item));
    setError(null);
  }

  async function reloadRoles(page = pagination.page, filters = { query }) {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pagination.pageSize),
    });
    const nextQuery = filters.query.trim();
    if (nextQuery) {
      params.set("query", nextQuery);
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/roles?${params.toString()}`);
      const result = (await response.json()) as ApiResponse<{
        items: RolePanelItem[];
        pagination: AdminPaginationMeta;
        summary: typeof initialSummary;
      }>;

      if (!response.ok || !result.success || !result.data?.items) {
        throw new Error(result.error?.message ?? "角色列表加载失败");
      }

      setRoles(result.data.items);
      setPagination(result.data.pagination);
      setSummary(result.data.summary);
    } catch (reloadError) {
      setError(reloadError instanceof Error ? reloadError.message : "角色列表加载失败");
    } finally {
      setLoading(false);
    }
  }

  function resetFilters() {
    setQuery("");
    void reloadRoles(1, { query: "" });
  }

  async function submitRole() {
    if (!modal) {
      return;
    }

    setSaving(true);
    setError(null);

    const endpoint =
      modal.mode === "create"
        ? "/api/admin/roles"
        : `/api/admin/roles/${modal.item.id}`;
    const payload =
      modal.mode === "create"
        ? form
        : { name: form.name, permissionIds: form.permissionIds };

    try {
      const response = await fetch(endpoint, {
        body: JSON.stringify(payload),
        headers: { "content-type": "application/json" },
        method: modal.mode === "create" ? "POST" : "PATCH",
      });
      const result = (await response.json()) as ApiResponse<unknown>;

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message ?? "角色保存失败");
      }

      setModal(null);
      await reloadRoles(modal.mode === "create" ? 1 : pagination.page);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "角色保存失败");
    } finally {
      setSaving(false);
    }
  }

  const permissionGroups = groupPermissions(permissions);

  return (
    <section className="grid gap-5">
      <div className="rounded-2xl border border-[#dbe6dc] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#1f8f4f]">
              <BadgeCheck size={18} />
              系统管理
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-normal">角色管理</h2>
            <p className="mt-2 text-sm leading-6 text-[#66756d]">
              角色绑定权限点，后台用户通过角色获得菜单入口和接口操作权限。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] px-4 py-2">
              <div className="text-xs text-[#66756d]">角色数</div>
              <div className="mt-1 text-lg font-semibold">{summary.total}</div>
            </div>
            <button
              className="flex h-[58px] items-center gap-2 rounded-xl border border-[#dbe6dc] px-4 text-sm font-semibold text-[#1f8f4f] hover:bg-[#f3f7f1]"
              disabled={loading}
              onClick={() => void reloadRoles()}
              type="button"
            >
              <RefreshCcw size={17} />
              {loading ? "刷新中" : "刷新"}
            </button>
            <button
              className="flex h-[58px] items-center gap-2 rounded-xl bg-[#1f8f4f] px-5 text-sm font-semibold text-white"
              onClick={openCreateModal}
              type="button"
            >
              <Plus size={17} />
              新建角色
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-[#ffd8cc] bg-[#fff5f1] px-4 py-3 text-sm font-semibold text-[#d64a3a]">
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] p-3">
          <label className="flex min-w-[260px] flex-1 flex-col gap-1 text-xs font-semibold text-[#66756d]">
            关键字
            <input
              className="h-10 rounded-xl border border-[#dbe6dc] bg-white px-3 text-sm font-normal text-[#15261d] outline-none focus:border-[#1f8f4f]"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void reloadRoles(1);
                }
              }}
              placeholder="角色名称 / 编码"
              value={query}
            />
          </label>
          <button
            className="h-10 rounded-xl bg-[#1f8f4f] px-5 text-sm font-semibold text-white disabled:opacity-60"
            disabled={loading}
            onClick={() => void reloadRoles(1)}
            type="button"
          >
            查询
          </button>
          <button
            className="h-10 rounded-xl border border-[#dbe6dc] bg-white px-5 text-sm font-semibold text-[#66756d] hover:bg-[#f3f7f1]"
            disabled={loading}
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
                <th className="px-4 py-3 font-medium">角色</th>
                <th className="px-4 py-3 font-medium">权限</th>
                <th className="px-4 py-3 font-medium">用户数</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ed]">
              {roles.map((role) => (
                <tr key={role.id}>
                  <td className="px-4 py-4">
                    <div className="font-semibold">{role.name}</div>
                    <code className="mt-1 inline-block rounded-lg bg-[#f5f8f3] px-2 py-1 text-xs text-[#66756d]">
                      {role.code}
                    </code>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex max-w-2xl flex-wrap gap-1.5">
                      {role.permissions.map((permission) => (
                        <span
                          className="rounded-full bg-[#eef8f0] px-2 py-1 text-xs font-semibold text-[#1f8f4f]"
                          key={permission.id}
                        >
                          {permission.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-[#66756d]">{role.userCount}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end">
                      <button
                        className="grid h-9 w-9 place-items-center rounded-xl border border-[#dbe6dc] text-[#1f8f4f] hover:bg-[#f3f7f1]"
                        onClick={() => openEditModal(role)}
                        title="编辑角色权限"
                        type="button"
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <AdminPagination pagination={pagination} onPageChange={reloadRoles} />
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07140c]/40 p-6">
          <div className="w-full max-w-3xl rounded-2xl border border-[#dbe6dc] bg-white shadow-2xl shadow-[#0f2418]/20">
            <div className="flex items-start justify-between border-b border-[#dbe6dc] px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {modal.mode === "create" ? "新建角色" : "编辑角色权限"}
                </h3>
                <p className="mt-1 text-sm text-[#66756d]">
                  权限保存后立即影响该角色下所有后台用户。
                </p>
              </div>
              <button
                className="grid h-9 w-9 place-items-center rounded-xl border border-[#dbe6dc] text-[#66756d] hover:bg-[#f3f7f1]"
                disabled={saving}
                onClick={() => setModal(null)}
                type="button"
              >
                <X size={17} />
              </button>
            </div>

            <div className="grid max-h-[72vh] gap-4 overflow-y-auto p-5">
              <label className="grid gap-2 text-sm font-semibold">
                角色名称
                <input
                  className="h-10 rounded-xl border border-[#dbe6dc] px-3 font-normal outline-none focus:border-[#1f8f4f]"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  value={form.name}
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold">
                角色编码
                <input
                  className="h-10 rounded-xl border border-[#dbe6dc] px-3 font-normal outline-none disabled:bg-[#f5f8f3] disabled:text-[#8a9a90]"
                  disabled={modal.mode === "edit"}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, code: event.target.value }))
                  }
                  placeholder="operator"
                  value={form.code}
                />
              </label>

              <div>
                <div className="text-sm font-semibold">角色权限</div>
                <div className="mt-3 grid gap-3">
                  {permissionGroups.map(([group, items]) => (
                    <div
                      className="rounded-xl border border-[#dbe6dc] p-3"
                      key={group}
                    >
                      <div className="mb-3 text-sm font-semibold text-[#1f8f4f]">
                        {group}
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {items.map((permission) => (
                          <label
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[#f5f8f3]"
                            key={permission.id}
                          >
                            <input
                              checked={form.permissionIds.includes(permission.id)}
                              className="size-4 accent-[#1f8f4f]"
                              onChange={() =>
                                setForm((current) => ({
                                  ...current,
                                  permissionIds: toggleValue(
                                    current.permissionIds,
                                    permission.id,
                                  ),
                                }))
                              }
                              type="checkbox"
                            />
                            <span className="font-semibold">{permission.name}</span>
                            <code className="text-xs text-[#8a9a90]">
                              {permission.code}
                            </code>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {error ? (
                <div className="rounded-xl border border-[#ffd8cc] bg-[#fff5f1] px-4 py-3 text-sm font-semibold text-[#d64a3a]">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-3 border-t border-[#dbe6dc] px-5 py-4">
              <button
                className="h-10 rounded-xl border border-[#dbe6dc] px-5 text-sm font-semibold text-[#66756d] hover:bg-[#f3f7f1]"
                disabled={saving}
                onClick={() => setModal(null)}
                type="button"
              >
                取消
              </button>
              <button
                className="h-10 rounded-xl bg-[#1f8f4f] px-5 text-sm font-semibold text-white disabled:bg-[#bfd5c6]"
                disabled={saving}
                onClick={() => void submitRole()}
                type="button"
              >
                {saving ? "保存中" : "保存角色"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
