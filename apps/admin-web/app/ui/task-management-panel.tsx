"use client";

import {
  Copy,
  FileClock,
  Maximize2,
  Minimize2,
  Pencil,
  X,
} from "lucide-react";
import { useMemo, useRef, useState, type PointerEvent } from "react";

type StoreOption = {
  id: string;
  name: string;
};

type TaskStatus = "DRAFT" | "ACTIVE" | "DISABLED";
type DishCategory = "LEAFY" | "FRUIT" | "ROOT" | "MUSHROOM" | "ACTIVITY";

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
  dishOptions: TaskDishOption[];
  initialItems: TaskPanelItem[];
  store: StoreOption | null;
};

type ModalState =
  | {
      item: TaskPanelItem | null;
      mode: "create" | "edit";
    }
  | {
      item: TaskPanelItem;
      mode: "copy";
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

const CATEGORY_LABELS: Record<DishCategory, string> = {
  ACTIVITY: "活动",
  FRUIT: "茄果",
  LEAFY: "叶菜",
  MUSHROOM: "菌菇",
  ROOT: "根茎",
};

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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

export function TaskManagementPanel({
  dishOptions,
  initialItems,
  store,
}: TaskManagementPanelProps) {
  const [items, setItems] = useState(initialItems);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [form, setForm] = useState<FormState>(buildForm());
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
      items.reduce(
        (value, item) => {
          value.total += 1;
          if (item.status === "ACTIVE") {
            value.active += 1;
          }
          if (item.status === "DISABLED") {
            value.disabled += 1;
          }
          if (item.status === "DRAFT") {
            value.draft += 1;
          }
          return value;
        },
        { active: 0, disabled: 0, draft: 0, total: 0 },
      ),
    [items],
  );

  function resetModal() {
    setFullscreen(false);
    setOffset({ x: 0, y: 0 });
    setError(null);
  }

  function openCreateModal() {
    setModal({ item: null, mode: "create" });
    setForm(buildForm());
    resetModal();
  }

  function openEditModal(item: TaskPanelItem) {
    setModal({ item, mode: "edit" });
    setForm(buildForm(item));
    resetModal();
  }

  function openCopyModal(item: TaskPanelItem) {
    setModal({ item, mode: "copy" });
    setForm({
      ...buildForm(item),
      name: `${item.name} 副本`,
      status: "DRAFT",
    });
    resetModal();
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setModal(null);
    setError(null);
  }

  async function refreshTasks() {
    if (!store) {
      return;
    }

    const response = await fetch(`/api/admin/tasks?storeId=${store.id}`);
    const result = (await response.json()) as {
      data?: { items: TaskPanelItem[] };
      success: boolean;
    };

    if (response.ok && result.success && result.data?.items) {
      setItems(result.data.items);
    }
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

    setSaving(true);
    setError(null);

    try {
      if (modal.mode === "copy") {
        const response = await fetch(`/api/admin/tasks/${modal.item.id}/copy`, {
          body: JSON.stringify({
            name: form.name,
            storeId: store.id,
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

      await refreshTasks();
      setModal(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  const modalTitle =
    modal?.mode === "create"
      ? "新建任务"
      : modal?.mode === "copy"
        ? `复制 · ${modal.item.name}`
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
            {store?.name ?? "未选择门店"}
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
                  <div>{formatDateTime(item.startsAt)}</div>
                  <div className="mt-1 text-xs text-[#66756d]">
                    至 {formatDateTime(item.endsAt)}
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
                      className="grid h-9 w-9 place-items-center rounded-xl border border-[#dbe6dc] text-[#1f8f4f] hover:bg-[#f3f7f1]"
                      onClick={() => openCopyModal(item)}
                      title="复制任务"
                      type="button"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      className="grid h-9 w-9 place-items-center rounded-xl border border-[#dbe6dc] text-[#1f8f4f] hover:bg-[#f3f7f1]"
                      onClick={() => openEditModal(item)}
                      title="编辑任务"
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
                  当前门店还没有任务
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 bg-[#0f2418]/35 p-5">
          <div
            className={[
              "mx-auto flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-2xl",
              fullscreen
                ? "h-full w-full"
                : "h-[70vh] w-[820px] max-w-full resize",
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
                <div className="truncate text-lg font-semibold">{modalTitle}</div>
                <div className="mt-1 truncate text-sm text-[#66756d]">
                  {store?.name ?? "未选择门店"}
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
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
                  任务名称
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    onChange={(event) => updateForm("name", event.target.value)}
                    value={form.name}
                  />
                </label>

                {modal.mode !== "copy" ? (
                  <>
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      开始时间
                      <input
                        className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                        onChange={(event) =>
                          updateForm("startsAt", event.target.value)
                        }
                        type="datetime-local"
                        value={form.startsAt}
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      结束时间
                      <input
                        className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                        onChange={(event) => updateForm("endsAt", event.target.value)}
                        type="datetime-local"
                        value={form.endsAt}
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      截单时间
                      <input
                        className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                        onChange={(event) =>
                          updateForm("cutoffTime", event.target.value)
                        }
                        type="time"
                        value={form.cutoffTime}
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      状态
                      <select
                        className="h-11 rounded-xl border border-[#dbe6dc] bg-white px-3 outline-none focus:border-[#1f8f4f]"
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
                        onChange={(event) => updateForm("tag", event.target.value)}
                        value={form.tag}
                      />
                    </label>
                  </>
                ) : null}
              </div>

              {modal.mode !== "copy" ? (
                <div className="mt-5">
                  <div className="mb-3 text-sm font-medium">关联菜品</div>
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
                          key={dish.id}
                          onClick={() => toggleDish(dish.id)}
                          type="button"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">
                              {dish.name}
                            </span>
                            <span className="mt-1 block text-xs text-[#66756d]">
                              {CATEGORY_LABELS[dish.category]} · 库存 {dish.stockJin}斤
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
                取消
              </button>
              <button
                className="h-10 rounded-xl bg-[#1f8f4f] px-5 font-semibold text-white disabled:opacity-60"
                disabled={saving || !store}
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
