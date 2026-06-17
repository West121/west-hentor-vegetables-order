"use client";

import {
  CalendarClock,
  Eye,
  Maximize2,
  Minimize2,
  Pencil,
  Plus,
  Truck,
  X,
} from "lucide-react";
import { useMemo, useRef, useState, type PointerEvent } from "react";

type StoreOption = {
  id: string;
  name: string;
};

type OrderMemberOption = {
  defaultAddress: {
    detail: string;
    id: string;
    receiverName: string;
    receiverPhone: string;
  } | null;
  id: string;
  latestActivePackage: {
    id: string;
    remainingTimes: number;
    totalTimes: number;
    usedTimes: number;
    weightLimitJin: number;
  } | null;
  nickname: string | null;
  phone: string | null;
};

type OrderDishOption = {
  id: string;
  name: string;
  status: string;
  stepJin: number;
  stockJin: number;
};

type OrderStatus =
  | "CANCELED"
  | "PENDING_SHIPMENT"
  | "SHIPPED"
  | "SIGNED"
  | "VOIDED";

export type OrderPanelItem = {
  addressSnapshot: Record<string, unknown>;
  canceledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  id: string;
  internalRemark: string | null;
  items: Array<{
    dishId: string;
    dishNameSnapshot: string;
    id: string;
    weightJin: number;
  }>;
  logisticsNo: string | null;
  modifiedAt: string | null;
  orderNo: string;
  shippedAt: string | null;
  signedAt: string | null;
  status: OrderStatus;
  store: {
    code: string;
    id: string;
    name: string;
  };
  totalWeightJin: number;
  updatedAt: string;
  user: {
    id: string;
    nickname: string | null;
    phone: string | null;
    status: string;
  };
  userPackage: {
    id: string;
    nameSnapshot: string;
  };
  userVisibleRemark: string | null;
};

type OrderManagementPanelProps = {
  dishOptions: OrderDishOption[];
  initialItems: OrderPanelItem[];
  memberOptions: OrderMemberOption[];
  store: StoreOption | null;
};

type ModalMode = "create" | "detail" | "edit";

type ModalState = {
  item: OrderPanelItem | null;
  mode: ModalMode;
};

type FormState = {
  createItems: Record<string, string>;
  createUserId: string;
  internalRemark: string;
  logisticsNo: string;
  userVisibleRemark: string;
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  CANCELED: "已取消",
  PENDING_SHIPMENT: "待配送",
  SHIPPED: "已发货",
  SIGNED: "已签收",
  VOIDED: "已作废",
};

