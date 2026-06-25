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
  buildInventoryFormState,
  hasUnsavedDishModalChanges,
  hasUnsavedInventoryModalChanges,
  type DishCategory,
  type DishFormState,
  type DishStatus,
  type InventoryFormState,
} from "./dish-modal-state";
import { RequiredLabel } from "./required-mark";

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
  inventoryLogs?: Array<{
    afterJin: number;
    beforeJin: number;
    changeJin: number;
    id: string;
    operator: { id: string; name: string } | null;
    reason: string;
  }>;
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

type InventoryModalState = {
  item: DishPanelItem;
  mode: "inventory";
};

type ModalState = DishModalState | InventoryModalState;

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

export function DishManagementPanel({
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
  const [inventoryForm, setInventoryForm] = useState<InventoryFormState>(
    buildInventoryFormState(),
  );
  const [initialInventoryForm, setInitialInventoryForm] =
    useState<InventoryFormState>(buildInventoryFormState());
  const [fullscreen, setFullscreen] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusChangingId, setStatusChangingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DishStatus | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<DishCategory | "ALL">(
    "ALL",
  );
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
  } | null>(null);
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
        pagination.pageSize,
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
    setFullscreen(false);
    setOffset({ x: 0, y: 0 });
    setError(null);
  }

  function openCreateModal() {
    const nextForm = {
      ...buildDishFormState(),
      category: resolvedCategoryOptions[0]?.code ?? "LEAFY",
    };
    setModal({ item: null, mode: "create" });
    setDishForm(nextForm);
    setInitialDishForm(nextForm);
    resetModal();
  }

  function openEditModal(item: DishPanelItem) {
    const nextForm = buildDishFormState(item);
    setModal({ item, mode: "edit" });
    setDishForm(nextForm);
    setInitialDishForm(nextForm);
    resetModal();
    void hydrateDishDetail(item, "edit");
  }

  function openDetailModal(item: DishPanelItem) {
    const nextForm = buildDishFormState(item);
    setModal({ item, mode: "detail" });
    setDishForm(nextForm);
    setInitialDishForm(nextForm);
    resetModal();
    void hydrateDishDetail(item, "detail");
  }

  function openInventoryModal(item: DishPanelItem) {
    const nextForm = buildInventoryFormState();
    setModal({ item, mode: "inventory" });
    setInventoryForm(nextForm);
    setInitialInventoryForm(nextForm);
    resetModal();
    void hydrateDishDetail(item, "inventory");
  }

  async function hydrateDishDetail(
    item: DishPanelItem,
    mode: "detail" | "edit" | "inventory",
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
          (current?.mode === "detail" ||
            current?.mode === "edit" ||
            current?.mode === "inventory") &&
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
        : modal?.mode === "inventory"
        ? hasUnsavedInventoryModalChanges({
            current: inventoryForm,
            initial: initialInventoryForm,
          })
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

  function updateDishForm<K extends keyof DishFormState>(
    key: K,
    value: DishFormState[K],
  ) {
    setDishForm((current) => ({ ...current, [key]: value }));
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
    if (!modal || modal.mode === "detail" || modal.mode === "inventory" || !store) {
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
      stockJin: modal.mode === "edit" ? modal.item.stockJin : dishForm.stockJin,
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
            stockJin: dish.stockJin ?? Number(dishForm.stockJin),
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

  async function submitInventoryModal() {
    if (!modal || modal.mode !== "inventory" || !store) {
      return;
    }

    const changeJin = Number(inventoryForm.changeJin);
    const reason = inventoryForm.reason.trim();

    if (!Number.isFinite(changeJin) || changeJin === 0) {
      setError("请输入有效的库存调整斤数");
      return;
    }

    if (modal.item.stockJin + changeJin < 0) {
      setError("库存不能调整为负数");
      return;
    }

    if (!reason) {
      setError("请输入库存调整原因");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/dishes/${modal.item.id}/inventory`, {
        body: JSON.stringify({
          changeJin,
          reason,
          storeId: store.id,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as {
        data?: { dish: Partial<DishPanelItem> };
        error?: { message: string };
        success: boolean;
      };

      if (!response.ok || !result.success || !result.data?.dish) {
        throw new Error(result.error?.message ?? "保存失败");
      }

      setItems((value) =>
        value.map((item) =>
          item.id === modal.item.id
            ? {
                ...item,
                ...result.data?.dish,
              }
            : item,
          ),
      );
      await reloadDishes(pagination.page);
      setModal(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function toggleDishStatus(item: DishPanelItem) {
    if (!store || statusChangingId) {
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
        : modal
          ? `库存调整 · ${modal.item.name}`
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
            维护菜品、图片、库存和上下架状态，小程序首页只展示上架菜品。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ["全部", summary.total],
            ["上架", summary.onSale],
            ["下架", summary.offSale],
            ["低库存", summary.lowStock],
            ["总库存", `${summary.stock.toFixed(1)}斤`],
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
            className="h-[58px] rounded-xl bg-[#1f8f4f] px-5 text-sm font-semibold text-white disabled:opacity-60"
            disabled={!store}
            onClick={openCreateModal}
            type="button"
          >
            新建菜品
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
                void reloadDishes(1);
              }
            }}
            placeholder="菜品名称 / 描述"
            value={query}
          />
        </label>
        <label className="flex w-36 flex-col gap-1 text-xs font-semibold text-[#66756d]">
          分类
          <select
            className="h-10 rounded-xl border border-[#dbe6dc] bg-white px-3 text-sm font-normal text-[#15261d] outline-none focus:border-[#1f8f4f]"
            onChange={(event) =>
              setCategoryFilter(event.target.value as DishCategory | "ALL")
            }
            value={categoryFilter}
          >
            <option value="ALL">全部分类</option>
            {resolvedCategoryOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-36 flex-col gap-1 text-xs font-semibold text-[#66756d]">
          状态
          <select
            className="h-10 rounded-xl border border-[#dbe6dc] bg-white px-3 text-sm font-normal text-[#15261d] outline-none focus:border-[#1f8f4f]"
            onChange={(event) =>
              setStatusFilter(event.target.value as DishStatus | "ALL")
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
              <th className="px-4 py-3 font-medium">库存</th>
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
                <td className="px-4 py-4">
                  <span
                    className={
                      item.stockJin <= 5
                        ? "font-semibold text-[#b85a2b]"
                        : "font-semibold"
                    }
                  >
                    {item.stockJin}斤
                  </span>
                </td>
                <td className="px-4 py-4">{item.stepJin}斤起</td>
                <td className="px-4 py-4">
                  <span className="rounded-full bg-[#e8f6ed] px-3 py-1 text-xs font-semibold text-[#1f8f4f]">
                    {STATUS_LABELS[item.status]}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      aria-label={
                        item.status === "ON_SALE" ? "快捷下架" : "快捷上架"
                      }
                      className="grid h-9 w-9 place-items-center rounded-xl border border-[#dbe6dc] text-[#1f8f4f] hover:bg-[#f3f7f1] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={statusChangingId === item.id || !store}
                      onClick={() => void toggleDishStatus(item)}
                      title={
                        item.status === "ON_SALE" ? "快捷下架" : "快捷上架"
                      }
                      type="button"
                    >
                      {statusChangingId === item.id
                        ? "..."
                        : item.status === "ON_SALE"
                          ? <PowerOff size={16} />
                          : <Power size={16} />}
                    </button>
                    <button
                      aria-label="查看菜品详情"
                      className="grid h-9 w-9 place-items-center rounded-xl border border-[#dbe6dc] text-[#1f8f4f] hover:bg-[#f3f7f1]"
                      onClick={() => openDetailModal(item)}
                      title="查看详情"
                      type="button"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      aria-label="库存调整"
                      className="grid h-9 w-9 place-items-center rounded-xl border border-[#dbe6dc] text-[#1f8f4f] hover:bg-[#f3f7f1]"
                      onClick={() => openInventoryModal(item)}
                      title="库存调整"
                      type="button"
                    >
                      <SlidersHorizontal size={16} />
                    </button>
                    <button
                      aria-label="编辑菜品"
                      className="grid h-9 w-9 place-items-center rounded-xl border border-[#dbe6dc] text-[#1f8f4f] hover:bg-[#f3f7f1]"
                      onClick={() => openEditModal(item)}
                      title="编辑菜品"
                      type="button"
                    >
                      <Pencil size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-[#66756d]" colSpan={6}>
                  暂无菜品
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <AdminPagination
          disabled={loadingList}
          onPageChange={(nextPage) => void reloadDishes(nextPage)}
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
                    : modal.mode === "inventory"
                      ? "通过库存调整记录库存变化"
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
              {modal.mode === "inventory" ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] p-4">
                    <div className="font-semibold">{modal.item.name}</div>
                    <div className="mt-1 text-sm text-[#66756d]">
                      当前库存 {modal.item.stockJin}斤 ·{" "}
                      {STATUS_LABELS[modal.item.status]}
                    </div>
                    <div className="mt-2 text-xs text-[#66756d]">
                      库存流水 {modal.item.inventoryLogs?.length ?? 0} 条
                    </div>
                  </div>
                  {modal.item.inventoryLogs?.[0] ? (
                    <div className="rounded-xl border border-[#dbe6dc] px-4 py-3 text-sm">
                      最近流水：{modal.item.inventoryLogs[0].reason} ·{" "}
                      {modal.item.inventoryLogs[0].changeJin > 0 ? "+" : ""}
                      {modal.item.inventoryLogs[0].changeJin}斤
                    </div>
                  ) : null}
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    <RequiredLabel>调整斤数</RequiredLabel>
                    <input
                      className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        setInventoryForm((value) => ({
                          ...value,
                          changeJin: event.target.value,
                        }))
                      }
                      placeholder="入库填正数，出库填负数"
                      step={0.5}
                      type="number"
                      value={inventoryForm.changeJin}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    <RequiredLabel>原因</RequiredLabel>
                    <textarea
                      className="min-h-24 resize-y rounded-xl border border-[#dbe6dc] p-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        setInventoryForm((value) => ({
                          ...value,
                          reason: event.target.value,
                        }))
                      }
                      placeholder="例如：今日补货、售罄下架"
                      value={inventoryForm.reason}
                    />
                  </label>
                </div>
              ) : (
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
                    <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
                      <RequiredLabel>菜品名称</RequiredLabel>
                      <input
                        className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                        onChange={(event) => updateDishForm("name", event.target.value)}
                        readOnly={modal.mode === "detail"}
                        value={dishForm.name}
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      <RequiredLabel>分类</RequiredLabel>
                      <select
                        className="h-11 rounded-xl border border-[#dbe6dc] bg-white px-3 outline-none focus:border-[#1f8f4f]"
                        disabled={modal.mode === "detail"}
                        onChange={(event) =>
                          updateDishForm("category", event.target.value as DishCategory)
                        }
                        value={dishForm.category}
                      >
                        {resolvedCategoryOptions.map((option) => (
                          <option key={option.code} value={option.code}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      <RequiredLabel>状态</RequiredLabel>
                      <select
                        className="h-11 rounded-xl border border-[#dbe6dc] bg-white px-3 outline-none focus:border-[#1f8f4f]"
                        disabled={modal.mode === "detail"}
                        onChange={(event) =>
                          updateDishForm("status", event.target.value as DishStatus)
                        }
                        value={dishForm.status}
                      >
                        <option value="ON_SALE">{STATUS_LABELS.ON_SALE}</option>
                        <option value="OFF_SALE">{STATUS_LABELS.OFF_SALE}</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      <RequiredLabel>库存斤数</RequiredLabel>
                      <input
                        className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none read-only:bg-[#f5f8f3] read-only:text-[#66756d] focus:border-[#1f8f4f]"
                        min={0}
                        onChange={(event) =>
                          updateDishForm("stockJin", event.target.value)
                        }
                        readOnly={modal.mode !== "create"}
                        step={0.5}
                        type="number"
                        value={dishForm.stockJin}
                      />
                      {modal.mode !== "create" ? (
                        <span className="text-xs font-normal leading-5 text-[#66756d]">
                          库存请通过列表“库存调整”维护。
                        </span>
                      ) : null}
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      <RequiredLabel>起订步进</RequiredLabel>
                      <input
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
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
                      <RequiredLabel>排序</RequiredLabel>
                      <input
                        className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                        onChange={(event) =>
                          updateDishForm("sortOrder", event.target.value)
                        }
                        readOnly={modal.mode === "detail"}
                        type="number"
                        value={dishForm.sortOrder}
                      />
                    </label>
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
                disabled={saving || uploading}
                onClick={closeModal}
                type="button"
              >
                {modal.mode === "detail" ? "关闭" : "取消"}
              </button>
              {modal.mode !== "detail" ? (
                <button
                  className="h-10 rounded-xl bg-[#1f8f4f] px-5 font-semibold text-white disabled:opacity-60"
                  disabled={saving || uploading || loadingDetail || !store}
                  aria-busy={loadingDetail}
                  onClick={
                    modal.mode === "inventory"
                      ? submitInventoryModal
                      : submitDishModal
                  }
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
