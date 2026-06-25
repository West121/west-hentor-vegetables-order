"use client";

import {
  Ban,
  Copy,
  Eye,
  FileClock,
  Maximize2,
  Minimize2,
  Pencil,
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
import { hasAdminFormChanges } from "./admin-form-dirty";
import {
  AdminDateTimePicker,
  AdminTimePicker,
} from "./admin-date-time-picker";
import { formatDateTimeMinute } from "./date-format";
import { RequiredLabel } from "./required-mark";

type StoreOption = {
  id: string;
  name: string;
};

type TaskStatus = "DRAFT" | "ACTIVE" | "DISABLED";
type DishCategory = string;

type DishCategoryOption = {
  code: string;
  enabled: boolean;
  name: string;
  sortOrder: number;
};

export type TaskPanelItem = {
  cutoffTime: string;
  createdAt: string;
  dishCount: number;
  dishes: Array<{
    category: DishCategory;
    id: string;
    imageUrl: string | null;
    name: string;
    sortOrder: number;
    status: string;
    stockJin: number;
  }>;
  endsAt: string;
  id: string;
  name: string;
  startsAt: string;
  status: TaskStatus;
  store: {
    code: string;
    id: string;
    name: string;
  };
  tag: string | null;
  updatedAt: string;
};

export type TaskDishOption = {
  category: DishCategory;
  id: string;
  name: string;
  status: string;
  stockJin: number;
};

type TaskManagementPanelProps = {
  categoryOptions?: DishCategoryOption[];
  dishOptions: TaskDishOption[];
  initialItems: TaskPanelItem[];
  initialPagination: AdminPaginationMeta;
  initialSummary: {
    active: number;
    disabled: number;
    draft: number;
    total: number;
  };
  store: StoreOption | null;
};

type ModalState =
  | {
      item: TaskPanelItem | null;
      mode: "create" | "edit";
    }
  | {
      item: TaskPanelItem;
      mode: "copy" | "detail";
    };

type FormState = {
  cutoffTime: string;
  dishIds: string[];
  endsAt: string;
  name: string;
  startsAt: string;
  status: TaskStatus;
  tag: string;
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  ACTIVE: "启用",
  DISABLED: "停用",
  DRAFT: "草稿",
};

const DEFAULT_CATEGORY_OPTIONS: DishCategoryOption[] = [
  { code: "LEAFY", enabled: true, name: "叶菜", sortOrder: 1 },
  { code: "FRUIT", enabled: true, name: "茄果", sortOrder: 2 },
  { code: "ROOT", enabled: true, name: "根茎", sortOrder: 3 },
  { code: "MUSHROOM", enabled: true, name: "菌菇", sortOrder: 4 },
  { code: "ACTIVITY", enabled: true, name: "活动", sortOrder: 5 },
];

function toDateTimeLocal(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function defaultStartsAt() {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return toDateTimeLocal(now);
}

function defaultEndsAt() {
  const end = new Date();
  end.setDate(end.getDate() + 7);
  end.setHours(23, 59, 0, 0);
  return toDateTimeLocal(end);
}

function nextDayTaskRange() {
  const startsAt = new Date();
  startsAt.setDate(startsAt.getDate() + 1);
  startsAt.setHours(0, 0, 0, 0);

  const endsAt = new Date(startsAt);
  endsAt.setHours(23, 59, 0, 0);

  return {
    endsAt: toDateTimeLocal(endsAt),
    startsAt: toDateTimeLocal(startsAt),
  };
}

function buildForm(item?: TaskPanelItem | null): FormState {
  return {
    cutoffTime: item?.cutoffTime ?? "18:00",
    dishIds: item?.dishes.map((dish) => dish.id) ?? [],
    endsAt: item ? toDateTimeLocal(item.endsAt) : defaultEndsAt(),
    name: item?.name ?? "",
    startsAt: item ? toDateTimeLocal(item.startsAt) : defaultStartsAt(),
    status: item?.status ?? "DRAFT",
    tag: item?.tag ?? "",
  };
}

function buildCopyForm(item: TaskPanelItem): FormState {
  return {
    ...buildForm(item),
    ...nextDayTaskRange(),
    name: `${item.name} 次日`,
    status: "DRAFT" as TaskStatus,
  };
}

export function TaskManagementPanel({
  categoryOptions,
  dishOptions,
  initialItems,
  initialPagination,
  initialSummary,
  store,
}: TaskManagementPanelProps) {
  const [items, setItems] = useState(initialItems);
  const [pagination, setPagination] = useState(initialPagination);
  const [summary, setSummary] = useState(initialSummary);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [form, setForm] = useState<FormState>(buildForm());
  const [initialForm, setInitialForm] = useState<FormState>(buildForm());
  const [fullscreen, setFullscreen] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "ALL">("ALL");
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
  } | null>(null);
  const resolvedCategoryOptions = (
    categoryOptions?.length ? categoryOptions : DEFAULT_CATEGORY_OPTIONS
  ).sort((left, right) => left.sortOrder - right.sortOrder);
  const categoryLabelByCode = new Map(
    [...DEFAULT_CATEGORY_OPTIONS, ...resolvedCategoryOptions].map((option) => [
      option.code,
      option.name,
    ]),
  );

  function resetModal() {
    setFullscreen(false);
    setOffset({ x: 0, y: 0 });
    setError(null);
  }

  function openCreateModal() {
    const nextForm = buildForm();
    setModal({ item: null, mode: "create" });
    setForm(nextForm);
    setInitialForm(nextForm);
    resetModal();
  }

  function openEditModal(item: TaskPanelItem) {
    const nextForm = buildForm(item);
    setModal({ item, mode: "edit" });
    setForm(nextForm);
    setInitialForm(nextForm);
    resetModal();
    void hydrateTaskDetail(item, "edit");
  }

  function openDetailModal(item: TaskPanelItem) {
    const nextForm = buildForm(item);
    setModal({ item, mode: "detail" });
    setForm(nextForm);
    setInitialForm(nextForm);
    resetModal();
    void hydrateTaskDetail(item, "detail");
  }

  function openCopyModal(item: TaskPanelItem) {
    const nextForm = buildCopyForm(item);
    setModal({ item, mode: "copy" });
    setForm(nextForm);
    setInitialForm(nextForm);
    resetModal();
    void hydrateTaskDetail(item, "copy");
  }

  async function hydrateTaskDetail(
    item: TaskPanelItem,
    mode: "copy" | "detail" | "edit",
  ) {
    if (!store) {
      return;
    }

    setLoadingDetail(true);

    try {
      const detail = await loadDetailResource<TaskPanelItem>(
        buildStoreScopedDetailPath("tasks", item.id, store.id),
        "task",
      );

      setItems((value) => replaceItemById(value, detail));
      setModal((current) =>
        current?.item?.id === item.id ? { ...current, item: detail } : current,
      );
      const nextForm = mode === "copy" ? buildCopyForm(detail) : buildForm(detail);
      setForm(nextForm);
      setInitialForm(nextForm);
    } catch (detailError) {
      setError(
        detailError instanceof Error ? detailError.message : "任务详情加载失败",
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

  async function refreshTasks(
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
      const response = await fetch(`/api/admin/tasks?${params.toString()}`);
      const result = (await response.json()) as {
        data?: {
          items: TaskPanelItem[];
          pagination: AdminPaginationMeta;
          summary: typeof initialSummary;
        };
        error?: { message: string };
        success: boolean;
      };

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error?.message ?? "加载任务失败");
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
      setError(loadError instanceof Error ? loadError.message : "加载任务失败");
    } finally {
      setLoadingList(false);
    }
  }

  function resetFilters() {
    setQuery("");
    setStatusFilter("ALL");
    void refreshTasks(1, { query: "", statusFilter: "ALL" });
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

  function toggleDish(dishId: string) {
    setForm((current) => {
      const selected = new Set(current.dishIds);
      if (selected.has(dishId)) {
        selected.delete(dishId);
      } else {
        selected.add(dishId);
      }

      return { ...current, dishIds: [...selected] };
    });
  }

  async function submitModal() {
    if (!modal || !store) {
      return;
    }
    if (modal.mode === "detail") {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (modal.mode === "copy") {
        const response = await fetch(`/api/admin/tasks/${modal.item.id}/copy`, {
          body: JSON.stringify({
            cutoffTime: form.cutoffTime,
            dishIds: form.dishIds,
            endsAt: form.endsAt,
            name: form.name,
            startsAt: form.startsAt,
            storeId: store.id,
            tag: form.tag || null,
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        const result = (await response.json()) as {
          error?: { message: string };
          success: boolean;
        };

        if (!response.ok || !result.success) {
          throw new Error(result.error?.message ?? "复制失败");
        }
      } else {
        const response = await fetch(
          modal.mode === "create"
            ? "/api/admin/tasks"
            : `/api/admin/tasks/${modal.item?.id}`,
          {
            body: JSON.stringify({
              cutoffTime: form.cutoffTime,
              dishIds: form.dishIds,
              endsAt: form.endsAt,
              name: form.name,
              startsAt: form.startsAt,
              status: form.status,
              storeId: store.id,
              tag: form.tag || null,
            }),
            headers: { "content-type": "application/json" },
            method: modal.mode === "create" ? "POST" : "PATCH",
          },
        );
        const result = (await response.json()) as {
          error?: { message: string };
          success: boolean;
        };

        if (!response.ok || !result.success) {
          throw new Error(result.error?.message ?? "保存失败");
        }
      }

      await refreshTasks(
        modal.mode === "create" || modal.mode === "copy" ? 1 : pagination.page,
      );
      setModal(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function canCancelTask(item: TaskPanelItem) {
    return item.status !== "DISABLED" && new Date(item.endsAt) > new Date();
  }

  async function cancelTask(item: TaskPanelItem) {
    if (!store || !canCancelTask(item)) {
      return;
    }

    setCancelingId(item.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/tasks/${item.id}/cancel`, {
        body: JSON.stringify({ storeId: store.id }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as {
        error?: { message: string };
        success: boolean;
      };
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message ?? "取消任务失败");
      }
      await refreshTasks(pagination.page);
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "取消任务失败");
    } finally {
      setCancelingId(null);
    }
  }

  const modalTitle =
    modal?.mode === "create"
      ? "新建任务"
      : modal?.mode === "copy"
        ? `复制 · ${modal.item.name}`
        : modal?.mode === "detail"
          ? `任务详情 · ${modal.item.name}`
          : modal
            ? `编辑 · ${modal.item?.name}`
            : "";

  return (
    <section className="rounded-2xl border border-[#dbe6dc] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1f8f4f]">
            <FileClock size={18} />
            任务配置
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-normal">
            任务配置
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#66756d]">
            启用中的任务决定小程序首页今日可预订菜品和截单时间。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ["全部", summary.total],
            ["启用", summary.active],
            ["草稿", summary.draft],
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
            className="h-[58px] rounded-xl bg-[#1f8f4f] px-5 text-sm font-semibold text-white disabled:opacity-60"
            disabled={!store || dishOptions.length === 0}
            onClick={openCreateModal}
            type="button"
          >
            新建任务
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
                void refreshTasks(1);
              }
            }}
            placeholder="任务名称 / 标签"
            value={query}
          />
        </label>
        <label className="flex w-40 flex-col gap-1 text-xs font-semibold text-[#66756d]">
          状态
          <select
            className="h-10 rounded-xl border border-[#dbe6dc] bg-white px-3 text-sm font-normal text-[#15261d] outline-none focus:border-[#1f8f4f]"
            onChange={(event) =>
              setStatusFilter(event.target.value as TaskStatus | "ALL")
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
          onClick={() => void refreshTasks(1)}
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
              <th className="px-4 py-3 font-medium">任务</th>
              <th className="px-4 py-3 font-medium">时间</th>
              <th className="px-4 py-3 font-medium">菜品</th>
              <th className="px-4 py-3 font-medium">截单</th>
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
                    {item.tag ?? "未设置标签"}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div>{formatDateTimeMinute(item.startsAt)}</div>
                  <div className="mt-1 text-xs text-[#66756d]">
                    至 {formatDateTimeMinute(item.endsAt)}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-semibold">{item.dishCount} 个菜品</div>
                  <div className="mt-1 max-w-72 truncate text-xs text-[#66756d]">
                    {item.dishes.map((dish) => dish.name).join("、") || "未关联"}
                  </div>
                </td>
                <td className="px-4 py-4">{item.cutoffTime}</td>
                <td className="px-4 py-4">
                  <span className="rounded-full bg-[#e8f6ed] px-3 py-1 text-xs font-semibold text-[#1f8f4f]">
                    {STATUS_LABELS[item.status]}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      aria-label="查看任务详情"
                      className="grid h-9 w-9 place-items-center rounded-xl border border-[#dbe6dc] text-[#1f8f4f] hover:bg-[#f3f7f1]"
                      onClick={() => openDetailModal(item)}
                      title="查看详情"
                      type="button"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      aria-label="复制任务"
                      className="grid h-9 w-9 place-items-center rounded-xl border border-[#dbe6dc] text-[#1f8f4f] hover:bg-[#f3f7f1]"
                      onClick={() => openCopyModal(item)}
                      title="复制任务"
                      type="button"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      aria-label="取消任务"
                      className={[
                        "grid h-9 w-9 place-items-center rounded-xl border border-[#dbe6dc] text-[#b85a2b] hover:bg-[#fff7ed]",
                        !canCancelTask(item)
                          ? "cursor-not-allowed opacity-45 hover:bg-white"
                          : "",
                      ].join(" ")}
                      disabled={!canCancelTask(item) || cancelingId === item.id}
                      onClick={() => void cancelTask(item)}
                      title={
                        canCancelTask(item)
                          ? "取消任务"
                          : "已结束或已停用任务不可取消"
                      }
                      type="button"
                    >
                      {cancelingId === item.id ? "..." : <Ban size={16} />}
                    </button>
                    <button
                      aria-label="编辑任务"
                      className={[
                        "grid h-9 w-9 place-items-center rounded-xl border border-[#dbe6dc] text-[#1f8f4f] hover:bg-[#f3f7f1]",
                        item.status === "ACTIVE"
                          ? "cursor-not-allowed opacity-45 hover:bg-white"
                          : "",
                      ].join(" ")}
                      disabled={item.status === "ACTIVE"}
                      onClick={() => openEditModal(item)}
                      title={
                        item.status === "ACTIVE"
                          ? "已生效任务不可编辑"
                          : "编辑任务"
                      }
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
                  暂无任务
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <AdminPagination
          disabled={loadingList}
          onPageChange={(nextPage) => void refreshTasks(nextPage)}
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
                : "h-[70vh] w-[820px] max-w-full resize",
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
                  {loadingDetail ? "正在加载最新任务详情" : "任务配置"}
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
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
                  <RequiredLabel>任务名称</RequiredLabel>
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    onChange={(event) => updateForm("name", event.target.value)}
                    readOnly={modal.mode === "detail"}
                    value={form.name}
                  />
                </label>

                <AdminDateTimePicker
                  buttonClassName="h-11 w-full"
                  label="开始时间"
                  onChange={(value) => updateForm("startsAt", value)}
                  readOnly={modal.mode === "detail"}
                  required
                  value={form.startsAt}
                />
                <AdminDateTimePicker
                  buttonClassName="h-11 w-full"
                  label="结束时间"
                  onChange={(value) => updateForm("endsAt", value)}
                  readOnly={modal.mode === "detail"}
                  required
                  value={form.endsAt}
                />
                <AdminTimePicker
                  buttonClassName="h-11 w-full"
                  label="截单时间"
                  onChange={(value) => updateForm("cutoffTime", value)}
                  readOnly={modal.mode === "detail"}
                  required
                  value={form.cutoffTime}
                />
                <label className="flex flex-col gap-2 text-sm font-medium">
                  <RequiredLabel>状态</RequiredLabel>
                  <select
                    className="h-11 rounded-xl border border-[#dbe6dc] bg-white px-3 outline-none focus:border-[#1f8f4f]"
                    disabled={modal.mode === "detail" || modal.mode === "copy"}
                    onChange={(event) =>
                      updateForm("status", event.target.value as TaskStatus)
                    }
                    value={form.status}
                  >
                    <option value="DRAFT">草稿</option>
                    <option value="ACTIVE">启用</option>
                    <option value="DISABLED">停用</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
                  活动标签
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    readOnly={modal.mode === "detail"}
                    onChange={(event) => updateForm("tag", event.target.value)}
                    value={form.tag}
                  />
                </label>
              </div>

              <div className="mt-5">
                <div className="mb-3 text-sm font-medium">
                  <RequiredLabel>关联菜品</RequiredLabel>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {dishOptions.map((dish) => {
                    const selected = form.dishIds.includes(dish.id);
                    return (
                      <button
                        className={[
                          "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left",
                          selected
                            ? "border-[#1f8f4f] bg-[#eff8f1]"
                            : "border-[#dbe6dc] bg-white",
                        ].join(" ")}
                        disabled={modal.mode === "detail"}
                        key={dish.id}
                        onClick={() => toggleDish(dish.id)}
                        type="button"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">
                            {dish.name}
                          </span>
                          <span className="mt-1 block text-xs text-[#66756d]">
                            {categoryLabelByCode.get(dish.category) ?? dish.category} · 库存 {dish.stockJin}斤
                          </span>
                        </span>
                        <span
                          className={[
                            "grid h-5 w-5 shrink-0 place-items-center rounded-full border text-xs",
                            selected
                              ? "border-[#1f8f4f] bg-[#1f8f4f] text-white"
                              : "border-[#b8c9bd]",
                          ].join(" ")}
                        >
                          {selected ? "✓" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

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
    </section>
  );
}
