"use client";

import {
  Boxes,
  ImagePlus,
  Maximize2,
  Minimize2,
  Pencil,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useRef, useState, type PointerEvent } from "react";

type StoreOption = {
  id: string;
  name: string;
};

type DishCategory = "LEAFY" | "FRUIT" | "ROOT" | "MUSHROOM" | "ACTIVITY";
type DishStatus = "ON_SALE" | "OFF_SALE";

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
  initialItems: DishPanelItem[];
  store: StoreOption | null;
};

type DishModalState =
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

type DishFormState = {
  category: DishCategory;
  description: string;
  imageKey: string;
  imageUrl: string;
  name: string;
  sortOrder: string;
  status: DishStatus;
  stepJin: string;
  stockJin: string;
};

type InventoryFormState = {
  changeJin: string;
  reason: string;
};

const CATEGORY_LABELS: Record<DishCategory, string> = {
  ACTIVITY: "活动",
  FRUIT: "茄果",
  LEAFY: "叶菜",
  MUSHROOM: "菌菇",
  ROOT: "根茎",
};

const STATUS_LABELS: Record<DishStatus, string> = {
  OFF_SALE: "下架",
  ON_SALE: "上架",
};

function nowIso() {
  return new Date().toISOString();
}

function buildDishForm(item?: DishPanelItem | null): DishFormState {
  return {
    category: item?.category ?? "LEAFY",
    description: item?.description ?? "",
    imageKey: item?.imageKey ?? "",
    imageUrl: item?.imageUrl ?? "",
    name: item?.name ?? "",
    sortOrder: String(item?.sortOrder ?? 0),
    status: item?.status ?? "ON_SALE",
    stepJin: String(item?.stepJin ?? 0.5),
    stockJin: String(item?.stockJin ?? 20),
  };
}

export function DishManagementPanel({
  initialItems,
  store,
}: DishManagementPanelProps) {
  const [items, setItems] = useState(initialItems);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [dishForm, setDishForm] = useState<DishFormState>(buildDishForm());
  const [inventoryForm, setInventoryForm] = useState<InventoryFormState>({
    changeJin: "",
    reason: "",
  });
  const [fullscreen, setFullscreen] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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
          value.stock += item.stockJin;
          if (item.status === "ON_SALE") {
            value.onSale += 1;
          }
          if (item.status === "OFF_SALE") {
            value.offSale += 1;
          }
          if (item.stockJin <= 5) {
            value.lowStock += 1;
          }
          return value;
        },
        { lowStock: 0, offSale: 0, onSale: 0, stock: 0, total: 0 },
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
    setDishForm(buildDishForm());
    resetModal();
  }

  function openEditModal(item: DishPanelItem) {
    setModal({ item, mode: "edit" });
    setDishForm(buildDishForm(item));
    resetModal();
  }

  function openInventoryModal(item: DishPanelItem) {
    setModal({ item, mode: "inventory" });
    setInventoryForm({ changeJin: "", reason: "" });
    resetModal();
  }

  function closeModal() {
    if (saving || uploading) {
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
    if (!modal || modal.mode === "inventory" || !store) {
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
      stockJin: dishForm.stockJin,
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

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/dishes/${modal.item.id}/inventory`, {
        body: JSON.stringify({
          changeJin: inventoryForm.changeJin,
          reason: inventoryForm.reason,
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
      setModal(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  const modalTitle =
    modal?.mode === "create"
      ? "新建菜品"
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
            {store?.name ?? "未选择门店"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#66756d]">
            菜品、图片和库存按门店维护，小程序首页只展示当前门店上架菜品。
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
                <td className="px-4 py-4">{CATEGORY_LABELS[item.category]}</td>
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
                      className="grid h-9 w-9 place-items-center rounded-xl border border-[#dbe6dc] text-[#1f8f4f] hover:bg-[#f3f7f1]"
                      onClick={() => openInventoryModal(item)}
                      title="库存调整"
                      type="button"
                    >
                      <SlidersHorizontal size={16} />
                    </button>
                    <button
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
                  当前门店还没有菜品
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
                : "h-[68vh] w-[780px] max-w-full resize",
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
              {modal.mode === "inventory" ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] p-4">
                    <div className="font-semibold">{modal.item.name}</div>
                    <div className="mt-1 text-sm text-[#66756d]">
                      当前库存 {modal.item.stockJin}斤 ·{" "}
                      {STATUS_LABELS[modal.item.status]}
                    </div>
                  </div>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    调整斤数
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
                    原因
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
                    <label className="mt-3 grid h-10 cursor-pointer place-items-center rounded-xl border border-[#dbe6dc] text-sm font-semibold text-[#1f8f4f]">
                      <span className="inline-flex items-center gap-2">
                        <Upload size={15} />
                        {uploading ? "上传中" : "上传图片"}
                      </span>
                      <input
                        accept="image/avif,image/jpeg,image/png,image/webp"
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
                    {dishForm.imageUrl ? (
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
                      菜品名称
                      <input
                        className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                        onChange={(event) => updateDishForm("name", event.target.value)}
                        value={dishForm.name}
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      分类
                      <select
                        className="h-11 rounded-xl border border-[#dbe6dc] bg-white px-3 outline-none focus:border-[#1f8f4f]"
                        onChange={(event) =>
                          updateDishForm("category", event.target.value as DishCategory)
                        }
                        value={dishForm.category}
                      >
                        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      状态
                      <select
                        className="h-11 rounded-xl border border-[#dbe6dc] bg-white px-3 outline-none focus:border-[#1f8f4f]"
                        onChange={(event) =>
                          updateDishForm("status", event.target.value as DishStatus)
                        }
                        value={dishForm.status}
                      >
                        <option value="ON_SALE">上架</option>
                        <option value="OFF_SALE">下架</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      库存斤数
                      <input
                        className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                        min={0}
                        onChange={(event) =>
                          updateDishForm("stockJin", event.target.value)
                        }
                        step={0.5}
                        type="number"
                        value={dishForm.stockJin}
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      起订步进
                      <input
                        className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                        min={0.5}
                        onChange={(event) =>
                          updateDishForm("stepJin", event.target.value)
                        }
                        step={0.5}
                        type="number"
                        value={dishForm.stepJin}
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
                      排序
                      <input
                        className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                        onChange={(event) =>
                          updateDishForm("sortOrder", event.target.value)
                        }
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
                取消
              </button>
              <button
                className="h-10 rounded-xl bg-[#1f8f4f] px-5 font-semibold text-white disabled:opacity-60"
                disabled={saving || uploading || !store}
                onClick={
                  modal.mode === "inventory"
                    ? submitInventoryModal
                    : submitDishModal
                }
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
