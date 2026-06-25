"use client";

import {
  CreditCard,
  Eye,
  Maximize2,
  Minimize2,
  PackagePlus,
  Pencil,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";

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
import {
  AdminImportDialog,
  type AdminImportResult,
} from "./admin-import-dialog";
import { downloadXlsxTemplate } from "./admin-import-template";
import { canCloseAdminModal } from "./admin-modal-close-guard";
import { hasAdminFormChanges } from "./admin-form-dirty";
import { getImportResultFromApiPayload } from "./member-import-response";
import { RequiredLabel } from "./required-mark";

type StoreOption = {
  id: string;
  name: string;
};

type TemplateStatus = "ACTIVE" | "DISABLED";

type PackageTemplateBenefitPanelItem = {
  id?: string;
  kind: string;
  name: string;
  shipmentGroup?: string | null;
  sortOrder: number;
  totalQuantity: number;
  unit: string;
};

export type PackageTemplatePanelItem = {
  benefits: PackageTemplateBenefitPanelItem[];
  createdAt: string;
  id: string;
  name: string;
  purchaseOrderCount: number;
  sortOrder: number;
  status: TemplateStatus;
  store: StoreOption | null;
  totalTimes: number;
  updatedAt: string;
  userPackageCount: number;
  validDays: number;
  weightLimitJin: number;
};

type PackageTemplateManagementPanelProps = {
  canWrite?: boolean;
  initialItems: PackageTemplatePanelItem[];
  initialPagination: AdminPaginationMeta;
  initialSummary: {
    active: number;
    disabled: number;
    purchaseOrders: number;
    total: number;
    userPackages: number;
  };
  store: StoreOption | null;
};

type PackageTemplateImportResult = AdminImportResult & {
  createdTemplates?: number;
  importedBenefits?: number;
  updatedTemplates?: number;
};

type ModalState =
  | {
      item: PackageTemplatePanelItem;
      mode: "detail";
    }
  | {
      item: PackageTemplatePanelItem;
      mode: "edit";
    }
  | {
      item: null;
      mode: "create";
    };

type FormState = {
  benefits: PackageTemplateBenefitPanelItem[];
  name: string;
  sortOrder: string;
  status: TemplateStatus;
  totalTimes: string;
  weightLimitJin: string;
};

const INTERNAL_VALID_DAYS = 36500;

const STATUS_LABELS: Record<TemplateStatus, string> = {
  ACTIVE: "启用",
  DISABLED: "停用",
};

function buildFormState(item?: PackageTemplatePanelItem | null): FormState {
  return {
    benefits:
      item?.benefits.map((benefit) => ({
        ...benefit,
        kind: benefit.kind || "EXTRA",
        sortOrder: benefit.sortOrder ?? 0,
      })) ?? [],
    name: item?.name ?? "",
    sortOrder: String(item?.sortOrder ?? 0),
    status: item?.status ?? "ACTIVE",
    totalTimes: String(item?.totalTimes ?? 8),
    weightLimitJin: String(item?.weightLimitJin ?? 8),
  };
}

function formatBenefitQuantity(value: number) {
  return Number(value.toFixed(2)).toString();
}

function normalizeIntegerInputText(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  return digits.replace(/^0+(?=\d)/, "");
}

function normalizeDecimalInputText(value: string) {
  const [integer = "", ...decimalParts] = value
    .replace(/[^\d.]/g, "")
    .split(".");
  const decimal = decimalParts.join("");
  if (!integer && !decimal) {
    return "";
  }
  const normalizedInteger = integer.replace(/^0+(?=\d)/, "") || "0";
  return decimalParts.length > 0
    ? `${normalizedInteger}.${decimal}`
    : normalizedInteger;
}

function normalizeDecimalInputNumber(value: string) {
  const normalized = normalizeDecimalInputText(value);
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatTemplateBenefits(item: PackageTemplatePanelItem) {
  const core = `蔬菜 ${item.totalTimes} 次 × ${formatBenefitQuantity(
    item.weightLimitJin,
  )} 斤`;
  const extras = item.benefits.map(
    (benefit) =>
      `${benefit.name} ${formatBenefitQuantity(benefit.totalQuantity)}${benefit.unit}`,
  );
  return [core, ...extras];
}

function generateBenefitKind(name: string, index: number, usedKinds = new Set<string>()) {
  const trimmed = name.trim();
  let base = "EXTRA";
  if (trimmed.includes("鸡蛋")) {
    base = "EGG";
  } else if (
    trimmed.includes("老母鸡") ||
    trimmed.includes("母鸡") ||
    trimmed.includes("鸡")
  ) {
    base = "HEN";
  } else {
    const normalized = trimmed
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    base = normalized || "EXTRA";
  }

  let kind = base;
  let suffix = index + 1;
  while (usedKinds.has(kind)) {
    suffix += 1;
    kind = `${base}_${suffix}`;
  }
  usedKinds.add(kind);
  return kind;
}

function nowIso() {
  return new Date().toISOString();
}

export function PackageTemplateManagementPanel({
  canWrite = true,
  initialItems,
  initialPagination,
  initialSummary,
  store,
}: PackageTemplateManagementPanelProps) {
  const [items, setItems] = useState(initialItems);
  const [pagination, setPagination] = useState(initialPagination);
  const [summary, setSummary] = useState(initialSummary);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [form, setForm] = useState<FormState>(buildFormState());
  const [initialForm, setInitialForm] = useState<FormState>(buildFormState());
  const [fullscreen, setFullscreen] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] =
    useState<PackageTemplateImportResult | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | "ALL">(
    "ALL",
  );
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
  } | null>(null);

  async function reloadTemplates(
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
      const response = await fetch(
        `/api/admin/package-templates?${params.toString()}`,
      );
      const result = (await response.json()) as {
        data?: {
          items: PackageTemplatePanelItem[];
          pagination: AdminPaginationMeta;
          summary: typeof initialSummary;
        };
        error?: { message: string };
        success: boolean;
      };

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error?.message ?? "加载套餐模板失败");
      }

      const nextList = normalizeAdminListPayload(
        result.data,
        initialSummary,
        pagination.pageSize,
      );
      setItems(nextList.items);
      setPagination(nextList.pagination);
      setSummary(nextList.summary);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载套餐模板失败");
    } finally {
      setLoadingList(false);
    }
  }

  function resetFilters() {
    setQuery("");
    setStatusFilter("ALL");
    void reloadTemplates(1, { query: "", statusFilter: "ALL" });
  }

  function resetModalPosition() {
    setFullscreen(false);
    setOffset({ x: 0, y: 0 });
    setError(null);
  }

  function openCreateModal() {
    if (!canWrite || !store) {
      return;
    }

    const nextForm = buildFormState();
    setModal({ item: null, mode: "create" });
    setForm(nextForm);
    setInitialForm(nextForm);
    resetModalPosition();
  }

  function openImportDialog() {
    if (!canWrite || !store) {
      return;
    }
    setImportOpen(true);
    setImportFile(null);
    setImportError(null);
    setImportResult(null);
  }

  function closeImportDialog() {
    if (importing) {
      return;
    }
    setImportOpen(false);
    setImportFile(null);
    setImportError(null);
    setImportResult(null);
  }

  function downloadPackageTemplateImportTemplate() {
    downloadXlsxTemplate(
      "套餐模板导入模板.xlsx",
      "套餐模板导入",
      [
        "套餐名称",
        "总次数",
        "单次斤数",
        "状态",
        "排序",
        "附加权益名称",
        "附加权益总量",
        "附加权益单位",
        "附加权益排序",
      ],
      [
        {
          套餐名称: "8斤周套餐",
          总次数: 8,
          单次斤数: 8,
          状态: "启用",
          排序: 1,
          附加权益名称: "鸡蛋",
          附加权益总量: 1,
          附加权益单位: "箱",
          附加权益排序: 1,
        },
        {
          套餐名称: "8斤周套餐",
          总次数: 8,
          单次斤数: 8,
          状态: "启用",
          排序: 1,
          附加权益名称: "老母鸡",
          附加权益总量: 1,
          附加权益单位: "只",
          附加权益排序: 2,
        },
      ],
    );
  }

  async function submitPackageTemplateImport() {
    if (!store || !importFile) {
      setImportError("请选择要导入的文件");
      return;
    }

    setImporting(true);
    setImportError(null);
    setImportResult(null);

    const body = new FormData();
    body.append("storeId", store.id);
    body.append("file", importFile);

    try {
      const response = await fetch("/api/admin/package-templates/import", {
        body,
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?:
          | PackageTemplateImportResult
          | { result?: PackageTemplateImportResult | null }
          | null;
        error?: { message: string };
        success: boolean;
      };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? "导入失败");
      }
      const result =
        getImportResultFromApiPayload<PackageTemplateImportResult>(payload);
      if (!result) {
        throw new Error("导入完成，但未返回导入结果");
      }
      setImportResult(result);
      await reloadTemplates(1);
    } catch (submitError) {
      setImportError(submitError instanceof Error ? submitError.message : "导入失败");
    } finally {
      setImporting(false);
    }
  }

  function openEditModal(item: PackageTemplatePanelItem) {
    if (!canWrite) {
      return;
    }

    const nextForm = buildFormState(item);
    setModal({ item, mode: "edit" });
    setForm(nextForm);
    setInitialForm(nextForm);
    resetModalPosition();
    void hydrateTemplateDetail(item);
  }

  function openDetailModal(item: PackageTemplatePanelItem) {
    const nextForm = buildFormState(item);
    setModal({ item, mode: "detail" });
    setForm(nextForm);
    setInitialForm(nextForm);
    resetModalPosition();
    void hydrateTemplateDetail(item);
  }

  async function hydrateTemplateDetail(item: PackageTemplatePanelItem) {
    if (!store) {
      return;
    }

    setLoadingDetail(true);

    try {
      const detail = await loadDetailResource<PackageTemplatePanelItem>(
        buildStoreScopedDetailPath("package-templates", item.id, store.id),
        "template",
      );

      setItems((value) => replaceItemById(value, detail));
      setModal((current) => {
        if (
          (current?.mode === "detail" || current?.mode === "edit") &&
          current.item.id === item.id
        ) {
          return { ...current, item: detail };
        }

        return current;
      });
      const nextForm = buildFormState(detail);
      setForm(nextForm);
      setInitialForm(nextForm);
    } catch (detailError) {
      setError(
        detailError instanceof Error ? detailError.message : "套餐模板详情加载失败",
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

  function addBenefit() {
    setForm((current) => ({
      ...current,
      benefits: [
        ...current.benefits,
        {
          kind: "EGG",
          name: "鸡蛋",
          sortOrder: current.benefits.length,
          totalQuantity: 1,
          unit: "箱",
        },
      ],
    }));
  }

  function removeBenefit(index: number) {
    setForm((current) => ({
      ...current,
      benefits: current.benefits.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function updateBenefit<K extends keyof PackageTemplateBenefitPanelItem>(
    index: number,
    key: K,
    value: PackageTemplateBenefitPanelItem[K],
  ) {
    setForm((current) => ({
      ...current,
      benefits: current.benefits.map((benefit, itemIndex) =>
        itemIndex === index ? { ...benefit, [key]: value } : benefit,
      ),
    }));
  }

  async function submitModal() {
    if (!canWrite || !modal || modal.mode === "detail" || !store) {
      return;
    }

    setSaving(true);
    setError(null);

    const usedBenefitKinds = new Set<string>();
    const payload = {
      benefits: form.benefits.map((benefit, index) => ({
        kind: generateBenefitKind(benefit.name, index, usedBenefitKinds),
        name: benefit.name,
        sortOrder: Number.isFinite(benefit.sortOrder) ? benefit.sortOrder : index,
        totalQuantity: benefit.totalQuantity,
        unit: benefit.unit,
      })),
      name: form.name,
      sortOrder: form.sortOrder,
      status: form.status,
      storeId: store.id,
      totalTimes: form.totalTimes,
      validDays: modal.item?.validDays ?? INTERNAL_VALID_DAYS,
      weightLimitJin: form.weightLimitJin,
    };

    try {
      const response = await fetch(
        modal.mode === "create"
          ? "/api/admin/package-templates"
          : `/api/admin/package-templates/${modal.item.id}`,
        {
          body: JSON.stringify(payload),
          headers: { "content-type": "application/json" },
          method: modal.mode === "create" ? "POST" : "PATCH",
        },
      );
      const result = (await response.json()) as {
        data?: {
          template: Partial<PackageTemplatePanelItem>;
        };
        error?: { message: string };
        success: boolean;
      };

      if (!response.ok || !result.success || !result.data?.template) {
        throw new Error(result.error?.message ?? "保存失败");
      }

      const template = result.data.template;
      if (modal.mode === "create") {
        setItems((value) => [
          {
            createdAt: template.createdAt ?? nowIso(),
            benefits: template.benefits ?? form.benefits,
            id: template.id ?? crypto.randomUUID(),
            name: template.name ?? form.name,
            purchaseOrderCount: template.purchaseOrderCount ?? 0,
            sortOrder: template.sortOrder ?? Number(form.sortOrder || 0),
            status: template.status ?? "ACTIVE",
            store,
            totalTimes: template.totalTimes ?? Number(form.totalTimes),
            updatedAt: template.updatedAt ?? nowIso(),
            userPackageCount: template.userPackageCount ?? 0,
            validDays: template.validDays ?? INTERNAL_VALID_DAYS,
            weightLimitJin:
              template.weightLimitJin ?? Number(form.weightLimitJin),
          },
          ...value,
        ]);
      } else {
        setItems((value) =>
          value.map((item) =>
            item.id === modal.item.id
              ? {
                  ...item,
                  ...template,
                  purchaseOrderCount:
                    template.purchaseOrderCount ?? item.purchaseOrderCount,
                  store: item.store,
                  userPackageCount:
                    template.userPackageCount ?? item.userPackageCount,
                }
              : item,
          ),
        );
      }

      await reloadTemplates(modal.mode === "create" ? 1 : pagination.page);
      setModal(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存失败");
  } finally {
      setSaving(false);
    }
  }

  const benefitKindPreview = (() => {
    const usedKinds = new Set<string>();
    return form.benefits.map((benefit, index) =>
      generateBenefitKind(benefit.name, index, usedKinds),
    );
  })();

  return (
    <section className="rounded-2xl border border-[#dbe6dc] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1f8f4f]">
            <PackagePlus size={18} />
            套餐模板管理
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-normal">
            套餐模板
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#66756d]">
            维护会员可购买和可开通的套餐模板。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ["全部", summary.total],
            ["启用", summary.active],
            ["停用", summary.disabled],
            ["购买单", summary.purchaseOrders],
            ["已开通", summary.userPackages],
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
            aria-label="微信支付购买套餐预留"
            className="grid h-[58px] w-[58px] place-items-center rounded-xl border border-dashed border-[#b8d8bf] bg-[#f8fff8] text-[#1f8f4f] disabled:opacity-60"
            disabled
            title="微信支付购买套餐预留"
            type="button"
          >
            <CreditCard size={20} />
          </button>
          {canWrite ? (
            <>
              <button
                className="inline-flex h-[58px] items-center gap-2 rounded-xl border border-[#b8d8bf] bg-[#f8fff8] px-5 text-sm font-semibold text-[#1f8f4f] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!store}
                onClick={openImportDialog}
                title={store ? "导入套餐模板" : "当前账号未分配数据范围"}
                type="button"
              >
                <Upload size={16} />
                导入模板
              </button>
              <button
                className="h-[58px] rounded-xl bg-[#1f8f4f] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#a8b9ae]"
                disabled={!store}
                onClick={openCreateModal}
                title={store ? "新建套餐" : "当前账号未分配数据范围"}
                type="button"
              >
                新建套餐
              </button>
            </>
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
                void reloadTemplates(1);
              }
            }}
            placeholder="套餐名称"
            value={query}
          />
        </label>
        <label className="flex w-40 flex-col gap-1 text-xs font-semibold text-[#66756d]">
          状态
          <select
            className="h-10 rounded-xl border border-[#dbe6dc] bg-white px-3 text-sm font-normal text-[#15261d] outline-none focus:border-[#1f8f4f]"
            onChange={(event) =>
              setStatusFilter(event.target.value as TemplateStatus | "ALL")
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
          className="h-10 rounded-xl bg-[#1f8f4f] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#a8b9ae]"
          disabled={loadingList || !store}
          onClick={() => void reloadTemplates(1)}
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
              <th className="px-4 py-3 font-medium">套餐</th>
              <th className="px-4 py-3 font-medium">权益</th>
              <th className="px-4 py-3 font-medium">使用情况</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf2ed]">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-4">
                  <div className="max-w-56 truncate font-semibold">{item.name}</div>
                  <div className="mt-1 text-xs text-[#66756d]">
                    排序 {item.sortOrder}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="space-y-1">
                    {formatTemplateBenefits(item).map((benefit) => (
                      <div className="text-sm font-semibold" key={benefit}>
                        {benefit}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-semibold">
                    {item.userPackageCount} 个用户套餐
                  </div>
                  <div className="mt-1 text-xs text-[#66756d]">
                    {item.purchaseOrderCount} 个购买单
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="rounded-full bg-[#e8f6ed] px-3 py-1 text-xs font-semibold text-[#1f8f4f]">
                    {STATUS_LABELS[item.status]}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      aria-label="查看套餐详情"
                      className="grid h-9 w-9 place-items-center rounded-xl border border-[#dbe6dc] text-[#1f8f4f] hover:bg-[#f3f7f1]"
                      onClick={() => openDetailModal(item)}
                      title="查看详情"
                      type="button"
                    >
                      <Eye size={16} />
                    </button>
                    {canWrite ? (
                      <button
                        aria-label="编辑套餐"
                        className="grid h-9 w-9 place-items-center rounded-xl border border-[#dbe6dc] text-[#1f8f4f] hover:bg-[#f3f7f1]"
                        onClick={() => openEditModal(item)}
                        title="编辑套餐"
                        type="button"
                      >
                        <Pencil size={16} />
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-[#66756d]" colSpan={5}>
                  暂无套餐模板
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <AdminPagination
          disabled={loadingList}
          onPageChange={(nextPage) => void reloadTemplates(nextPage)}
          pagination={pagination}
        />
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 bg-[#0f2418]/35 p-5">
          <div
            aria-modal="true"
            className={[
              "mx-auto flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-2xl",
              fullscreen
                ? "h-full w-full"
                : "h-[64vh] w-[760px] max-w-full resize",
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
                    ? "新建套餐模板"
                    : modal.mode === "detail"
                      ? `套餐模板详情 · ${modal.item.name}`
                      : `编辑 · ${modal.item.name}`}
                </div>
                <div className="mt-1 truncate text-sm text-[#66756d]">
                  {loadingDetail ? "正在加载最新套餐模板详情" : "套餐模板配置"}
                </div>
              </div>
              <div
                className="flex items-center gap-2"
                onPointerDown={(event) => event.stopPropagation()}
              >
                <button
                  aria-label={fullscreen ? "退出全屏" : "全屏"}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-[#cfe3d3] bg-[#eff8f1] text-[#1f8f4f]"
                  onClick={() => setFullscreen((value) => !value)}
                  title={fullscreen ? "退出全屏" : "全屏"}
                  type="button"
                >
                  {fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                </button>
                <button
                  aria-label="关闭"
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
              {modal.mode !== "create" ? (
                <div className="mb-4 grid gap-3 rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] p-4 text-sm md:grid-cols-2">
                  <div>
                    <div className="text-[#66756d]">已开通用户套餐</div>
                    <div className="mt-1 font-semibold">
                      {modal.item.userPackageCount} 个
                    </div>
                  </div>
                  <div>
                    <div className="text-[#66756d]">购买单预留</div>
                    <div className="mt-1 font-semibold">
                      {modal.item.purchaseOrderCount} 个
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
                  <RequiredLabel>套餐名称</RequiredLabel>
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    onChange={(event) => updateForm("name", event.target.value)}
                    readOnly={modal.mode === "detail"}
                    value={form.name}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  <RequiredLabel>总次数</RequiredLabel>
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    inputMode="numeric"
                    min={1}
                    onChange={(event) =>
                      updateForm(
                        "totalTimes",
                        normalizeIntegerInputText(event.target.value),
                      )
                    }
                    readOnly={modal.mode === "detail"}
                    type="text"
                    value={form.totalTimes}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  <RequiredLabel>单次斤数</RequiredLabel>
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    inputMode="decimal"
                    min={0.5}
                    onChange={(event) =>
                      updateForm(
                        "weightLimitJin",
                        normalizeDecimalInputText(event.target.value),
                      )
                    }
                    readOnly={modal.mode === "detail"}
                    step={0.5}
                    type="text"
                    value={form.weightLimitJin}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  <RequiredLabel>排序</RequiredLabel>
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    inputMode="numeric"
                    onChange={(event) =>
                      updateForm(
                        "sortOrder",
                        normalizeIntegerInputText(event.target.value),
                      )
                    }
                    readOnly={modal.mode === "detail"}
                    type="text"
                    value={form.sortOrder}
                  />
                </label>
	                <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
	                  <RequiredLabel>状态</RequiredLabel>
	                  <select
                    className="h-11 rounded-xl border border-[#dbe6dc] bg-white px-3 outline-none focus:border-[#1f8f4f]"
                    disabled={modal.mode === "detail"}
                    onChange={(event) =>
                      updateForm("status", event.target.value as TemplateStatus)
                    }
                    value={form.status}
                  >
                    <option value="ACTIVE">启用</option>
                    <option value="DISABLED">停用</option>
	                  </select>
	                </label>
	              </div>

	              <div className="mt-6 rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] p-4">
	                <div className="flex items-center justify-between gap-3">
	                  <div>
	                    <div className="text-sm font-semibold">附加权益</div>
	                    <div className="mt-1 text-xs text-[#66756d]">
	                      鸡蛋、老母鸡等独立权益按套餐总量计算，不占蔬菜次数和斤数。
	                    </div>
	                  </div>
	                  {modal.mode !== "detail" ? (
	                    <button
	                      className="h-9 rounded-xl border border-[#b8d8bf] bg-white px-4 text-sm font-semibold text-[#1f8f4f]"
	                      onClick={addBenefit}
	                      type="button"
	                    >
	                      添加权益
	                    </button>
	                  ) : null}
	                </div>
	                <div className="mt-4 space-y-3">
	                  {form.benefits.map((benefit, index) => (
	                    <div
	                      className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(112px,1fr))] gap-3 rounded-xl border border-[#dbe6dc] bg-white p-3"
	                      key={`${benefit.id ?? "benefit"}-${index}`}
	                    >
	                      <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-[#66756d]">
	                        <RequiredLabel>权益名称</RequiredLabel>
	                        <input
	                          className="h-10 w-full min-w-0 rounded-lg border border-[#dbe6dc] px-3 text-sm font-normal text-[#15261d] outline-none focus:border-[#1f8f4f]"
	                          onChange={(event) =>
	                            updateBenefit(index, "name", event.target.value)
	                          }
	                          readOnly={modal.mode === "detail"}
	                          value={benefit.name}
	                        />
	                      </label>
	                      <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-[#66756d]">
	                        <RequiredLabel>总数量</RequiredLabel>
	                        <input
	                          className="h-10 w-full min-w-0 rounded-lg border border-[#dbe6dc] px-3 text-sm font-normal text-[#15261d] outline-none focus:border-[#1f8f4f]"
	                          inputMode="decimal"
	                          min={0.01}
	                          onChange={(event) =>
	                            updateBenefit(
	                              index,
	                              "totalQuantity",
	                              normalizeDecimalInputNumber(event.target.value),
	                            )
	                          }
	                          readOnly={modal.mode === "detail"}
	                          step={0.01}
	                          type="text"
	                          value={formatBenefitQuantity(benefit.totalQuantity)}
	                        />
	                      </label>
	                      <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-[#66756d]">
	                        <RequiredLabel>单位</RequiredLabel>
	                        <input
	                          className="h-10 w-full min-w-0 rounded-lg border border-[#dbe6dc] px-3 text-sm font-normal text-[#15261d] outline-none focus:border-[#1f8f4f]"
	                          onChange={(event) =>
	                            updateBenefit(index, "unit", event.target.value)
	                          }
	                          readOnly={modal.mode === "detail"}
	                          value={benefit.unit}
	                        />
	                      </label>
	                      <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-[#66756d]">
	                        <RequiredLabel>排序</RequiredLabel>
	                        <input
	                          className="h-10 w-full rounded-lg border border-[#dbe6dc] px-3 text-sm font-normal text-[#15261d] outline-none focus:border-[#1f8f4f]"
	                          inputMode="numeric"
	                          onChange={(event) =>
	                            updateBenefit(
	                              index,
	                              "sortOrder",
	                              Number(
	                                normalizeIntegerInputText(event.target.value) ||
	                                  0,
	                              ),
	                            )
	                          }
	                          readOnly={modal.mode === "detail"}
	                          type="text"
	                          value={String(benefit.sortOrder)}
	                        />
	                      </label>
	                      <div className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-[#66756d]">
	                        类型编码
	                        <div className="flex h-10 items-center rounded-lg border border-[#dbe6dc] bg-[#f5f8f3] px-3 font-mono text-sm font-normal text-[#405248]">
	                          {benefitKindPreview[index]}
	                        </div>
	                      </div>
	                      {modal.mode !== "detail" ? (
	                        <div className="flex min-w-0 items-end">
	                          <button
	                            className="h-10 w-full min-w-0 rounded-lg border border-red-100 bg-red-50 px-3 text-xs font-semibold text-red-600"
	                            onClick={() => removeBenefit(index)}
	                            type="button"
	                          >
	                            删除
	                          </button>
	                        </div>
	                      ) : (
	                        <div className="hidden md:block" />
	                      )}
	                    </div>
	                  ))}
	                  {form.benefits.length === 0 ? (
	                    <div className="rounded-xl border border-dashed border-[#cfe3d3] bg-white px-4 py-5 text-sm text-[#66756d]">
	                      暂无附加权益
	                    </div>
	                  ) : null}
	                </div>
	              </div>

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
              {canWrite && modal.mode !== "detail" ? (
                <button
                  className="h-10 rounded-xl bg-[#1f8f4f] px-5 font-semibold text-white disabled:opacity-60"
                  disabled={saving || loadingDetail || !store}
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
      {importOpen ? (
        <AdminImportDialog
          description="上传 Excel 或 CSV 后，按套餐名称新增或更新模板。"
          error={importError}
          file={importFile}
          loading={importing}
          onClose={closeImportDialog}
          onDownloadTemplate={downloadPackageTemplateImportTemplate}
          onFileChange={(file) => {
            setImportFile(file);
            setImportError(null);
            setImportResult(null);
          }}
          onSubmit={submitPackageTemplateImport}
          result={importResult}
          resultCards={[
            { label: "总行数", value: importResult?.totalRows ?? 0 },
            { label: "成功", value: importResult?.importedRows ?? 0 },
            { label: "新增", value: importResult?.createdTemplates ?? 0 },
            { label: "失败", value: importResult?.failedRows ?? 0 },
          ]}
          rules={[
            "同一个套餐名称可写多行，每行填写一个附加权益；附加权益类型编码由系统自动生成。",
            "已有同名模板会更新模板信息；如果文件中填写了附加权益，会用文件中的权益配置替换原配置。",
            "状态可填“启用”或“停用”，文件大小不超过 5MB。",
          ]}
          title="导入套餐模板"
        />
      ) : null}
    </section>
  );
}
