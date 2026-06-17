"use client";

import {
  CalendarDays,
  LockKeyhole,
  Maximize2,
  Minimize2,
  PackageCheck,
  Pencil,
  RotateCcw,
  X,
} from "lucide-react";
import { useMemo, useRef, useState, type PointerEvent } from "react";

type StoreOption = {
  id: string;
  name: string;
};

export type PackagePanelItem = {
  createdAt: string;
  expiresAt: string;
  frozenReason: string | null;
  id: string;
  lastUsedAt: string | null;
  nameSnapshot: string;
  nextOrderDate: string | null;
  remainingTimes: number;
  startsAt: string;
  status: "ACTIVE" | "FROZEN" | "EXPIRED" | "USED_UP";
  store: StoreOption;
  template: {
    id: string;
    name: string;
  };
  totalTimes: number;
  updatedAt: string;
  usedTimes: number;
  usagePercent: number;
  user: {
    id: string;
    nickname: string | null;
    phone: string | null;
    status: string;
  };
  weightLimitJin: number;
};

type PackageManagementPanelProps = {
  initialItems: PackagePanelItem[];
  store: StoreOption | null;
};

type ModalMode = "adjust" | "freeze" | "unfreeze";

type ModalState = {
  item: PackagePanelItem;
  mode: ModalMode;
};

type FormState = {
  expiresAt: string;
  nextOrderDate: string;
  reason: string;
  totalTimes: string;
  usedTimes: string;
  weightLimitJin: string;
};

const STATUS_LABELS: Record<PackagePanelItem["status"], string> = {
  ACTIVE: "可预订",
  EXPIRED: "已过期",
  FROZEN: "已冻结",
  USED_UP: "已用完",
};

function maskPhone(phone: string | null) {
  if (!phone || phone.length < 7) {
    return phone ?? "未绑定手机号";
  }

  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

function toDateValue(value: string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
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
    expiresAt: toDateValue(item.expiresAt),
    nextOrderDate: toDateValue(item.nextOrderDate),
    reason: "",
    totalTimes: String(item.totalTimes),
    usedTimes: String(item.usedTimes),
    weightLimitJin: String(item.weightLimitJin),
  };
}

export function PackageManagementPanel({
  initialItems,
  store,
}: PackageManagementPanelProps) {
  const [items, setItems] = useState(initialItems);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
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
          if (item.status === "FROZEN") {
            value.frozen += 1;
          }
          if (item.status === "EXPIRED") {
            value.expired += 1;
          }
          return value;
        },
        { active: 0, expired: 0, frozen: 0, total: 0 },
      ),
    [items],
  );

  function openModal(item: PackagePanelItem, mode: ModalMode) {
    setModal({ item, mode });
    setForm(buildFormState(item));
    setFullscreen(false);
    setOffset({ x: 0, y: 0 });
    setError(null);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setModal(null);
    setForm(null);
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

  async function submitModal() {
    if (!modal || !form || !store) {
      return;
    }

    setSaving(true);
    setError(null);

    const isAdjust = modal.mode === "adjust";
    const endpoint = isAdjust
      ? `/api/admin/user-packages/${modal.item.id}`
      : `/api/admin/user-packages/${modal.item.id}/${modal.mode}`;
    const payload = isAdjust
      ? {
          expiresAt: form.expiresAt,
          nextOrderDate: form.nextOrderDate || null,
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
        method: isAdjust ? "PATCH" : "POST",
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
        value.map((item) =>
          item.id === modal.item.id
            ? {
                ...item,
                ...result.data?.userPackage,
              }
            : item,
        ),
      );
      setModal(null);
      setForm(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "操作失败");
    } finally {
      setSaving(false);
    }
  }

  const modalTitle =
    modal?.mode === "adjust"
      ? "调整用户套餐"
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
            {store?.name ?? "未选择门店"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#66756d]">
            会员套餐独立于后台用户，可按加盟门店冻结、解冻和调整次数。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ["全部", summary.total],
            ["可预订", summary.active],
            ["冻结", summary.frozen],
            ["过期", summary.expired],
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
            className="h-[58px] rounded-xl border border-dashed border-[#b8d8bf] bg-[#f8fff8] px-4 text-sm font-semibold text-[#1f8f4f]"
            title="微信支付接入后启用"
            type="button"
          >
            购买套餐预留
          </button>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-[#dbe6dc]">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[#f5f8f3] text-[#66756d]">
            <tr>
              <th className="px-4 py-3 font-medium">会员</th>
              <th className="px-4 py-3 font-medium">套餐</th>
              <th className="px-4 py-3 font-medium">剩余次数</th>
              <th className="px-4 py-3 font-medium">有效期</th>
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
                    每次 {item.weightLimitJin} 斤 · {item.store.name}
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
                  <div className="flex items-center gap-2">
                    <CalendarDays size={16} />
                    <span>{formatDate(item.expiresAt)}</span>
                  </div>
                  <div className="mt-1 text-xs text-[#66756d]">
                    下次 {formatDate(item.nextOrderDate)}
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
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-[#66756d]" colSpan={6}>
                  当前门店还没有用户套餐
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {modal && form ? (
        <div className="fixed inset-0 z-50 bg-[#0f2418]/35 p-5">
          <div
            className={[
              "mx-auto flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-2xl",
              fullscreen
                ? "h-full w-full"
                : "h-[66vh] w-[720px] max-w-full resize",
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
                  {modalTitle} · {modal.item.user.nickname ?? modal.item.user.phone}
                </div>
                <div className="mt-1 text-sm text-[#66756d]">
                  标题栏可拖拽，右下角可伸缩，右上角支持全屏
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
              <div className="rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] p-4 text-sm leading-7">
                <div className="font-semibold">{modal.item.nameSnapshot}</div>
                <div className="text-[#66756d]">
                  {modal.item.store.name} · {maskPhone(modal.item.user.phone)} ·
                  当前 {modal.item.remainingTimes}/{modal.item.totalTimes} 次
                </div>
              </div>

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
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    有效期至
                    <input
                      className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        setForm((value) =>
                          value ? { ...value, expiresAt: event.target.value } : value,
                        )
                      }
                      type="date"
                      value={form.expiresAt}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
                    下次可预订日期
                    <input
                      className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        setForm((value) =>
                          value
                            ? { ...value, nextOrderDate: event.target.value }
                            : value,
                        )
                      }
                      type="date"
                      value={form.nextOrderDate}
                    />
                  </label>
                </div>
              ) : null}

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
                      : modal.mode === "unfreeze"
                        ? "例如：用户恢复配送"
                        : "例如：后台补偿调整"
                  }
                  value={form.reason}
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
                onClick={closeModal}
                type="button"
              >
                取消
              </button>
              <button
                className="h-10 rounded-xl bg-[#1f8f4f] px-5 font-semibold text-white disabled:opacity-60"
                disabled={saving}
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
