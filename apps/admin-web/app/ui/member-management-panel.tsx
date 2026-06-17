"use client";

import {
  Ban,
  Maximize2,
  Minimize2,
  Pencil,
  RotateCcw,
  UserRound,
  X,
} from "lucide-react";
import { useMemo, useRef, useState, type PointerEvent } from "react";

type StoreOption = {
  id: string;
  name: string;
};

type BindingStatus = "ACTIVE" | "DISABLED";

export type MemberPanelItem = {
  activePackageCount: number;
  avatarUrl: string | null;
  bindingId: string;
  bindingStatus: BindingStatus;
  createdAt: string;
  defaultAddress: {
    detail: string;
    id: string;
    receiverName: string;
    receiverPhone: string;
  } | null;
  defaultStoreId: string | null;
  disabledReason: string | null;
  id: string;
  isDefaultBinding: boolean;
  latestActivePackage: {
    id: string;
    remainingTimes: number;
    totalTimes: number;
    usedTimes: number;
    weightLimitJin: number;
  } | null;
  nickname: string | null;
  orderCount: number;
  phone: string | null;
  remark: string | null;
  source: string | null;
  status: string;
  store: {
    code: string;
    id: string;
    name: string;
  };
  updatedAt: string;
};

type MemberManagementPanelProps = {
  initialItems: MemberPanelItem[];
  store: StoreOption | null;
};

type FormState = {
  disabledReason: string;
  remark: string;
  status: BindingStatus;
};

const STATUS_LABELS: Record<BindingStatus, string> = {
  ACTIVE: "可服务",
  DISABLED: "已停用",
};

