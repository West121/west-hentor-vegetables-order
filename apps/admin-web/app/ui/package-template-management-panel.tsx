"use client";

import {
  CreditCard,
  Maximize2,
  Minimize2,
  PackagePlus,
  Pencil,
  X,
} from "lucide-react";
import { useMemo, useRef, useState, type PointerEvent } from "react";

type StoreOption = {
  id: string;
  name: string;
};

type TemplateStatus = "ACTIVE" | "DISABLED";

export type PackageTemplatePanelItem = {
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
  initialItems: PackageTemplatePanelItem[];
  store: StoreOption | null;
};

type ModalState =
  | {
      item: PackageTemplatePanelItem;
      mode: "edit";
    }
  | {
      item: null;
      mode: "create";
    };

type FormState = {
  name: string;
  sortOrder: string;
  status: TemplateStatus;
  totalTimes: string;
  validDays: string;
  weightLimitJin: string;
};

const STATUS_LABELS: Record<TemplateStatus, string> = {
  ACTIVE: "启用",
  DISABLED: "停用",
};

function buildFormState(item?: PackageTemplatePanelItem | null): FormState {
  return {
    name: item?.name ?? "",
    sortOrder: String(item?.sortOrder ?? 0),
    status: item?.status ?? "ACTIVE",
    totalTimes: String(item?.totalTimes ?? 8),
    validDays: String(item?.validDays ?? 90),
    weightLimitJin: String(item?.weightLimitJin ?? 8),
  };
}

function nowIso() {
  return new Date().toISOString();
}

export function PackageTemplateManagementPanel({
  initialItems,
  store,
}: PackageTemplateManagementPanelProps) {
  const [items, setItems] = useState(initialItems);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [form, setForm] = useState<FormState>(buildFormState());
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
          value.userPackages += item.userPackageCount;
          value.purchaseOrders += item.purchaseOrderCount;
          if (item.status === "ACTIVE") {
            value.active += 1;
          }
          if (item.status === "DISABLED") {
            value.disabled += 1;
          }
          return value;
        },
        {
          active: 0,
          disabled: 0,
          purchaseOrders: 0,
          total: 0,
          userPackages: 0,
        },
      ),
    [items],
  );

  function resetModalPosition() {
    setFullscreen(false);
    setOffset({ x: 0, y: 0 });
    setError(null);
  }

  function openCreateModal() {
    setModal({ item: null, mode: "create" });
    setForm(buildFormState());
    resetModalPosition();
  }

  function openEditModal(item: PackageTemplatePanelItem) {
    setModal({ item, mode: "edit" });
    setForm(buildFormState(item));
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

  async function submitModal() {
    if (!modal || !store) {
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      name: form.name,
      sortOrder: form.sortOrder,
      status: form.status,
      storeId: store.id,
      totalTimes: form.totalTimes,
      validDays: form.validDays,
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
            id: template.id ?? crypto.randomUUID(),
            name: template.name ?? form.name,
            purchaseOrderCount: template.purchaseOrderCount ?? 0,
            sortOrder: template.sortOrder ?? Number(form.sortOrder || 0),
            status: template.status ?? "ACTIVE",
            store,
            totalTimes: template.totalTimes ?? Number(form.totalTimes),
            updatedAt: template.updatedAt ?? nowIso(),
            userPackageCount: template.userPackageCount ?? 0,
            validDays: template.validDays ?? Number(form.validDays),
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

      setModal(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#dbe6dc] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1f8f4f]">
            <PackagePlus size={18} />
            套餐模板管理
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-normal">
            {store?.name ?? "未选择门店"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#66756d]">
            每个门店独立维护套餐模板，会员购买后生成用户套餐。
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
            className="grid h-[58px] w-[58px] place-items-center rounded-xl border border-dashed border-[#b8d8bf] bg-[#f8fff8] text-[#1f8f4f] disabled:opacity-60"
            disabled
            title="微信支付购买套餐预留"
            type="button"
          >
            <CreditCard size={20} />
          </button>
          <button
            className="h-[58px] rounded-xl bg-[#1f8f4f] px-5 text-sm font-semibold text-white disabled:opacity-60"
            disabled={!store}
            onClick={openCreateModal}
            type="button"
          >
            新建套餐
          </button>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-[#dbe6dc]">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[#f5f8f3] text-[#66756d]">
            <tr>
              <th className="px-4 py-3 font-medium">套餐</th>
              <th className="px-4 py-3 font-medium">权益</th>
              <th className="px-4 py-3 font-medium">有效期</th>
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
                  <div className="font-semibold">{item.totalTimes} 次</div>
                  <div className="mt-1 text-xs text-[#66756d]">
                    每次 {item.weightLimitJin} 斤
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-semibold">{item.validDays} 天</div>
                  <div className="mt-1 text-xs text-[#66756d]">
                    购买后按天计算
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
                  <div className="flex justify-end">
                    <button
                      className="grid h-9 w-9 place-items-center rounded-xl border border-[#dbe6dc] text-[#1f8f4f] hover:bg-[#f3f7f1]"
                      onClick={() => openEditModal(item)}
                      title="编辑套餐"
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
                  当前门店还没有套餐模板
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
                : "h-[64vh] w-[760px] max-w-full resize",
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
                  {modal.mode === "create" ? "新建套餐模板" : `编辑 · ${modal.item.name}`}
                </div>
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
                  套餐名称
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    onChange={(event) => updateForm("name", event.target.value)}
                    value={form.name}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  总次数
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    min={1}
                    onChange={(event) => updateForm("totalTimes", event.target.value)}
                    type="number"
                    value={form.totalTimes}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  单次斤数
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    min={0.5}
                    onChange={(event) =>
                      updateForm("weightLimitJin", event.target.value)
                    }
                    step={0.5}
                    type="number"
                    value={form.weightLimitJin}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  有效天数
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    min={1}
                    onChange={(event) => updateForm("validDays", event.target.value)}
                    type="number"
                    value={form.validDays}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  排序
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    onChange={(event) => updateForm("sortOrder", event.target.value)}
                    type="number"
                    value={form.sortOrder}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
                  状态
                  <select
                    className="h-11 rounded-xl border border-[#dbe6dc] bg-white px-3 outline-none focus:border-[#1f8f4f]"
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
