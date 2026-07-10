"use client";

import {
  Boxes,
  Eye,
  ImagePlus,
  Maximize2,
  Minimize2,
  Pencil,
  Power,
  PowerOff,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  createAdminModalDragState,
  getBoundedAdminModalOffset,
  type AdminModalDragState,
} from "./admin-modal-drag";

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
import { canCloseAdminModal } from "./admin-modal-close-guard";
import {
  buildDishFormState,
  hasUnsavedDishModalChanges,
  type DishCategory,
  type DishFormState,
  type DishStatus,
} from "./dish-modal-state";
import { AdminAlertDialog } from "./admin-confirm-dialog";
import {
  AdminImportDialog,
  type AdminImportResult,
} from "./admin-import-dialog";
import { AdminSelect } from "./admin-select";
import { AdminFormField } from "./admin-form-field";
import { downloadXlsxTemplate } from "./admin-import-template";
import { RequiredLabel } from "./required-mark";
import { getImportResultFromApiPayload } from "./member-import-response";

type StoreOption = {
  id: string;
  name: string;
};

type DishCategoryOption = {
  code: string;
  enabled: boolean;
  name: string;
  sortOrder: number;
};

export type DishPanelItem = {
  category: DishCategory;
  createdAt: string;
  deletedAt: string | null;
  description: string | null;
  id: string;
  imageKey: string | null;
  imageUrl: string | null;
  name: string;
  sortOrder: number;
  status: DishStatus;
  stepJin: number;
  stockJin: number;
  store: {
    code: string;
    id: string;
    name: string;
    type: string;
  };
  updatedAt: string;
};

type DishManagementPanelProps = {
  canWrite?: boolean;
  categoryOptions?: DishCategoryOption[];
  initialItems: DishPanelItem[];
  initialPagination: AdminPaginationMeta;
  initialSummary: {
    lowStock: number;
    offSale: number;
    onSale: number;
    stock: number;
    total: number;
  };
  store: StoreOption | null;
};

type DishImportResult = AdminImportResult & {
  createdDishes?: number;
  updatedDishes?: number;
};

type DishModalState =
  | {
      item: DishPanelItem;
      mode: "detail";
    }
  | {
      item: DishPanelItem;
      mode: "edit";
    }
  | {
      item: null;
      mode: "create";
    };

type ModalState = DishModalState;

type DishFormErrors = Partial<
  Record<
    "category" | "name" | "sortOrder" | "status" | "stepJin",
    string
  >
>;

const DEFAULT_CATEGORY_OPTIONS: DishCategoryOption[] = [
  { code: "LEAFY", enabled: true, name: "叶菜", sortOrder: 1 },
  { code: "FRUIT", enabled: true, name: "茄果", sortOrder: 2 },
  { code: "ROOT", enabled: true, name: "根茎", sortOrder: 3 },
  { code: "MUSHROOM", enabled: true, name: "菌菇", sortOrder: 4 },
  { code: "ACTIVITY", enabled: true, name: "活动", sortOrder: 5 },
];

const STATUS_LABELS: Record<DishStatus, string> = {
  OFF_SALE: "已下架",
  ON_SALE: "已上架",
};

const DISH_IMAGE_ACCEPT = "image/avif,image/jpeg,image/png,image/webp";
const DISH_IMAGE_MAX_SIZE = 3 * 1024 * 1024;
const DISH_IMAGE_UPLOAD_TIP =
  "支持 JPG、PNG、WebP、AVIF，单张不超过 3MB；建议使用清晰实拍图。";

function nowIso() {
  return new Date().toISOString();
}

function hasDishFormErrors(errors: DishFormErrors) {
  return Object.values(errors).some(Boolean);
}