function maskPhone(phone: string | null) {
  if (!phone || phone.length < 7) {
    return phone ?? "未绑定手机号";
  }

  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function buildFormState(member: MemberPanelItem): FormState {
  return {
    disabledReason: member.disabledReason ?? "",
    remark: member.remark ?? "",
    status: member.bindingStatus,
  };
}

export function MemberManagementPanel({
  initialItems,
  store,
}: MemberManagementPanelProps) {
  const [items, setItems] = useState(initialItems);
  const [modalMember, setModalMember] = useState<MemberPanelItem | null>(null);
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
          if (item.bindingStatus === "ACTIVE") {
            value.active += 1;
          }
          if (item.bindingStatus === "DISABLED") {
            value.disabled += 1;
          }
          return value;
        },
        { active: 0, disabled: 0, total: 0 },
      ),
    [items],
  );

  function openModal(member: MemberPanelItem) {
    setModalMember(member);
    setForm(buildFormState(member));
    setFullscreen(false);
    setOffset({ x: 0, y: 0 });
    setError(null);
  }

  function openModalWithStatus(member: MemberPanelItem, status: BindingStatus) {
    setModalMember(member);
    setForm({
      ...buildFormState(member),
      status,
    });
    setFullscreen(false);
    setOffset({ x: 0, y: 0 });
    setError(null);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setModalMember(null);
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
    if (!modalMember || !form || !store) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/members/${modalMember.id}`, {
        body: JSON.stringify({
          disabledReason: form.disabledReason,
          remark: form.remark,
          status: form.status,
          storeId: store.id,
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const result = (await response.json()) as {
        data?: {
          member: {
            bindingStatus: BindingStatus;
            disabledReason: string | null;
            id: string;
            remark: string | null;
          };
        };
        error?: { message: string };
        success: boolean;
      };

      if (!response.ok || !result.success || !result.data?.member) {
        throw new Error(result.error?.message ?? "保存失败");
      }

      const updatedMember = result.data.member;
      setItems((value) =>
        value.map((item) =>
          item.id === modalMember.id
            ? {
                ...item,
                bindingStatus: updatedMember.bindingStatus,
                disabledReason: updatedMember.disabledReason,
                remark: updatedMember.remark,
              }
            : item,
        ),
      );
      setModalMember(null);
      setForm(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#dbe6dc] bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1f8f4f]">
            <UserRound size={18} />
            会员用户管理
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-normal">
            {store?.name ?? "未选择门店"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#66756d]">
            会员用户来自小程序登录，与系统后台用户分开管理。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ["全部", summary.total],
            ["可服务", summary.active],
            ["已停用", summary.disabled],
          ].map(([label, value]) => (
            <div
              className="rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] px-4 py-2"
              key={label}
            >
              <div className="text-xs text-[#66756d]">{label}</div>
              <div className="mt-1 text-lg font-semibold">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#dbe6dc]">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[#f5f8f3] text-[#66756d]">
            <tr>
              <th className="px-4 py-3 font-medium">会员</th>
              <th className="px-4 py-3 font-medium">套餐</th>
              <th className="px-4 py-3 font-medium">订单</th>
              <th className="px-4 py-3 font-medium">默认地址</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf2ed]">
            {items.map((member) => (
              <tr key={member.id}>
                <td className="px-4 py-4">
                  <div className="font-semibold">
                    {member.nickname ?? "未命名会员"}
                  </div>
                  <div className="mt-1 text-xs text-[#66756d]">
                    {maskPhone(member.phone)} · {formatDate(member.createdAt)}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-semibold">
                    {member.latestActivePackage
                      ? `${member.latestActivePackage.remainingTimes}/${member.latestActivePackage.totalTimes} 次`
                      : "无有效套餐"}
                  </div>
                  <div className="mt-1 text-xs text-[#66756d]">
                    有效套餐 {member.activePackageCount} 个
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-semibold">{member.orderCount} 单</div>
                  <div className="mt-1 text-xs text-[#66756d]">
                    小程序预订记录
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="max-w-52 truncate">
                    {member.defaultAddress?.detail ?? "未设置"}
                  </div>
                  <div className="mt-1 text-xs text-[#66756d]">
                    {member.defaultAddress?.receiverName ?? "-"} ·{" "}
                    {maskPhone(member.defaultAddress?.receiverPhone ?? null)}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="rounded-full bg-[#e8f6ed] px-3 py-1 text-xs font-semibold text-[#1f8f4f]">
                    {STATUS_LABELS[member.bindingStatus]}
                  </span>
                  {member.disabledReason ? (
                    <div className="mt-2 max-w-36 truncate text-xs text-[#66756d]">
                      {member.disabledReason}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      className="grid h-9 w-9 place-items-center rounded-xl border border-[#dbe6dc] text-[#1f8f4f] hover:bg-[#f3f7f1]"
                      onClick={() => openModal(member)}
                      title="编辑会员"
                      type="button"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="grid h-9 w-9 place-items-center rounded-xl border border-[#dbe6dc] text-[#1f8f4f] hover:bg-[#f3f7f1]"
                      onClick={() =>
                        openModalWithStatus(
                          member,
                          member.bindingStatus === "ACTIVE"
                            ? "DISABLED"
                            : "ACTIVE",
                        )
                      }
                      title={member.bindingStatus === "ACTIVE" ? "停用" : "启用"}
                      type="button"
                    >
                      {member.bindingStatus === "ACTIVE" ? (
                        <Ban size={16} />
                      ) : (
                        <RotateCcw size={16} />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-[#66756d]" colSpan={6}>
                  当前门店还没有会员用户
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {modalMember && form ? (
        <div className="fixed inset-0 z-50 bg-[#0f2418]/35 p-5">
          <div
            className={[
              "mx-auto flex min-h-[500px] flex-col overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-2xl",
              fullscreen
                ? "h-full w-full"
                : "h-[64vh] w-[720px] max-w-full resize",
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
                  会员详情 · {modalMember.nickname ?? modalMember.phone}
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

            <div className="grid flex-1 gap-5 overflow-auto p-6 md:grid-cols-[1fr_280px]">
              <div className="flex flex-col gap-4">
                <section className="rounded-xl border border-[#dbe6dc] p-4">
                  <h3 className="font-semibold">基础信息</h3>
                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                    <div>
                      <div className="text-[#66756d]">手机号</div>
                      <div className="mt-1 font-medium">
                        {maskPhone(modalMember.phone)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#66756d]">所属门店</div>
                      <div className="mt-1 font-medium">{modalMember.store.name}</div>
                    </div>
                    <div>
                      <div className="text-[#66756d]">订单数</div>
                      <div className="mt-1 font-medium">
                        {modalMember.orderCount} 单
                      </div>
                    </div>
                    <div>
                      <div className="text-[#66756d]">有效套餐</div>
                      <div className="mt-1 font-medium">
                        {modalMember.activePackageCount} 个
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-[#dbe6dc] p-4">
                  <h3 className="font-semibold">默认地址</h3>
                  <div className="mt-3 text-sm leading-7">
                    {modalMember.defaultAddress?.detail ?? "未设置"}
                  </div>
                </section>
              </div>

              <aside className="flex flex-col gap-4">
                <div className="rounded-xl border border-[#cfe3d3] bg-[#f8fff8] p-4">
                  <h3 className="font-semibold">门店服务状态</h3>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {(["ACTIVE", "DISABLED"] as const).map((status) => (
                      <button
                        className={[
                          "h-10 rounded-xl border text-sm font-semibold",
                          form.status === status
                            ? "border-[#1f8f4f] bg-[#e8f6ed] text-[#1f8f4f]"
                            : "border-[#dbe6dc] text-[#66756d]",
                        ].join(" ")}
                        key={status}
                        onClick={() =>
                          setForm((value) =>
                            value ? { ...value, status } : value,
                          )
                        }
                        type="button"
                      >
                        {STATUS_LABELS[status]}
                      </button>
                    ))}
                  </div>
                  <label className="mt-4 flex flex-col gap-2 text-sm font-medium">
                    会员备注
                    <textarea
                      className="min-h-24 resize-y rounded-xl border border-[#dbe6dc] p-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        setForm((value) =>
                          value ? { ...value, remark: event.target.value } : value,
                        )
                      }
                      value={form.remark}
                    />
                  </label>
                  <label className="mt-4 flex flex-col gap-2 text-sm font-medium">
                    停用原因
                    <textarea
                      className="min-h-20 resize-y rounded-xl border border-[#dbe6dc] p-3 outline-none focus:border-[#1f8f4f]"
                      disabled={form.status === "ACTIVE"}
                      onChange={(event) =>
                        setForm((value) =>
                          value
                            ? { ...value, disabledReason: event.target.value }
                            : value,
                        )
                      }
                      value={form.disabledReason}
                    />
                  </label>
                </div>

                {error ? (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}
              </aside>
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
