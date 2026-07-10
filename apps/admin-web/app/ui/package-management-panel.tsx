"use client";

import {
  Check,
  Eye,
  LockKeyhole,
  Maximize2,
  Minimize2,
  PackageCheck,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { adminFilterResetHref } from "@/app/lib/admin-navigation";
import {
  createAdminModalDragState,
  getBoundedAdminModalOffset,
  type AdminModalDragState,
} from "./admin-modal-drag";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  AdminPagination,
  normalizeAdminListPayload,
  type AdminPaginationMeta,
} from "./admin-pagination";
import {
  buildStoreScopedDetailPath,
  loadDetailResource,
  replaceItemById,
} from "./detail-loaders";
import { AdminAlertDialog } from "./admin-confirm-dialog";
import { canCloseAdminModal } from "./admin-modal-close-guard";
import { hasAdminFormChanges } from "./admin-form-dirty";
import {
  normalizePackagePanelItem,
  normalizePackagePanelItems,
  type PackagePanelItem,
} from "./package-management-model";
import { AdminMemberAvatar } from "./admin-member-avatar";
import { AdminFormField } from "./admin-form-field";
import { AdminOverflowText } from "./admin-table-tooltip";
import { formatDateOnly, formatDateTimeMinute } from "./date-format";
import { RequiredLabel } from "./required-mark";

export type { PackagePanelItem } from "./package-management-model";

type StoreOption = {
  id: string;
  name: string;
};