function validateDishForm(form: DishFormState, mode: ModalState["mode"]) {
  const errors: DishFormErrors = {};
  if (!form.name.trim()) {
    errors.name = "请输入菜品名称";
  }
  if (!form.category) {
    errors.category = "请选择分类";
  }
  if (!form.status) {
    errors.status = "请选择状态";
  }
  if (!String(form.stepJin).trim()) {
    errors.stepJin = "请输入起订步进";
  }
  if (!String(form.sortOrder).trim()) {
    errors.sortOrder = "请输入排序";
  }
  return errors;
}

export function DishManagementPanel({
  canWrite = true,
  categoryOptions,
  initialItems,
  initialPagination,
  initialSummary,
  store,
}: DishManagementPanelProps) {
  const [items, setItems] = useState(initialItems);
  const [pagination, setPagination] = useState(initialPagination);
  const [summary, setSummary] = useState(initialSummary);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [dishForm, setDishForm] = useState<DishFormState>(
    buildDishFormState(),
  );
  const [initialDishForm, setInitialDishForm] = useState<DishFormState>(
    buildDishFormState(),
  );
  const [fullscreen, setFullscreen] = useState(true);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusChangingId, setStatusChangingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dishFormErrors, setDishFormErrors] = useState<DishFormErrors>({});
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<DishImportResult | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DishStatus | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<DishCategory | "ALL">(
    "ALL",
  );
  const dragRef = useRef<AdminModalDragState | null>(null);
  const resolvedCategoryOptions = (
    categoryOptions?.length ? categoryOptions : DEFAULT_CATEGORY_OPTIONS
  )
    .filter((option) => option.enabled)
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const categoryLabelByCode = new Map(
    [...DEFAULT_CATEGORY_OPTIONS, ...resolvedCategoryOptions].map((option) => [
      option.code,
      option.name,
    ]),
  );

  async function reloadDishes(
    page = pagination.page,
    filters = { categoryFilter, query, statusFilter },
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
    if (filters.categoryFilter !== "ALL") {
      params.set("category", filters.categoryFilter);
    }

    setLoadingList(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/dishes?${params.toString()}`);
      const result = (await response.json()) as {
        data?: {
          items: DishPanelItem[];
          pagination: AdminPaginationMeta;
          summary: typeof initialSummary;
        };
        error?: { message: string };
        success: boolean;
      };

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error?.message ?? "加载菜品失败");
      }

      const nextList = normalizeAdminListPayload(
        result.data,
        initialSummary,
        pageSize,
      );
      setItems(nextList.items);
      setPagination(nextList.pagination);
      setSummary(nextList.summary);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载菜品失败");
    } finally {
      setLoadingList(false);
    }
  }

  function resetFilters() {
    setQuery("");
    setStatusFilter("ALL");
    setCategoryFilter("ALL");
    void reloadDishes(1, {
      categoryFilter: "ALL",
      query: "",
      statusFilter: "ALL",
    });
  }

  function resetModal() {
    setFullscreen(true);
    setOffset({ x: 0, y: 0 });
    setError(null);
  }

  function openCreateModal() {
    if (!canWrite || !store) {
      return;
    }

    const nextForm = {
      ...buildDishFormState(),
      category: resolvedCategoryOptions[0]?.code ?? "LEAFY",
    };
    setModal({ item: null, mode: "create" });
    setDishForm(nextForm);
    setInitialDishForm(nextForm);
    setDishFormErrors({});
    resetModal();
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

  function downloadDishImportTemplate() {
    const category = resolvedCategoryOptions[0]?.name ?? "叶菜";
    downloadXlsxTemplate(
      "菜品导入模板.xlsx",
      "菜品导入",
      ["菜品名称", "分类", "起订步进", "状态", "排序", "描述"],
      [
        {
          菜品名称: "番茄",
          分类: category,
          起订步进: 1,
          状态: "上架",
          排序: 1,
          描述: "本周新鲜到店",
        },
      ],
    );
  }

  async function submitDishImport() {
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
      const response = await fetch("/api/admin/dishes/import", {
        body,
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: DishImportResult | { result?: DishImportResult | null } | null;
        error?: { message: string };
        success: boolean;
      };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? "导入失败");
      }
      const result = getImportResultFromApiPayload<DishImportResult>(payload);
      if (!result) {
        throw new Error("导入完成，但未返回导入结果");
      }
      setImportResult(result);
      await reloadDishes(1);
    } catch (submitError) {
      setImportError(submitError instanceof Error ? submitError.message : "导入失败");
    } finally {
      setImporting(false);
    }
  }

  function openEditModal(item: DishPanelItem) {
    if (!canWrite) {
      return;
    }

    const nextForm = buildDishFormState(item);
    setModal({ item, mode: "edit" });
    setDishForm(nextForm);
    setInitialDishForm(nextForm);
    setDishFormErrors({});
    resetModal();
    void hydrateDishDetail(item, "edit");
  }

  function openDetailModal(item: DishPanelItem) {
    const nextForm = buildDishFormState(item);
    setModal({ item, mode: "detail" });
    setDishForm(nextForm);
    setInitialDishForm(nextForm);
    setDishFormErrors({});
    resetModal();
    void hydrateDishDetail(item, "detail");
  }

  async function hydrateDishDetail(
    item: DishPanelItem,
    mode: "detail" | "edit",
  ) {
    if (!store) {
      return;
    }

    setLoadingDetail(true);

    try {
      const detail = await loadDetailResource<DishPanelItem>(
        buildStoreScopedDetailPath("dishes", item.id, store.id),
        "dish",
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
      if (mode === "detail" || mode === "edit") {
        const nextForm = buildDishFormState(detail);
        setDishForm(nextForm);
        setInitialDishForm(nextForm);
      }
    } catch (detailError) {
      setError(
        detailError instanceof Error ? detailError.message : "菜品详情加载失败",
      );
    } finally {
      setLoadingDetail(false);
    }
  }

  function closeModal() {
    if (saving || uploading) {
      return;
    }

    const hasUnsavedChanges =
      modal?.mode === "detail"
        ? false
        : Boolean(
            modal &&
              hasUnsavedDishModalChanges({
                current: dishForm,
                initial: initialDishForm,
              }),
          );

    if (
      !canCloseAdminModal({
        hasUnsavedChanges,
      })
    ) {
      return;
    }

    setModal(null);
    setError(null);
    setDishFormErrors({});
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

  function updateDishForm<K extends keyof DishFormState>(
    key: K,
    value: DishFormState[K],
  ) {
    setDishForm((current) => ({ ...current, [key]: value }));
    setDishFormErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function uploadImage(file: File) {
    if (!DISH_IMAGE_ACCEPT.split(",").includes(file.type)) {
      setError("仅支持 JPG、PNG、WebP、AVIF 图片");
      return;
    }

    if (file.size > DISH_IMAGE_MAX_SIZE) {
      setError("图片不能超过 3MB");
      return;
    }

    setUploading(true);
    setError(null);

    const body = new FormData();
    body.append("file", file);

    try {
      const response = await fetch("/api/admin/uploads/dish-images", {
        body,
        method: "POST",
      });
      const result = (await response.json()) as {
        data?: { image: { key: string; url: string } };
        error?: { message: string };
        success: boolean;
      };

      if (!response.ok || !result.success || !result.data?.image) {
        throw new Error(result.error?.message ?? "上传失败");
      }

      updateDishForm("imageKey", result.data.image.key);
      updateDishForm("imageUrl", result.data.image.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  async function submitDishModal() {
    if (!canWrite || !modal || modal.mode === "detail" || !store) {
      return;
    }

    const validationErrors = validateDishForm(dishForm, modal.mode);
    setDishFormErrors(validationErrors);
    if (hasDishFormErrors(validationErrors)) {
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      category: dishForm.category,
      description: dishForm.description || null,
      imageKey: dishForm.imageKey || null,
      imageUrl: dishForm.imageUrl || null,
      name: dishForm.name,
      sortOrder: dishForm.sortOrder,
      status: dishForm.status,
      stepJin: dishForm.stepJin,
      stockJin: modal.mode === "edit" ? modal.item.stockJin : 0,
      storeId: store.id,
    };

    try {
      const response = await fetch(
        modal.mode === "create"
          ? "/api/admin/dishes"
          : `/api/admin/dishes/${modal.item.id}`,
        {
          body: JSON.stringify(payload),
          headers: { "content-type": "application/json" },
          method: modal.mode === "create" ? "POST" : "PATCH",
        },
      );
      const result = (await response.json()) as {
        data?: { dish: Partial<DishPanelItem> };
        error?: { message: string };
        success: boolean;
      };

      if (!response.ok || !result.success || !result.data?.dish) {
        throw new Error(result.error?.message ?? "保存失败");
      }

      const dish = result.data.dish;
      if (modal.mode === "create") {
        setItems((value) => [
          {
            category: dish.category ?? dishForm.category,
            createdAt: dish.createdAt ?? nowIso(),
            deletedAt: null,
            description: dish.description ?? null,
            id: dish.id ?? crypto.randomUUID(),
            imageKey: dish.imageKey ?? null,
            imageUrl: dish.imageUrl ?? null,
            name: dish.name ?? dishForm.name,
            sortOrder: dish.sortOrder ?? Number(dishForm.sortOrder || 0),
            status: dish.status ?? "ON_SALE",
            stepJin: dish.stepJin ?? Number(dishForm.stepJin),
            stockJin: dish.stockJin ?? 0,
            store: {
              code: "",
              id: store.id,
              name: store.name,
              type: "",
            },
            updatedAt: dish.updatedAt ?? nowIso(),
          },
          ...value,
        ]);
      } else {
        setItems((value) =>
          value.map((item) =>
            item.id === modal.item.id
              ? {
                  ...item,
                  ...dish,
                  store: item.store,
                }
              : item,
          ),
        );
      }

      await reloadDishes(modal.mode === "create" ? 1 : pagination.page);
      setModal(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function toggleDishStatus(item: DishPanelItem) {
    if (!canWrite || !store || statusChangingId) {
      return;
    }

    const nextStatus: DishStatus =
      item.status === "ON_SALE" ? "OFF_SALE" : "ON_SALE";

    setStatusChangingId(item.id);
    setError(null);

    try {
      const response = await fetch(`/api/admin/dishes/${item.id}`, {
        body: JSON.stringify({
          category: item.category,
          description: item.description,
          imageKey: item.imageKey,
          imageUrl: item.imageUrl,
          name: item.name,
          sortOrder: item.sortOrder,
          status: nextStatus,
          stepJin: item.stepJin,
          stockJin: item.stockJin,
          storeId: store.id,
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const result = (await response.json()) as {
        data?: { dish: Partial<DishPanelItem> };
        error?: { message: string };
        success: boolean;
      };

      if (!response.ok || !result.success || !result.data?.dish) {
        throw new Error(result.error?.message ?? "上下架失败");
      }

      setItems((value) =>
        value.map((dish) =>
          dish.id === item.id
            ? {
                ...dish,
                ...result.data?.dish,
              }
            : dish,
        ),
      );
      await reloadDishes(pagination.page);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "上下架失败");
    } finally {
      setStatusChangingId(null);
    }
  }

  const modalTitle =
    modal?.mode === "create"
      ? "新建菜品"
      : modal?.mode === "detail"
        ? `菜品详情 · ${modal.item.name}`
      : modal?.mode === "edit"
        ? `编辑 · ${modal.item.name}`
        : "";

  return (
    <section className="rounded-2xl border border-[#dbe6dc] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1f8f4f]">
            <Boxes size={18} />
            菜品管理
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-normal">
            菜品列表
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#66756d]">
            维护菜品、图片和上下架状态；预订可用量由任务配置中的菜品总重量决定。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ["全部", summary.total],
            ["上架", summary.onSale],
            ["下架", summary.offSale],
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
            <>
              <button
                className="inline-flex h-[58px] items-center gap-2 rounded-xl border border-[#b8d8bf] bg-[#f8fff8] px-5 text-sm font-semibold text-[#1f8f4f] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!store}
                onClick={openImportDialog}
                title={store ? "导入菜品" : "当前账号未分配数据范围"}
                type="button"
              >
                <Upload size={16} />
                导入菜品
              </button>
              <button
                className="h-[58px] rounded-xl bg-[#1f8f4f] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#a8b9ae]"
                disabled={!store}
                onClick={openCreateModal}
                title={store ? "新建菜品" : "当前账号未分配数据范围"}
                type="button"
              >
                新建菜品
              </button>
            </>
          ) : null}
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
                void reloadDishes(1);
              }
            }}
            placeholder="菜品名称 / 描述"
            value={query}
          />
        </label>
        <label className="flex w-36 flex-col gap-1 text-xs font-semibold text-[#66756d]">
          分类
          <AdminSelect
            contentLabel="分类"
            onChange={(value) => setCategoryFilter(value as DishCategory | "ALL")}
            options={[
              { label: "全部分类", value: "ALL" },
              ...resolvedCategoryOptions.map((option) => ({
                label: option.name,
                value: option.code,
              })),
            ]}
            value={categoryFilter}
          />
        </label>
        <label className="flex w-36 flex-col gap-1 text-xs font-semibold text-[#66756d]">
          状态
          <AdminSelect
            contentLabel="状态"
            onChange={(value) => setStatusFilter(value as DishStatus | "ALL")}
            options={[
              { label: "全部状态", value: "ALL" },
              ...Object.entries(STATUS_LABELS).map(([value, label]) => ({
                label,
                value,
              })),
            ]}
            value={statusFilter}
          />
        </label>
        <button
          className="h-10 rounded-xl bg-[#1f8f4f] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#a8b9ae]"
          disabled={loadingList || !store}
          onClick={() => void reloadDishes(1)}
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
              <th className="px-4 py-3 font-medium">菜品</th>
              <th className="px-4 py-3 font-medium">分类</th>
              <th className="px-4 py-3 font-medium">步进</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf2ed]">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    {item.imageUrl ? (
                      <img
                        alt={item.name}
                        className="h-14 w-14 rounded-xl object-cover"
                        src={item.imageUrl}
                      />
                    ) : (
                      <div className="grid h-14 w-14 place-items-center rounded-xl bg-[#eef6eb] text-lg font-semibold text-[#1f8f4f]">
                        {item.name.slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="max-w-52 truncate font-semibold">
                        {item.name}
                      </div>
                      <div className="mt-1 max-w-64 truncate text-xs text-[#66756d]">
                        {item.description ?? "未填写描述"}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  {categoryLabelByCode.get(item.category) ?? item.category}
                </td>
                <td className="px-4 py-4">{item.stepJin}斤起</td>
                <td className="px-4 py-4">
                  <span className="rounded-full bg-[#e8f6ed] px-3 py-1 text-xs font-semibold text-[#1f8f4f]">
                    {STATUS_LABELS[item.status]}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap justify-end gap-2 whitespace-nowrap">
                    {canWrite ? (
                      <Button
                        aria-label={
                          item.status === "ON_SALE" ? "快捷下架" : "快捷上架"
                        }
                        className="border-[#dbe6dc] text-[#1f8f4f] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={statusChangingId === item.id || !store}
                        onClick={() => void toggleDishStatus(item)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {statusChangingId === item.id
                          ? "..."
                          : item.status === "ON_SALE"
                            ? <PowerOff data-icon="inline-start" />
                            : <Power data-icon="inline-start" />}
                        {item.status === "ON_SALE" ? "下架" : "上架"}
                      </Button>
                    ) : null}
                    <Button
                      aria-label="查看菜品详情"
                      className="border-[#dbe6dc] text-[#1f8f4f]"
                      onClick={() => openDetailModal(item)}
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
                          aria-label="编辑菜品"
                          className="border-[#dbe6dc] text-[#1f8f4f]"
                          onClick={() => openEditModal(item)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Pencil data-icon="inline-start" />
                          编辑
                        </Button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-[#66756d]" colSpan={5}>
                  暂无菜品
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <AdminPagination
          disabled={loadingList}
          onPageChange={(nextPage) => void reloadDishes(nextPage)}
          onPageSizeChange={(nextPageSize) =>
            void reloadDishes(1, { categoryFilter, query, statusFilter }, nextPageSize)
          }
          pagination={pagination}
        />
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 bg-[#0f2418]/35 p-5">
          <div
            aria-modal="true"
            data-admin-modal-shell
            data-fullscreen={fullscreen ? "true" : "false"}
            className={[
              "mx-auto flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-2xl",
              fullscreen
                ? "h-full w-full"
                : "h-[68vh] w-[780px] max-w-full resize",
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
                <div className="truncate text-lg font-semibold">{modalTitle}</div>
	                <div className="mt-1 truncate text-sm text-[#66756d]">
	                  {loadingDetail
	                    ? "正在加载最新菜品详情"
	                    : "维护菜品基础信息、图片和上下架状态"}
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
	                <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                  <div>
                    <div className="overflow-hidden rounded-2xl border border-[#dbe6dc] bg-[#f8fbf7]">
                      {dishForm.imageUrl ? (
                        <img
                          alt={dishForm.name || "菜品图片"}
                          className="h-40 w-full object-cover"
                          src={dishForm.imageUrl}
                        />
                      ) : (
                        <div className="grid h-40 place-items-center text-[#1f8f4f]">
                          <ImagePlus size={34} />
                        </div>
                      )}
                    </div>
                    {modal.mode !== "detail" ? (
                      <>
                        <label className="mt-3 grid h-10 cursor-pointer place-items-center rounded-xl border border-[#dbe6dc] text-sm font-semibold text-[#1f8f4f]">
                          <span className="inline-flex items-center gap-2">
                            <Upload size={15} />
                            {uploading ? "上传中" : "上传图片"}
                          </span>
                          <input
                            accept={DISH_IMAGE_ACCEPT}
                            className="hidden"
                            disabled={uploading}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) {
                                void uploadImage(file);
                              }
                              event.currentTarget.value = "";
                            }}
                            type="file"
                          />
                        </label>
                        <p className="mt-2 text-xs leading-5 text-[#718178]">
                          {DISH_IMAGE_UPLOAD_TIP}
                        </p>
                      </>
                    ) : null}
                    {modal.mode !== "detail" && dishForm.imageUrl ? (
                      <button
                        className="mt-2 h-9 w-full rounded-xl border border-[#f2d5c8] text-sm font-semibold text-[#b85a2b]"
                        onClick={() => {
                          updateDishForm("imageKey", "");
                          updateDishForm("imageUrl", "");
                        }}
                        type="button"
                      >
                        移除图片
                      </button>
                    ) : null}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <AdminFormField
                      className="md:col-span-2"
                      error={dishFormErrors.name}
                      label="菜品名称"
                      required
                    >
                      {(invalid) => (
                      <input
                        aria-invalid={invalid}
                        className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                        onChange={(event) => updateDishForm("name", event.target.value)}
                        readOnly={modal.mode === "detail"}
                        value={dishForm.name}
                      />
                      )}
                    </AdminFormField>
                    <AdminFormField
                      error={dishFormErrors.category}
                      label="分类"
                      required
                    >
                      {(invalid) => (
                      <AdminSelect
                        ariaInvalid={invalid}
                        contentLabel="分类"
                        disabled={modal.mode === "detail"}
                        onChange={(value) =>
                          updateDishForm("category", value as DishCategory)
                        }
                        options={resolvedCategoryOptions.map((option) => ({
                          label: option.name,
                          value: option.code,
                        }))}
                        triggerClassName="h-11 w-full border-[#dbe6dc] bg-white"
                        value={dishForm.category}
                      />
                      )}
                    </AdminFormField>
                    <AdminFormField
                      error={dishFormErrors.status}
                      label="状态"
                      required
                    >
                      {(invalid) => (
                      <AdminSelect
                        ariaInvalid={invalid}
                        contentLabel="状态"
                        disabled={modal.mode === "detail"}
                        onChange={(value) =>
                          updateDishForm("status", value as DishStatus)
                        }
                        options={[
                          { label: STATUS_LABELS.ON_SALE, value: "ON_SALE" },
                          { label: STATUS_LABELS.OFF_SALE, value: "OFF_SALE" },
                        ]}
                        triggerClassName="h-11 w-full border-[#dbe6dc] bg-white"
                        value={dishForm.status}
                      />
                      )}
                    </AdminFormField>
                    <AdminFormField
                      error={dishFormErrors.stepJin}
                      label="起订步进"
                      required
                    >
                      {(invalid) => (
                      <input
                        aria-invalid={invalid}
                        className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                        min={0.5}
                        onChange={(event) =>
                          updateDishForm("stepJin", event.target.value)
                        }
                        readOnly={modal.mode === "detail"}
                        step={0.5}
                        type="number"
                        value={dishForm.stepJin}
                      />
                      )}
                    </AdminFormField>
                    <AdminFormField
                      className="md:col-span-2"
                      error={dishFormErrors.sortOrder}
                      label="排序"
                      required
                    >
                      {(invalid) => (
                      <input
                        aria-invalid={invalid}
                        className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                        onChange={(event) =>
                          updateDishForm("sortOrder", event.target.value)
                        }
                        readOnly={modal.mode === "detail"}
                        type="number"
                        value={dishForm.sortOrder}
                      />
                      )}
                    </AdminFormField>
                    <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
                      描述
                      <textarea
                        className="min-h-24 resize-y rounded-xl border border-[#dbe6dc] p-3 outline-none focus:border-[#1f8f4f]"
                        onChange={(event) =>
                          updateDishForm("description", event.target.value)
                        }
                        readOnly={modal.mode === "detail"}
                        value={dishForm.description}
                      />
                    </label>
                  </div>
	                </div>

	            </div>

            <div className="flex justify-end gap-3 border-t border-[#dbe6dc] px-6 py-4">
              <button
                className="h-10 rounded-xl border border-[#dbe6dc] px-5"
                disabled={saving || uploading}
                onClick={closeModal}
                type="button"
              >
                {modal.mode === "detail" ? "关闭" : "取消"}
              </button>
              {canWrite && modal.mode !== "detail" ? (
                <button
                  className="h-10 rounded-xl bg-[#1f8f4f] px-5 font-semibold text-white disabled:opacity-60"
                  disabled={saving || uploading || loadingDetail || !store}
                  aria-busy={loadingDetail}
	                  onClick={submitDishModal}
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
          description="上传 Excel 或 CSV 后，按菜品名称新增或更新菜品。"
          error={importError}
          file={importFile}
          loading={importing}
          onClose={closeImportDialog}
          onDownloadTemplate={downloadDishImportTemplate}
          onFileChange={(file) => {
            setImportFile(file);
            setImportError(null);
            setImportResult(null);
          }}
          onSubmit={submitDishImport}
          result={importResult}
          resultCards={[
            { label: "总行数", value: importResult?.totalRows ?? 0 },
            { label: "成功", value: importResult?.importedRows ?? 0 },
            { label: "新增", value: importResult?.createdDishes ?? 0 },
            { label: "失败", value: importResult?.failedRows ?? 0 },
          ]}
          rules={[
            "分类可填写系统字典中的分类名称或编码，例如“叶菜”或“LEAFY”。",
            "菜品可用总重量请在任务配置中维护，菜品导入不再处理库存。",
            "状态可填“上架”或“下架”，文件大小不超过 5MB。",
          ]}
          title="导入菜品"
        />
      ) : null}
    </section>
  );
}