function maskPhone(phone: string | null) {
  if (!phone || phone.length < 7) {
    return phone ?? "未绑定手机号";
  }

  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

function textFromSnapshot(
  snapshot: Record<string, unknown>,
  key: string,
  fallback: string | null = "",
) {
  const value = snapshot[key];
  return typeof value === "string" ? value : fallback;
}

function addressText(snapshot: Record<string, unknown>) {
  return [
    textFromSnapshot(snapshot, "province"),
    textFromSnapshot(snapshot, "city"),
    textFromSnapshot(snapshot, "district"),
    textFromSnapshot(snapshot, "detail"),
  ]
    .filter(Boolean)
    .join(" ") || "未记录地址";
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "未设置";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function buildFormState(
  item: OrderPanelItem | null,
  memberOptions: OrderMemberOption[] = [],
): FormState {
  return {
    createItems: {},
    createUserId: memberOptions[0]?.id ?? "",
    internalRemark: item?.internalRemark ?? "",
    logisticsNo: item?.logisticsNo ?? "",
    userVisibleRemark: item?.userVisibleRemark ?? "",
  };
}

export function OrderManagementPanel({
  dishOptions,
  initialItems,
  memberOptions,
  store,
}: OrderManagementPanelProps) {
  const [items, setItems] = useState(initialItems);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [form, setForm] = useState<FormState>(buildFormState(null, memberOptions));
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
          if (item.status === "PENDING_SHIPMENT") {
            value.pending += 1;
          }
          if (item.status === "SHIPPED") {
            value.shipped += 1;
          }
          if (item.status === "SIGNED") {
            value.signed += 1;
          }
          return value;
        },
        { pending: 0, shipped: 0, signed: 0, total: 0 },
      ),
    [items],
  );

  function openModal(item: OrderPanelItem | null, mode: ModalMode) {
    setModal({ item, mode });
    setForm(buildFormState(item, memberOptions));
    setFullscreen(false);
    setOffset({ x: 0, y: 0 });
    setError(null);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setModal(null);
    setError(null);
  }

  function patchCurrentOrder(update: Partial<OrderPanelItem>) {
    if (!modal?.item) {
      return;
    }

    setItems((value) =>
      value.map((item) =>
        item.id === modal.item?.id
          ? {
              ...item,
              ...update,
            }
          : item,
      ),
    );
    setModal((value) =>
      value?.item
        ? {
            ...value,
            item: {
              ...value.item,
              ...update,
            },
          }
        : value,
    );
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

  const selectedCreateMember = memberOptions.find(
    (member) => member.id === form.createUserId,
  );
  const createOrderItems = dishOptions
    .map((dish) => ({
      dishId: dish.id,
      name: dish.name,
      weightJin: Number(form.createItems[dish.id] || 0),
    }))
    .filter((item) => item.weightJin > 0);
  const createTotalWeightJin = createOrderItems.reduce(
    (sum, item) => sum + item.weightJin,
    0,
  );
  const createPackage = selectedCreateMember?.latestActivePackage ?? null;
  const createAddress = selectedCreateMember?.defaultAddress ?? null;
  const createDisabled =
    saving ||
    !store ||
    !selectedCreateMember ||
    !createPackage ||
    !createAddress ||
    createOrderItems.length === 0 ||
    createTotalWeightJin > (createPackage?.weightLimitJin ?? 0);

  function changeCreateDish(dish: OrderDishOption, delta: number) {
    setForm((value) => {
      const current = Number(value.createItems[dish.id] || 0);
      const next = Math.max(current + delta, 0);
      const stepped =
        dish.stepJin > 0
          ? Math.round(next / dish.stepJin) * dish.stepJin
          : next;

      return {
        ...value,
        createItems: {
          ...value.createItems,
          [dish.id]: Number(stepped.toFixed(2)).toString(),
        },
      };
    });
  }

  async function saveRemark() {
    if (!modal?.item || !store) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/orders/${modal.item.id}`, {
        body: JSON.stringify({
          internalRemark: form.internalRemark,
          storeId: store.id,
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const result = (await response.json()) as {
        data?: { order: Partial<OrderPanelItem> };
        error?: { message: string };
        success: boolean;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message ?? "保存失败");
      }

      patchCurrentOrder(result.data?.order ?? {});
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function shipCurrentOrder() {
    if (!modal?.item || !store) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/orders/${modal.item.id}/ship`, {
        body: JSON.stringify({
          logisticsNo: form.logisticsNo,
          storeId: store.id,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as {
        data?: { order: Partial<OrderPanelItem> };
        error?: { message: string };
        success: boolean;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message ?? "发货失败");
      }

      patchCurrentOrder(result.data?.order ?? {});
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "发货失败");
    } finally {
      setSaving(false);
    }
  }

  async function createOrder() {
    if (!store || !selectedCreateMember || !createPackage || !createAddress) {
      setError("请选择具备有效套餐和默认地址的会员");
      return;
    }

    if (createOrderItems.length === 0) {
      setError("请选择菜品");
      return;
    }

    if (createTotalWeightJin > createPackage.weightLimitJin) {
      setError("已超过套餐本次可预订重量");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/orders", {
        body: JSON.stringify({
          addressId: createAddress.id,
          internalRemark: form.internalRemark,
          items: createOrderItems.map((item) => ({
            dishId: item.dishId,
            weightJin: item.weightJin,
          })),
          storeId: store.id,
          userId: selectedCreateMember.id,
          userPackageId: createPackage.id,
          userVisibleRemark: form.userVisibleRemark,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as {
        data?: { order: OrderPanelItem };
        error?: { message: string };
        success: boolean;
      };

      if (!response.ok || !result.success || !result.data?.order) {
        throw new Error(result.error?.message ?? "新建订单失败");
      }

      setItems((value) => [result.data!.order, ...value]);
      setModal(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "新建订单失败");
    } finally {
      setSaving(false);
    }
  }

  const modalTitle =
    modal?.mode === "create"
      ? "新建订单"
      : modal?.mode === "edit"
        ? `编辑订单 · ${modal.item?.orderNo}`
        : `订单详情 · ${modal?.item?.orderNo}`;

  return (
    <section className="rounded-2xl border border-[#dbe6dc] bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1f8f4f]">
            <CalendarClock size={18} />
            订单管理
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-normal">订单列表</h2>
          <p className="mt-2 text-sm leading-6 text-[#66756d]">
            订单详情、备注编辑和发货处理都在弹窗内完成。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ["全部", summary.total],
            ["待配送", summary.pending],
            ["已发货", summary.shipped],
            ["已签收", summary.signed],
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
            className="flex h-[58px] items-center gap-2 rounded-xl bg-[#1f8f4f] px-4 text-sm font-semibold text-white"
            onClick={() => openModal(null, "create")}
            type="button"
          >
            <Plus size={16} />
            新建订单
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#dbe6dc]">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[#f5f8f3] text-[#66756d]">
            <tr>
              <th className="px-4 py-3 font-medium">订单号</th>
              <th className="px-4 py-3 font-medium">会员</th>
              <th className="px-4 py-3 font-medium">菜品</th>
              <th className="px-4 py-3 font-medium">地址</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf2ed]">
            {items.map((order) => (
              <tr key={order.id}>
                <td className="px-4 py-4">
                  <div className="font-semibold">{order.orderNo}</div>
                  <div className="mt-1 text-xs text-[#66756d]">
                    {formatDateTime(order.createdAt)}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-semibold">
                    {order.user.nickname ?? "未命名会员"}
                  </div>
                  <div className="mt-1 text-xs text-[#66756d]">
                    {maskPhone(order.user.phone)}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-semibold">{order.totalWeightJin} 斤</div>
                  <div className="mt-1 max-w-52 truncate text-xs text-[#66756d]">
                    {order.items
                      .map((item) => `${item.dishNameSnapshot} ${item.weightJin}斤`)
                      .join(" / ")}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="max-w-52 truncate">
                    {addressText(order.addressSnapshot)}
                  </div>
                  <div className="mt-1 text-xs text-[#66756d]">
                    {textFromSnapshot(order.addressSnapshot, "receiverName")} ·{" "}
                    {maskPhone(
                      textFromSnapshot(order.addressSnapshot, "receiverPhone", null),
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="rounded-full bg-[#e8f6ed] px-3 py-1 text-xs font-semibold text-[#1f8f4f]">
                    {STATUS_LABELS[order.status]}
                  </span>
                  {order.logisticsNo ? (
                    <div className="mt-2 text-xs text-[#66756d]">
                      {order.logisticsNo}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      className="grid h-9 w-9 place-items-center rounded-xl border border-[#dbe6dc] text-[#1f8f4f] hover:bg-[#f3f7f1]"
                      onClick={() => openModal(order, "detail")}
                      title="查看详情"
                      type="button"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      className="grid h-9 w-9 place-items-center rounded-xl border border-[#dbe6dc] text-[#1f8f4f] hover:bg-[#f3f7f1]"
                      onClick={() => openModal(order, "edit")}
                      title="编辑备注"
                      type="button"
                    >
                      <Pencil size={16} />
                    </button>
                    {order.status === "PENDING_SHIPMENT" ? (
                      <button
                        className="grid h-9 w-9 place-items-center rounded-xl border border-[#cfe3d3] bg-[#eff8f1] text-[#1f8f4f]"
                        onClick={() => openModal(order, "edit")}
                        title="发货"
                        type="button"
                      >
                        <Truck size={16} />
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-[#66756d]" colSpan={6}>
                  当前门店还没有订单
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
              "mx-auto flex min-h-[540px] flex-col overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-2xl",
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

            <div className="grid flex-1 gap-6 overflow-auto p-6 lg:grid-cols-[1fr_280px]">
              {modal.item ? (
                <>
                  <div className="flex flex-col gap-5">
                    <section className="rounded-xl border border-[#dbe6dc] p-4">
                      <h3 className="font-semibold">基础信息</h3>
                      <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                        <div>
                          <div className="text-[#66756d]">会员</div>
                          <div className="mt-1 font-medium">
                            {modal.item.user.nickname ?? "未命名会员"} ·{" "}
                            {maskPhone(modal.item.user.phone)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#66756d]">门店</div>
                          <div className="mt-1 font-medium">{modal.item.store.name}</div>
                        </div>
                        <div>
                          <div className="text-[#66756d]">套餐</div>
                          <div className="mt-1 font-medium">
                            {modal.item.userPackage.nameSnapshot}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#66756d]">状态</div>
                          <div className="mt-1 font-medium">
                            {STATUS_LABELS[modal.item.status]}
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-xl border border-[#dbe6dc] p-4">
                      <h3 className="font-semibold">配送地址</h3>
                      <div className="mt-3 text-sm leading-7">
                        {addressText(modal.item.addressSnapshot)}
                      </div>
                      <div className="text-sm text-[#66756d]">
                        {textFromSnapshot(modal.item.addressSnapshot, "receiverName")} ·{" "}
                        {maskPhone(
                          textFromSnapshot(
                            modal.item.addressSnapshot,
                            "receiverPhone",
                            null,
                          ),
                        )}
                      </div>
                    </section>

                    <section className="rounded-xl border border-[#dbe6dc] p-4">
                      <h3 className="font-semibold">菜品明细</h3>
                      <div className="mt-3 flex flex-col gap-2">
                        {modal.item.items.map((item) => (
                          <div
                            className="flex items-center justify-between rounded-lg bg-[#f8fbf7] px-3 py-2 text-sm"
                            key={item.id}
                          >
                            <span>{item.dishNameSnapshot}</span>
                            <span className="font-semibold">{item.weightJin} 斤</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  <aside className="flex flex-col gap-4">
                    <div className="rounded-xl border border-[#cfe3d3] bg-[#f8fff8] p-4">
                      <h3 className="font-semibold">备注处理</h3>
                      <div className="mt-3 text-sm text-[#66756d]">会员备注</div>
                      <div className="mt-1 text-sm leading-6">
                        {modal.item.userVisibleRemark || "无"}
                      </div>
                      <label className="mt-4 flex flex-col gap-2 text-sm font-medium">
                        内部备注
                        <textarea
                          className="min-h-28 resize-y rounded-xl border border-[#dbe6dc] p-3 outline-none focus:border-[#1f8f4f]"
                          onChange={(event) =>
                            setForm((value) => ({
                              ...value,
                              internalRemark: event.target.value,
                            }))
                          }
                          value={form.internalRemark}
                        />
                      </label>
                      <button
                        className="mt-3 h-10 w-full rounded-xl bg-[#1f8f4f] font-semibold text-white disabled:opacity-60"
                        disabled={saving}
                        onClick={saveRemark}
                        type="button"
                      >
                        保存备注
                      </button>
                    </div>

                    <div className="rounded-xl border border-[#dbe6dc] p-4">
                      <h3 className="font-semibold">配送处理</h3>
                      <label className="mt-3 flex flex-col gap-2 text-sm font-medium">
                        运单号
                        <input
                          className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                          onChange={(event) =>
                            setForm((value) => ({
                              ...value,
                              logisticsNo: event.target.value,
                            }))
                          }
                          value={form.logisticsNo}
                        />
                      </label>
                      <button
                        className="mt-3 h-10 w-full rounded-xl border border-[#cfe3d3] bg-[#eff8f1] font-semibold text-[#1f8f4f] disabled:opacity-60"
                        disabled={saving || modal.item.status !== "PENDING_SHIPMENT"}
                        onClick={shipCurrentOrder}
                        type="button"
                      >
                        确认发货
                      </button>
                    </div>
                  </aside>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-5">
                    <section className="rounded-xl border border-[#dbe6dc] p-4">
                      <h3 className="font-semibold">会员与套餐</h3>
                      <label className="mt-4 flex flex-col gap-2 text-sm font-medium">
                        会员
                        <select
                          className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                          onChange={(event) =>
                            setForm((value) => ({
                              ...value,
                              createItems: {},
                              createUserId: event.target.value,
                            }))
                          }
                          value={form.createUserId}
                        >
                          {memberOptions.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.nickname ?? "未命名会员"} ·{" "}
                              {maskPhone(member.phone)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                        <div className="rounded-xl bg-[#f8fbf7] p-3">
                          <div className="text-[#66756d]">有效套餐</div>
                          <div className="mt-1 font-semibold">
                            {createPackage
                              ? `${createPackage.remainingTimes}/${createPackage.totalTimes} 次 · ${createPackage.weightLimitJin}斤`
                              : "该会员暂无可用套餐"}
                          </div>
                        </div>
                        <div className="rounded-xl bg-[#f8fbf7] p-3">
                          <div className="text-[#66756d]">默认地址</div>
                          <div className="mt-1 font-semibold">
                            {createAddress
                              ? `${createAddress.receiverName} · ${createAddress.detail}`
                              : "该会员暂无默认地址"}
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-xl border border-[#dbe6dc] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold">选择菜品</h3>
                        <div className="text-sm text-[#66756d]">
                          已选 {createTotalWeightJin.toFixed(1)} /{" "}
                          {createPackage?.weightLimitJin ?? 0}斤
                        </div>
                      </div>
                      <div className="mt-3 flex flex-col gap-2">
                        {dishOptions
                          .filter((dish) => dish.status === "ON_SALE")
                          .map((dish) => {
                            const weight = Number(form.createItems[dish.id] || 0);
                            return (
                              <div
                                className="flex items-center justify-between gap-3 rounded-lg bg-[#f8fbf7] px-3 py-2 text-sm"
                                key={dish.id}
                              >
                                <div className="min-w-0">
                                  <div className="truncate font-semibold">
                                    {dish.name}
                                  </div>
                                  <div className="text-xs text-[#66756d]">
                                    库存 {dish.stockJin}斤 · 步进 {dish.stepJin}斤
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    className="grid h-8 w-8 place-items-center rounded-full bg-[#eef5eb] font-semibold text-[#1f8f4f]"
                                    onClick={() => changeCreateDish(dish, -dish.stepJin)}
                                    type="button"
                                  >
                                    -
                                  </button>
                                  <span className="w-10 text-center font-semibold">
                                    {weight}
                                  </span>
                                  <button
                                    className="grid h-8 w-8 place-items-center rounded-full bg-[#1f8f4f] font-semibold text-white"
                                    onClick={() => changeCreateDish(dish, dish.stepJin)}
                                    type="button"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </section>
                  </div>

                  <aside className="flex flex-col gap-4">
                    <div className="rounded-xl border border-[#cfe3d3] bg-[#f8fff8] p-4">
                      <h3 className="font-semibold">备注</h3>
                      <label className="mt-3 flex flex-col gap-2 text-sm font-medium">
                        会员可见备注
                        <textarea
                          className="min-h-24 resize-y rounded-xl border border-[#dbe6dc] p-3 outline-none focus:border-[#1f8f4f]"
                          onChange={(event) =>
                            setForm((value) => ({
                              ...value,
                              userVisibleRemark: event.target.value,
                            }))
                          }
                          placeholder="如：不要香菜，配送前电话确认"
                          value={form.userVisibleRemark}
                        />
                      </label>
                      <label className="mt-4 flex flex-col gap-2 text-sm font-medium">
                        内部备注
                        <textarea
                          className="min-h-24 resize-y rounded-xl border border-[#dbe6dc] p-3 outline-none focus:border-[#1f8f4f]"
                          onChange={(event) =>
                            setForm((value) => ({
                              ...value,
                              internalRemark: event.target.value,
                            }))
                          }
                          value={form.internalRemark}
                        />
                      </label>
                    </div>
                  </aside>
                </>
              )}

              {error ? (
                <div className="lg:col-span-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
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
                关闭
              </button>
              {modal.mode === "create" ? (
                <button
                  className="h-10 rounded-xl bg-[#1f8f4f] px-5 font-semibold text-white disabled:opacity-60"
                  disabled={createDisabled}
                  onClick={createOrder}
                  type="button"
                >
                  {saving ? "提交中" : "提交订单"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