type PackageManagementPanelProps = {
  canWrite?: boolean;
  initialItems: PackagePanelItem[];
  initialPagination: AdminPaginationMeta;
  initialQuery?: string;
  initialSummary: {
    active: number;
    expired: number;
    frozen: number;
    total: number;
  };
  memberOptions: Array<{
    avatarUrl?: string | null;
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

type PackageFormErrors = Partial<
  Record<"reason" | "templateId" | "totalTimes" | "usedTimes" | "userId" | "weightLimitJin", string>
>;

type PackageListFilters = {
  query: string;
  statusFilter: PackagePanelItem["status"] | "ALL";
};

const STATUS_LABELS: Record<PackagePanelItem["status"], string> = {
  ACTIVE: "可预订",
  EXPIRED: "不可用",
  FROZEN: "已冻结",
  USED_UP: "已用完",
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  CANCELED: "已取消",
  PENDING_SHIPMENT: "待配送",
  SHIPPED: "已发货",
  SIGNED: "已签收",
  VOIDED: "已作废",
};

function displayPhone(phone: string | null) {
  return phone ?? "未绑定手机号";
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
  return `${member.nickname ?? "未命名会员"} · ${displayPhone(member.phone)}`;
}

function shouldRefreshPackageSummary(filters: PackageListFilters) {
  return filters.statusFilter === "ALL" && !filters.query.trim();
}

function hasPackageFormErrors(errors: PackageFormErrors) {
  return Object.values(errors).some(Boolean);
}

function formatPackageQuantity(value: number) {
  return Number(value).toLocaleString("zh-CN", {
    maximumFractionDigits: 2,
  });
}

function packageUsageRows(item: PackagePanelItem) {
  return item.recentOrders ?? [];
}

function formatPackageOrderContent(
  order: NonNullable<PackagePanelItem["recentOrders"]>[number],
) {
  if (order.items?.length) {
    return order.items
      .map(
        (item) =>
          `${item.dishNameSnapshot}${formatPackageQuantity(item.weightJin)}斤`,
      )
      .join("、");
  }

  return `合计 ${formatPackageQuantity(order.totalWeightJin)} 斤`;
}

function validateCreatePackageForm(form: CreateFormState) {
  const errors: PackageFormErrors = {};
  if (!form.userId) {
    errors.userId = "请选择会员";
  }
  if (!form.templateId) {
    errors.templateId = "请选择套餐模板";
  }
  if (!form.usedTimes.trim()) {
    errors.usedTimes = "请输入已用次数";
  }
  if (!form.reason.trim()) {
    errors.reason = "请输入操作原因";
  }
  return errors;
}

function validatePackageActionForm(form: FormState, mode: ModalMode) {
  const errors: PackageFormErrors = {};
  if (mode === "adjust") {
    if (!form.totalTimes.trim()) {
      errors.totalTimes = "请输入总次数";
    }
    if (!form.usedTimes.trim()) {
      errors.usedTimes = "请输入已用次数";
    }
    if (!form.weightLimitJin.trim()) {
      errors.weightLimitJin = "请输入单次斤数";
    }
  }
  if (!form.reason.trim()) {
    errors.reason =
      mode === "delete" ? "请输入删除原因" : mode === "freeze" ? "请输入冻结原因" : "请输入操作原因";
  }
  return errors;
}

export function PackageManagementPanel({
  canWrite = true,
  initialItems,
  initialPagination,
  initialQuery = "",
  initialSummary,
  memberOptions,
  packageTemplateOptions,
  store,
}: PackageManagementPanelProps) {
  const router = useRouter();
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
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [fullscreen, setFullscreen] = useState(true);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createFormErrors, setCreateFormErrors] = useState<PackageFormErrors>({});
  const [formErrors, setFormErrors] = useState<PackageFormErrors>({});
  const [query, setQuery] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState<
    PackagePanelItem["status"] | "ALL"
  >("ALL");
  const dragRef = useRef<AdminModalDragState | null>(null);

  async function reloadPackages(
    page = pagination.page,
    filters: PackageListFilters = { query, statusFilter },
    pageSize = pagination.pageSize,
  ) {
    if (!store) {
      return;
    }

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
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

      const nextList = normalizeAdminListPayload(
        result.data,
        initialSummary,
        pageSize,
      );
      setItems(normalizePackagePanelItems(nextList.items));
      setPagination(nextList.pagination);
      if (shouldRefreshPackageSummary(filters)) {
        setSummary(nextList.summary);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载套餐失败");
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    const nextQuery = initialQuery.trim();
    if (!nextQuery) {
      return;
    }

    setQuery(nextQuery);
    setStatusFilter("ALL");
    void reloadPackages(1, { query: nextQuery, statusFilter: "ALL" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  function resetFilters() {
    setQuery("");
    setStatusFilter("ALL");
    router.replace(
      adminFilterResetHref(
        new URLSearchParams(window.location.search),
        "user-packages",
      ),
    );
    void reloadPackages(1, { query: "", statusFilter: "ALL" });
  }

  function openCreateModal() {
    if (!canWrite || !store) {
      return;
    }

    setCreateForm(buildCreateFormState(memberOptions, packageTemplateOptions));
    setMemberSearch("");
    setMemberPickerOpen(false);
    setTemplateSearch("");
    setTemplatePickerOpen(false);
    setCreateOpen(true);
    setError(null);
    setCreateFormErrors({});
  }

  function closeCreateModal() {
    if (saving) {
      return;
    }

    setCreateOpen(false);
    setMemberPickerOpen(false);
    setTemplatePickerOpen(false);
    setError(null);
    setCreateFormErrors({});
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

  function selectCreateMember(userId: string) {
    setCreateForm((current) => ({ ...current, userId }));
    setMemberPickerOpen(false);
    setMemberSearch("");
  }

  function selectCreateTemplate(templateId: string) {
    updateCreateTemplate(templateId);
    setTemplatePickerOpen(false);
    setTemplateSearch("");
  }

  function openModal(item: PackagePanelItem, mode: ModalMode) {
    if (mode !== "detail" && !canWrite) {
      return;
    }

    const nextForm = buildFormState(item);
    setModal({ item, mode });
    setForm(nextForm);
    setInitialForm(nextForm);
    setFormErrors({});
    setFullscreen(true);
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
    setFormErrors({});
  }

  function handleHeaderPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (fullscreen) {
      return;
    }

    const nextDrag = createAdminModalDragState(event, offset);
    if (!nextDrag) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = nextDrag;
  }

  function handleHeaderPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    setOffset(getBoundedAdminModalOffset(drag, event.clientX, event.clientY));
  }

  function handleHeaderPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  async function submitCreateModal() {
    if (!canWrite || !store) {
      return;
    }

    const validationErrors = validateCreatePackageForm(createForm);
    setCreateFormErrors(validationErrors);
    if (hasPackageFormErrors(validationErrors)) {
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
          usedTimes: createForm.usedTimes,
          userId: createForm.userId,
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
    if (!canWrite || !modal || modal.mode === "detail" || !form || !store) {
      return;
    }

    setSaving(true);
    setError(null);

    const isAdjust = modal.mode === "adjust";
    const isDelete = modal.mode === "delete";
    const validationErrors = validatePackageActionForm(form, modal.mode);
    setFormErrors(validationErrors);
    if (hasPackageFormErrors(validationErrors)) {
      return;
    }
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
  const selectedCreateMember =
    memberOptions.find((member) => member.id === createForm.userId) ?? null;
  const selectedCreateTemplate =
    packageTemplateOptions.find((template) => template.id === createForm.templateId) ??
    null;
  const normalizedMemberSearch = memberSearch.trim().toLowerCase();
  const filteredMemberOptions = normalizedMemberSearch
    ? memberOptions.filter((member) =>
        [member.nickname ?? "", member.phone ?? "", member.id]
          .join(" ")
          .toLowerCase()
          .includes(normalizedMemberSearch),
      )
    : memberOptions;
  const normalizedTemplateSearch = templateSearch.trim().toLowerCase();
  const filteredPackageTemplateOptions = normalizedTemplateSearch
    ? packageTemplateOptions.filter((template) =>
        [template.name, template.totalTimes, template.weightLimitJin]
          .join(" ")
          .toLowerCase()
          .includes(normalizedTemplateSearch),
      )
    : packageTemplateOptions;

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
          {canWrite ? (
            <button
              className="inline-flex h-[58px] items-center gap-2 rounded-xl bg-[#1f8f4f] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#a8b9ae]"
              disabled={
                !store ||
                memberOptions.length === 0 ||
                packageTemplateOptions.length === 0
              }
              onClick={openCreateModal}
              title={
                !store
                  ? "当前账号未分配数据范围"
                  : memberOptions.length === 0
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
          ) : null}
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
          className="h-10 rounded-xl bg-[#1f8f4f] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#a8b9ae]"
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
                  <div className="flex min-w-0 items-center gap-3">
                    <AdminMemberAvatar
                      avatarUrl={item.user.avatarUrl}
                      name={item.user.nickname}
                      phone={item.user.phone}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="truncate font-semibold">
                        {item.user.nickname ?? "未命名会员"}
                      </div>
                      <div className="mt-1 text-xs text-[#66756d]">
                        {displayPhone(item.user.phone)}
                      </div>
                    </div>
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
                  <div className="font-semibold">{formatDateOnly(item.createdAt)}</div>
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
                  <div className="flex flex-wrap justify-end gap-2 whitespace-nowrap">
                    <Button
                      className="border-[#dbe6dc] text-[#1f8f4f]"
                      onClick={() => openModal(item, "detail")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Eye data-icon="inline-start" />
                      查看
                    </Button>
                    {canWrite ? (
                      <>
                        <Button
                          className="border-[#dbe6dc] text-[#1f8f4f]"
                          onClick={() => openModal(item, "adjust")}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Pencil data-icon="inline-start" />
                          调整
                        </Button>
                        {item.status === "FROZEN" ? (
                          <Button
                            className="border-[#dbe6dc] text-[#1f8f4f]"
                            onClick={() => openModal(item, "unfreeze")}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <RotateCcw data-icon="inline-start" />
                            解冻
                          </Button>
                        ) : (
                          <Button
                            className="border-[#f2d5c8] text-[#b85a2b] hover:bg-[#fff7f2]"
                            onClick={() => openModal(item, "freeze")}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <LockKeyhole data-icon="inline-start" />
                            冻结
                          </Button>
                        )}
                        <Button
                          className="border-red-100 text-red-600 hover:bg-red-50"
                          onClick={() => openModal(item, "delete")}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Trash2 data-icon="inline-start" />
                          删除
                        </Button>
                      </>
                    ) : null}
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
          onPageSizeChange={(nextPageSize) =>
            void reloadPackages(1, { query, statusFilter }, nextPageSize)
          }
          pagination={pagination}
        />
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-50 bg-[#0f2418]/35 p-5">
          <div
            aria-modal="true"
            data-admin-modal-shell
            data-fullscreen={fullscreen ? "true" : "false"}
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
                <AdminFormField
                  error={createFormErrors.userId}
                  label="会员"
                  required
                >
                  {(invalid) => (
                  <Popover
                    open={memberPickerOpen}
                    onOpenChange={setMemberPickerOpen}
                  >
                    <PopoverTrigger asChild>
                      <button
                        aria-invalid={invalid}
                        className="flex h-11 w-full items-center justify-between rounded-xl border border-[#dbe6dc] bg-white px-3 text-left text-base font-normal text-[#102017] outline-none transition focus:border-[#1f8f4f] focus:ring-4 focus:ring-[#1f8f4f]/10"
                        type="button"
                      >
                        <span className="min-w-0 truncate">
                          {selectedCreateMember
                            ? formatMemberOption(selectedCreateMember)
                            : "选择会员"}
                        </span>
                        <Search className="ml-3 h-4 w-4 shrink-0 text-[#66756d]" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="z-[70] w-[var(--radix-popover-trigger-width)] p-2"
                    >
                      <div className="flex h-10 items-center gap-2 rounded-lg border border-[#dbe6dc] bg-[#f8fbf7] px-3">
                        <Search className="h-4 w-4 shrink-0 text-[#66756d]" />
                        <input
                          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
                          onChange={(event) => setMemberSearch(event.target.value)}
                          placeholder="搜索昵称 / 手机号"
                          value={memberSearch}
                        />
                      </div>
                      <div className="mt-2 max-h-64 overflow-auto">
                        {filteredMemberOptions.map((member) => (
                          <button
                            className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-[#eff8f1]"
                            key={member.id}
                            onClick={() => selectCreateMember(member.id)}
                            type="button"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <AdminMemberAvatar
                                avatarUrl={member.avatarUrl}
                                name={member.nickname}
                                phone={member.phone}
                                size="sm"
                              />
                              <span className="min-w-0 truncate">
                                {formatMemberOption(member)}
                              </span>
                            </span>
                            {member.id === createForm.userId ? (
                              <Check className="ml-3 h-4 w-4 shrink-0 text-[#1f8f4f]" />
                            ) : null}
                          </button>
                        ))}
                        {filteredMemberOptions.length === 0 ? (
                          <div className="px-3 py-6 text-center text-sm text-[#66756d]">
                            没有匹配会员
                          </div>
                        ) : null}
                      </div>
                    </PopoverContent>
                  </Popover>
                  )}
                </AdminFormField>
                <AdminFormField
                  error={createFormErrors.templateId}
                  label="套餐模板"
                  required
                >
                  {(invalid) => (
                  <Popover
                    open={templatePickerOpen}
                    onOpenChange={setTemplatePickerOpen}
                  >
                    <PopoverTrigger asChild>
                      <button
                        aria-invalid={invalid}
                        className="flex h-11 w-full items-center justify-between rounded-xl border border-[#dbe6dc] bg-white px-3 text-left text-base font-normal text-[#102017] outline-none transition focus:border-[#1f8f4f] focus:ring-4 focus:ring-[#1f8f4f]/10"
                        type="button"
                      >
                        <span className="min-w-0 truncate">
                          {selectedCreateTemplate
                            ? selectedCreateTemplate.name
                            : "选择套餐模板"}
                        </span>
                        <Search className="ml-3 h-4 w-4 shrink-0 text-[#66756d]" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="z-[70] w-[var(--radix-popover-trigger-width)] p-2"
                    >
                      <div className="flex h-10 items-center gap-2 rounded-lg border border-[#dbe6dc] bg-[#f8fbf7] px-3">
                        <Search className="h-4 w-4 shrink-0 text-[#66756d]" />
                        <input
                          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
                          onChange={(event) => setTemplateSearch(event.target.value)}
                          placeholder="搜索套餐名称"
                          value={templateSearch}
                        />
                      </div>
                      <div className="mt-2 max-h-64 overflow-auto">
                        {filteredPackageTemplateOptions.map((template) => (
                          <button
                            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-[#eff8f1]"
                            key={template.id}
                            onClick={() => selectCreateTemplate(template.id)}
                            type="button"
                          >
                            <span className="min-w-0 truncate">
                              {template.name} · {template.totalTimes}次 · 每次{" "}
                              {template.weightLimitJin}斤
                            </span>
                            {template.id === createForm.templateId ? (
                              <Check className="ml-3 h-4 w-4 shrink-0 text-[#1f8f4f]" />
                            ) : null}
                          </button>
                        ))}
                        {filteredPackageTemplateOptions.length === 0 ? (
                          <div className="px-3 py-6 text-center text-sm text-[#66756d]">
                            没有匹配套餐模板
                          </div>
                        ) : null}
                      </div>
                    </PopoverContent>
                  </Popover>
                  )}
                </AdminFormField>
                <AdminFormField label="总次数" required>
                  {() => (
                  <input
                    aria-readonly="true"
                    className="h-11 rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] px-3 text-[#66756d] outline-none"
                    readOnly
                    type="text"
                    value={createForm.totalTimes}
                  />
                  )}
                </AdminFormField>
                <AdminFormField
                  error={createFormErrors.usedTimes}
                  label="已用次数"
                  required
                >
                  {(invalid) => (
                  <input
                    aria-invalid={invalid}
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
                  )}
                </AdminFormField>
                <AdminFormField label="单次斤数" required>
                  {() => (
                  <input
                    aria-readonly="true"
                    className="h-11 rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] px-3 text-[#66756d] outline-none"
                    readOnly
                    type="text"
                    value={createForm.weightLimitJin}
                  />
                  )}
                </AdminFormField>
              </div>

              <AdminFormField
                className="mt-5"
                error={createFormErrors.reason}
                label="操作原因"
                required
              >
                {(invalid) => (
                <textarea
                  aria-invalid={invalid}
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
                )}
              </AdminFormField>

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
            data-admin-modal-shell
            data-fullscreen={fullscreen ? "true" : "false"}
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
              data-admin-modal-drag-handle
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
                <div className="flex items-center gap-3">
                  <AdminMemberAvatar
                    avatarUrl={modal.item.user.avatarUrl}
                    name={modal.item.user.nickname}
                    phone={modal.item.user.phone}
                  />
                  <div className="min-w-0">
                    <div className="font-semibold">{modal.item.nameSnapshot}</div>
                    <div className="truncate text-[#66756d]">
                      {modal.item.user.nickname ?? "未命名会员"} ·{" "}
                      {displayPhone(modal.item.user.phone)} · 当前{" "}
                      {modal.item.remainingTimes}/{modal.item.totalTimes} 次
                    </div>
                  </div>
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

              {modal.mode === "detail" ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-xl border border-[#dbe6dc] bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">套餐详情</div>
                      <span className="rounded-full bg-[#e8f6ed] px-3 py-1 text-xs font-semibold text-[#1f8f4f]">
                        {STATUS_LABELS[modal.item.status]}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm md:grid-cols-4 lg:grid-cols-2">
                      <div>
                        <div className="text-xs text-[#66756d]">总次数</div>
                        <div className="mt-1 font-semibold">{modal.item.totalTimes} 次</div>
                      </div>
                      <div>
                        <div className="text-xs text-[#66756d]">已用次数</div>
                        <div className="mt-1 font-semibold">{modal.item.usedTimes} 次</div>
                      </div>
                      <div>
                        <div className="text-xs text-[#66756d]">剩余次数</div>
                        <div className="mt-1 font-semibold">{modal.item.remainingTimes} 次</div>
                      </div>
                      <div>
                        <div className="text-xs text-[#66756d]">单次斤数</div>
                        <div className="mt-1 font-semibold">{modal.item.weightLimitJin} 斤</div>
                      </div>
                      <div>
                        <div className="text-xs text-[#66756d]">创建时间</div>
                        <div className="mt-1 font-semibold">{formatDateTimeMinute(modal.item.createdAt)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[#66756d]">最近使用</div>
                        <div className="mt-1 font-semibold">{formatDateTimeMinute(modal.item.lastUsedAt)}</div>
                      </div>
                    </div>
                    <div className="mt-4 border-t border-[#edf2ed] pt-3">
                      <div className="text-xs font-semibold text-[#66756d]">附加权益</div>
                      {modal.item.benefits?.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {modal.item.benefits.map((benefit) => {
                            const remainingQuantity = Math.max(
                              Number(benefit.totalQuantity) - Number(benefit.usedQuantity),
                              0,
                            );
                            return (
                              <div
                                className="rounded-lg border border-[#f1e1b8] bg-[#fffdf5] px-3 py-2 text-sm"
                                key={benefit.id}
                              >
                                <span className="font-semibold">{benefit.nameSnapshot}</span>
                                <span className="ml-2 text-[#66756d]">
                                  {formatPackageQuantity(benefit.usedQuantity)}/
                                  {formatPackageQuantity(benefit.totalQuantity)}
                                  {benefit.unitSnapshot}
                                </span>
                                <span className="ml-2 text-[#9b6508]">
                                  剩余 {formatPackageQuantity(remainingQuantity)}
                                  {benefit.unitSnapshot}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-[#66756d]">无附加权益</div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#dbe6dc] bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">使用明细</div>
                      <div className="text-xs text-[#66756d]">
                        共 {packageUsageRows(modal.item).length} 条
                      </div>
                    </div>
                    {packageUsageRows(modal.item).length ? (
                      <div className="mt-3 divide-y divide-[#edf2ed] overflow-hidden rounded-xl border border-[#edf2ed]">
                        {packageUsageRows(modal.item).map((order) => {
                          const orderContent = formatPackageOrderContent(order);

                          return (
                            <div
                              className="grid gap-2 px-3 py-2.5 text-sm md:grid-cols-[1.15fr_1.35fr_0.65fr_0.6fr_0.65fr]"
                              key={order.id}
                            >
                              <div className="min-w-0">
                                <AdminOverflowText className="font-semibold" content={order.orderNo}>
                                  {order.orderNo}
                                </AdminOverflowText>
                                <div className="mt-0.5 text-xs text-[#66756d]">
                                  {formatDateTimeMinute(order.createdAt)}
                                </div>
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs text-[#66756d]">订单内容</div>
                                <AdminOverflowText className="font-semibold" content={orderContent}>
                                  {orderContent}
                                </AdminOverflowText>
                              </div>
                              <div>
                                <div className="text-xs text-[#66756d]">使用重量</div>
                                <div className="font-semibold">
                                  {formatPackageQuantity(order.totalWeightJin)} 斤
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-[#66756d]">扣减次数</div>
                                <div className="font-semibold">1 次</div>
                              </div>
                              <div>
                                <div className="text-xs text-[#66756d]">状态</div>
                                <div className="font-semibold">
                                  {ORDER_STATUS_LABELS[order.status] ?? order.status}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-3 rounded-xl border border-dashed border-[#cfe3d3] px-4 py-6 text-center text-sm text-[#66756d]">
                        暂无使用明细
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {modal.mode === "delete" ? (
                <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                  只允许删除误开通且没有订单记录的套餐。已有订单记录的套餐请使用冻结，保留会员和订单历史。
                </div>
              ) : null}

              {modal.mode === "adjust" ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <AdminFormField
                    error={formErrors.totalTimes}
                    label="总次数"
                    required
                  >
                    {(invalid) => (
                    <input
                      aria-invalid={invalid}
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
                    )}
                  </AdminFormField>
                  <AdminFormField
                    error={formErrors.usedTimes}
                    label="已用次数"
                    required
                  >
                    {(invalid) => (
                    <input
                      aria-invalid={invalid}
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
                    )}
                  </AdminFormField>
                  <AdminFormField
                    error={formErrors.weightLimitJin}
                    label="单次斤数"
                    required
                  >
                    {(invalid) => (
                    <input
                      aria-invalid={invalid}
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
                    )}
                  </AdminFormField>
                </div>
              ) : null}

              {canWrite && modal.mode !== "detail" ? (
                <AdminFormField
                  className="mt-5"
                  error={formErrors.reason}
                  label="操作原因"
                  required
                >
                  {(invalid) => (
                  <textarea
                    aria-invalid={invalid}
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
                  )}
                </AdminFormField>
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
      {(createOpen || modal) && error ? (
        <AdminAlertDialog message={error} onClose={() => setError(null)} />
      ) : null}
    </section>
  );
}
