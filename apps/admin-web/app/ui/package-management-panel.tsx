"use client";

import {
  Eye,
  LockKeyhole,
  Maximize2,
  Minimize2,
  PackageCheck,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { AdminPagination, type AdminPaginationMeta } from "./admin-pagination";
import {
  buildStoreScopedDetailPath,
  loadDetailResource,
  replaceItemById,
} from "./detail-loaders";
import { canCloseAdminModal } from "./admin-modal-close-guard";
import { hasAdminFormChanges } from "./admin-form-dirty";
import {
  normalizePackagePanelItem,
  normalizePackagePanelItems,
  type PackagePanelItem,
} from "./package-management-model";

export type { PackagePanelItem } from "./package-management-model";

type StoreOption = {
  id: string;
  name: string;
};

type PackageManagementPanelProps = {
  initialItems: PackagePanelItem[];
  initialPagination: AdminPaginationMeta;
  initialSummary: {
    active: number;
    expired: number;
    frozen: number;
    total: number;
  };
  memberOptions: Array<{
    id: string;
    nickname: string | null;
    phone: string | null;
  }>;
  packageTemplateOptions: Array<{
    id: string;
    name: string;
    totalTimes: number;
    weightLimitJin: number;
  }>;
  store: StoreOption | null;
};

type ModalMode = "adjust" | "delete" | "detail" | "freeze" | "unfreeze";

type ModalState = {
  item: PackagePanelItem;
  mode: ModalMode;
};

type FormState = {
  reason: string;
  totalTimes: string;
  usedTimes: string;
  weightLimitJin: string;
};

type CreateFormState = FormState & {
  templateId: string;
  userId: string;
};

const STATUS_LABELS: Record<PackagePanelItem["status"], string> = {
  ACTIVE: "可预订",
  EXPIRED: "不可用",
  FROZEN: "已冻结",
  USED_UP: "已用完",
};

function maskPhone(phone: string | null) {
  if (!phone || phone.length < 7) {
    return phone ?? "未绑定手机号";
  }

  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "未设置";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function buildFormState(item: PackagePanelItem): FormState {
  return {
    reason: "",
    totalTimes: String(item.totalTimes),
    usedTimes: String(item.usedTimes),
    weightLimitJin: String(item.weightLimitJin),
  };
}

function buildCreateFormState(
  memberOptions: PackageManagementPanelProps["memberOptions"],
  packageTemplateOptions: PackageManagementPanelProps["packageTemplateOptions"],
): CreateFormState {
  const template = packageTemplateOptions[0] ?? null;

  return {
    reason: "后台开通用户套餐",
    templateId: template?.id ?? "",
    totalTimes: template ? String(template.totalTimes) : "",
    usedTimes: "0",
    userId: memberOptions[0]?.id ?? "",
    weightLimitJin: template ? String(template.weightLimitJin) : "",
  };
}

function formatMemberOption(member: {
  nickname: string | null;
  phone: string | null;
}) {
  return `${member.nickname ?? "未命名会员"} · ${maskPhone(member.phone)}`;
}

export function PackageManagementPanel({
  initialItems,
  initialPagination,
  initialSummary,
  memberOptions,
  packageTemplateOptions,
  store,
}: PackageManagementPanelProps) {
  const [items, setItems] = useState(() => normalizePackagePanelItems(initialItems));
  const [pagination, setPagination] = useState(initialPagination);
  const [summary, setSummary] = useState(initialSummary);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [initialForm, setInitialForm] = useState<FormState | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(() =>
    buildCreateFormState(memberOptions, packageTemplateOptions),
  );
  const [fullscreen, setFullscreen] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    PackagePanelItem["status"] | "ALL"
  >("ALL");
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
  } | null>(null);

  async function reloadPackages(
    page = pagination.page,
    filters = { query, statusFilter },
  ) {
    if (!store) {
      return;
    }

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pagination.pageSize),
      storeId: store.id,
    });
    const nextQuery = filters.query.trim();
    if (nextQuery) {
      params.set("query", nextQuery);
    }
    if (filters.statusFilter !== "ALL") {
      params.set("status", filters.statusFilter);
    }

    setLoadingList(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/user-packages?${params.toString()}`);
      const result = (await response.json()) as {
        data?: {
          items: PackagePanelItem[];
          pagination: AdminPaginationMeta;
          summary: typeof initialSummary;
        };
        error?: { message: string };
        success: boolean;
      };

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error?.message ?? "加载套餐失败");
      }

      setItems(normalizePackagePanelItems(result.data.items));
      setPagination(result.data.pagination);
      setSummary(result.data.summary);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载套餐失败");
    } finally {
      setLoadingList(false);
    }
  }

  function resetFilters() {
    setQuery("");
    setStatusFilter("ALL");
    void reloadPackages(1, { query: "", statusFilter: "ALL" });
  }

  function openCreateModal() {
    setCreateForm(buildCreateFormState(memberOptions, packageTemplateOptions));
    setCreateOpen(true);
    setError(null);
  }

  function closeCreateModal() {
    if (saving) {
      return;
    }

    setCreateOpen(false);
    setError(null);
  }

  function updateCreateTemplate(templateId: string) {
    const template = packageTemplateOptions.find((item) => item.id === templateId);
    setCreateForm((value) => ({
      ...value,
      templateId,
      totalTimes: template ? String(template.totalTimes) : value.totalTimes,
      weightLimitJin: template
        ? String(template.weightLimitJin)
        : value.weightLimitJin,
    }));
  }

  function openModal(item: PackagePanelItem, mode: ModalMode) {
    const nextForm = buildFormState(item);
    setModal({ item, mode });
    setForm(nextForm);
    setInitialForm(nextForm);
    setFullscreen(false);
    setOffset({ x: 0, y: 0 });
    setError(null);
    void hydratePackageDetail(item);
  }

  async function hydratePackageDetail(item: PackagePanelItem) {
    if (!store) {
      return;
    }

    setLoadingDetail(true);

    try {
      const detail = await loadDetailResource<PackagePanelItem>(
        buildStoreScopedDetailPath("user-packages", item.id, store.id),
        "userPackage",
      );

      const normalizedDetail = normalizePackagePanelItem(detail);
      setItems((value) => replaceItemById(value, normalizedDetail));
      setModal((current) =>
        current?.item.id === item.id
          ? { ...current, item: normalizedDetail }
          : current,
      );
      const nextForm = buildFormState(normalizedDetail);
      setForm((current) => (current ? nextForm : current));
      setInitialForm(nextForm);
    } catch (detailError) {
      setError(
        detailError instanceof Error ? detailError.message : "套餐详情加载失败",
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
      modal?.mode !== "detail" &&
      form &&
      initialForm &&
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
    setForm(null);
    setInitialForm(null);
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

  async function submitCreateModal() {
    if (!store) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/user-packages", {
        body: JSON.stringify({
          reason: createForm.reason,
          storeId: store.id,
          templateId: createForm.templateId,
          totalTimes: createForm.totalTimes,
          usedTimes: createForm.usedTimes,
          userId: createForm.userId,
          weightLimitJin: createForm.weightLimitJin,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as {
        error?: { message: string };
        success: boolean;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message ?? "新增套餐失败");
      }

      await reloadPackages(1);
      setCreateOpen(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "新增套餐失败",
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitModal() {
    if (!modal || modal.mode === "detail" || !form || !store) {
      return;
    }

    setSaving(true);
    setError(null);

    const isAdjust = modal.mode === "adjust";
    const isDelete = modal.mode === "delete";
    const endpoint = isAdjust
      ? `/api/admin/user-packages/${modal.item.id}`
      : isDelete
        ? `/api/admin/user-packages/${modal.item.id}`
        : `/api/admin/user-packages/${modal.item.id}/${modal.mode}`;
    const payload = isAdjust
      ? {
          reason: form.reason,
          storeId: store.id,
          totalTimes: form.totalTimes,
          usedTimes: form.usedTimes,
          weightLimitJin: form.weightLimitJin,
        }
      : {
          reason: form.reason,
          storeId: store.id,
        };

    try {
      const response = await fetch(endpoint, {
        body: JSON.stringify(payload),
        headers: { "content-type": "application/json" },
        method: isAdjust ? "PATCH" : isDelete ? "DELETE" : "POST",
      });
      const result = (await response.json()) as {
        data?: {
          userPackage: Partial<PackagePanelItem>;
        };
        error?: { message: string };
        success: boolean;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message ?? "操作失败");
      }

      setItems((value) =>
        isDelete
          ? value.filter((item) => item.id !== modal.item.id)
          : value.map((item) =>
              item.id === modal.item.id
                ? normalizePackagePanelItem({
                    ...item,
                    ...result.data?.userPackage,
                  })
                : item,
            ),
      );
      await reloadPackages(pagination.page);
      setModal(null);
      setForm(null);
      setInitialForm(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "操作失败");
    } finally {
      setSaving(false);
    }
  }

  const modalTitle =
    modal?.mode === "detail"
      ? "用户套餐详情"
      : modal?.mode === "adjust"
      ? "调整用户套餐"
      : modal?.mode === "delete"
      ? "删除用户套餐"
      : modal?.mode === "freeze"
        ? "冻结用户套餐"
        : "解冻用户套餐";

  return (
    <section className="rounded-2xl border border-[#dbe6dc] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1f8f4f]">
            <PackageCheck size={18} />
            用户套餐管理
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-normal">
            用户套餐
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#66756d]">
            会员套餐独立于后台用户，可冻结、解冻和调整次数。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ["全部", summary.total],
            ["可预订", summary.active],
            ["冻结", summary.frozen],
            ["不可用", summary.expired],
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
            className="inline-flex h-[58px] items-center gap-2 rounded-xl bg-[#1f8f4f] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={
              !store ||
              memberOptions.length === 0 ||
              packageTemplateOptions.length === 0
            }
            onClick={openCreateModal}
            title={
              memberOptions.length === 0
                ? "暂无可选择会员"
                : packageTemplateOptions.length === 0
                  ? "暂无可用套餐模板"
                  : "新增用户套餐"
            }
            type="button"
          >
            <Plus size={16} />
            新增用户套餐
          </button>
          <button
            className="h-[58px] rounded-xl border border-dashed border-[#b8d8bf] bg-[#f8fff8] px-4 text-sm font-semibold text-[#1f8f4f] disabled:cursor-not-allowed disabled:opacity-60"
            disabled
            title="微信支付暂未开放，购买套餐入口预留"
            type="button"
          >
            购买套餐预留
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] p-3">
        <label className="flex min-w-[260px] flex-1 flex-col gap-1 text-xs font-semibold text-[#66756d]">
          关键字
          <input
            className="h-10 rounded-xl border border-[#dbe6dc] bg-white px-3 text-sm font-normal text-[#15261d] outline-none focus:border-[#1f8f4f]"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void reloadPackages(1);
              }
            }}
            placeholder="会员昵称 / 手机号 / 套餐名称"
            value={query}
          />
        </label>
        <label className="flex w-40 flex-col gap-1 text-xs font-semibold text-[#66756d]">
          状态
          <Select
            onValueChange={(value) =>
              setStatusFilter(value as PackagePanelItem["status"] | "ALL")
            }
            value={statusFilter}
          >
            <SelectTrigger className="h-10 rounded-xl border-[#dbe6dc] bg-white text-sm font-normal text-[#15261d]">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="ALL">全部状态</SelectItem>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <button
          className="h-10 rounded-xl bg-[#1f8f4f] px-5 text-sm font-semibold text-white disabled:opacity-60"
          disabled={loadingList || !store}
          onClick={() => void reloadPackages(1)}
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
              <th className="px-4 py-3 font-medium">会员</th>
              <th className="px-4 py-3 font-medium">套餐</th>
              <th className="px-4 py-3 font-medium">剩余次数</th>
              <th className="px-4 py-3 font-medium">添加时间</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf2ed]">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-4">
                  <div className="font-semibold">
                    {item.user.nickname ?? "未命名会员"}
                  </div>
                  <div className="mt-1 text-xs text-[#66756d]">
                    {maskPhone(item.user.phone)}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-semibold">{item.nameSnapshot}</div>
                  <div className="mt-1 text-xs text-[#66756d]">
                    每次 {item.weightLimitJin} 斤
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-semibold">
                    {item.remainingTimes}/{item.totalTimes}
                  </div>
                  <div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-[#edf2ed]">
                    <div
                      className="h-full rounded-full bg-[#1f8f4f]"
                      style={{ width: `${Math.min(100, item.usagePercent)}%` }}
                    />
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-semibold">{formatDate(item.createdAt)}</div>
                  <div className="mt-1 text-xs text-[#66756d]">
                    先进先用
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="rounded-full bg-[#e8f6ed] px-3 py-1 text-xs font-semibold text-[#1f8f4f]">
                    {STATUS_LABELS[item.status]}
                  </span>
                  {item.frozenReason ? (
                    <div className="mt-2 max-w-36 truncate text-xs text-[#66756d]">
                      {item.frozenReason}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      className="grid h-9 w-9 place-items-center rounded-xl border border-[#dbe6dc] text-[#1f8f4f] hover:bg-[#f3f7f1]"
                      onClick={() => openModal(item, "detail")}
                      title="查看详情"
                      type="button"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      className="grid h-9 w-9 place-items-center rounded-xl border border-[#dbe6dc] text-[#1f8f4f] hover:bg-[#f3f7f1]"
                      onClick={() => openModal(item, "adjust")}
                      title="调整套餐"
                      type="button"
                    >
                      <Pencil size={16} />
                    </button>
                    {item.status === "FROZEN" ? (
                      <button
                        className="grid h-9 w-9 place-items-center rounded-xl border border-[#dbe6dc] text-[#1f8f4f] hover:bg-[#f3f7f1]"
                        onClick={() => openModal(item, "unfreeze")}
                        title="解冻套餐"
                        type="button"
                      >
                        <RotateCcw size={16} />
                      </button>
                    ) : (
                      <button
                        className="grid h-9 w-9 place-items-center rounded-xl border border-[#f2d5c8] text-[#b85a2b] hover:bg-[#fff7f2]"
                        onClick={() => openModal(item, "freeze")}
                        title="冻结套餐"
                        type="button"
                      >
                        <LockKeyhole size={16} />
                      </button>
                    )}
                    <button
                      className="grid h-9 w-9 place-items-center rounded-xl border border-red-100 text-red-600 hover:bg-red-50"
                      onClick={() => openModal(item, "delete")}
                      title="删除套餐"
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-[#66756d]" colSpan={6}>
                  暂无用户套餐
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <AdminPagination
          disabled={loadingList}
          onPageChange={(nextPage) => void reloadPackages(nextPage)}
          pagination={pagination}
        />
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-50 bg-[#0f2418]/35 p-5">
          <div
            aria-modal="true"
            className="mx-auto flex max-h-full min-h-[560px] w-[720px] max-w-full flex-col overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-2xl"
            role="dialog"
          >
            <div className="flex items-center justify-between border-b border-[#dbe6dc] px-6 py-4">
              <div>
                <div className="text-lg font-semibold">新增用户套餐</div>
                <div className="mt-1 text-sm text-[#66756d]">
                  给已有会员手工开通套餐，附加权益会按模板同步生成。
                </div>
              </div>
              <button
                className="grid h-9 w-9 place-items-center rounded-xl border border-red-100 bg-red-50 text-red-600"
                onClick={closeCreateModal}
                title="关闭"
                type="button"
              >
                <X size={17} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  会员
                  <Select
                    onValueChange={(value) =>
                      setCreateForm((current) => ({ ...current, userId: value }))
                    }
                    value={createForm.userId}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-[#dbe6dc]">
                      <SelectValue placeholder="选择会员" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      {memberOptions.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {formatMemberOption(member)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  套餐模板
                  <Select
                    onValueChange={updateCreateTemplate}
                    value={createForm.templateId}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-[#dbe6dc]">
                      <SelectValue placeholder="选择套餐模板" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      {packageTemplateOptions.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  总次数
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    min={1}
                    onChange={(event) =>
                      setCreateForm((value) => ({
                        ...value,
                        totalTimes: event.target.value,
                      }))
                    }
                    type="number"
                    value={createForm.totalTimes}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  已用次数
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    min={0}
                    onChange={(event) =>
                      setCreateForm((value) => ({
                        ...value,
                        usedTimes: event.target.value,
                      }))
                    }
                    type="number"
                    value={createForm.usedTimes}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  单次斤数
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    min={0.5}
                    onChange={(event) =>
                      setCreateForm((value) => ({
                        ...value,
                        weightLimitJin: event.target.value,
                      }))
                    }
                    step={0.5}
                    type="number"
                    value={createForm.weightLimitJin}
                  />
                </label>
              </div>

              <label className="mt-5 flex flex-col gap-2 text-sm font-medium">
                操作原因
                <textarea
                  className="min-h-24 resize-y rounded-xl border border-[#dbe6dc] p-3 outline-none focus:border-[#1f8f4f]"
                  onChange={(event) =>
                    setCreateForm((value) => ({
                      ...value,
                      reason: event.target.value,
                    }))
                  }
                  placeholder="例如：线下购买开通、后台补录"
                  value={createForm.reason}
                />
              </label>

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
                onClick={closeCreateModal}
                type="button"
              >
                取消
              </button>
              <button
                className="h-10 rounded-xl bg-[#1f8f4f] px-5 font-semibold text-white disabled:opacity-60"
                disabled={
                  saving ||
                  !createForm.userId ||
                  !createForm.templateId ||
                  !createForm.reason.trim()
                }
                onClick={() => void submitCreateModal()}
                type="button"
              >
                {saving ? "保存中" : "开通套餐"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modal && form ? (
        <div className="fixed inset-0 z-50 bg-[#0f2418]/35 p-5">
          <div
            aria-modal="true"
            className={[
              "mx-auto flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-2xl",
              fullscreen
                ? "h-full w-full"
                : "h-[66vh] w-[720px] max-w-full resize",
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
                  {modalTitle} · {modal.item.user.nickname ?? modal.item.user.phone}
                </div>
                {loadingDetail ? (
                  <div className="mt-1 text-sm text-[#66756d]">
                    正在加载最新套餐详情
                  </div>
                ) : null}
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
              <div className="rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] p-4 text-sm leading-7">
                <div className="font-semibold">{modal.item.nameSnapshot}</div>
                <div className="text-[#66756d]">
                  {maskPhone(modal.item.user.phone)} · 当前{" "}
                  {modal.item.remainingTimes}/{modal.item.totalTimes} 次
                </div>
                <div className="mt-2 grid gap-2 text-xs text-[#66756d] md:grid-cols-2">
                  <span>
                    最近订单 {modal.item.recentOrders?.length ?? 0} 条
                  </span>
                  <span>
                    操作日志 {modal.item.operationLogs?.length ?? 0} 条
                  </span>
                </div>
              </div>
              {modal.item.operationLogs?.[0] ? (
                <div className="mt-3 rounded-xl border border-[#dbe6dc] px-4 py-3 text-sm">
                  最近操作：{modal.item.operationLogs[0].reason}
                  {modal.item.operationLogs[0].operator
                    ? ` · ${modal.item.operationLogs[0].operator.name}`
                    : ""}
                </div>
              ) : null}

              {modal.mode === "delete" ? (
                <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                  只允许删除误开通且没有订单记录的套餐。已有订单记录的套餐请使用冻结，保留会员和订单历史。
                </div>
              ) : null}

              {modal.mode === "adjust" ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    总次数
                    <input
                      className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      min={1}
                      onChange={(event) =>
                        setForm((value) =>
                          value ? { ...value, totalTimes: event.target.value } : value,
                        )
                      }
                      type="number"
                      value={form.totalTimes}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    已用次数
                    <input
                      className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      min={0}
                      onChange={(event) =>
                        setForm((value) =>
                          value ? { ...value, usedTimes: event.target.value } : value,
                        )
                      }
                      type="number"
                      value={form.usedTimes}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    单次斤数
                    <input
                      className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      min={0.5}
                      onChange={(event) =>
                        setForm((value) =>
                          value
                            ? { ...value, weightLimitJin: event.target.value }
                            : value,
                        )
                      }
                      step={0.5}
                      type="number"
                      value={form.weightLimitJin}
                    />
                  </label>
                </div>
              ) : null}

              {modal.mode !== "detail" ? (
                <label className="mt-5 flex flex-col gap-2 text-sm font-medium">
                  操作原因
                  <textarea
                    className="min-h-24 resize-y rounded-xl border border-[#dbe6dc] p-3 outline-none focus:border-[#1f8f4f]"
                    onChange={(event) =>
                      setForm((value) =>
                        value ? { ...value, reason: event.target.value } : value,
                      )
                    }
                    placeholder={
                      modal.mode === "freeze"
                        ? "例如：用户暂停配送"
                        : modal.mode === "delete"
                          ? "例如：误开通删除"
                        : modal.mode === "unfreeze"
                          ? "例如：用户恢复配送"
                          : "例如：后台补偿调整"
                    }
                    value={form.reason}
                  />
                </label>
              ) : null}

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
                {modal.mode === "detail" ? "关闭" : "取消"}
              </button>
              {modal.mode !== "detail" ? (
                <button
                  className={[
                    "h-10 rounded-xl px-5 font-semibold text-white disabled:opacity-60",
                    modal.mode === "delete" ? "bg-red-600" : "bg-[#1f8f4f]",
                  ].join(" ")}
                  disabled={saving || loadingDetail}
                  onClick={submitModal}
                  type="button"
                >
                  {saving ? "保存中" : modal.mode === "delete" ? "删除" : "保存"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
