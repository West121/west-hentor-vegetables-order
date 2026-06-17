"use client";

import {
  Building2,
  Maximize2,
  Minimize2,
  Pencil,
  Plus,
  Store,
  X,
} from "lucide-react";
import { useMemo, useRef, useState, type PointerEvent } from "react";

type StoreStatus = "ACTIVE" | "DISABLED";
type StoreType = "DIRECT" | "FRANCHISE";
type FranchiseeStatus = "ACTIVE" | "SUSPENDED" | "EXPIRED";

export type StorePanelItem = {
  address: string;
  addressDetail: string | null;
  adminUserCount: number;
  city: string | null;
  code: string;
  contactName: string;
  contactPhone: string;
  createdAt: string;
  customerServiceTel: string | null;
  cutoffTime: string;
  district: string | null;
  franchiseEndsAt: string | null;
  franchiseeId: string | null;
  franchiseeName: string;
  id: string;
  memberCount: number;
  name: string;
  orderCount: number;
  packageTemplateCount: number;
  province: string | null;
  status: StoreStatus;
  type: StoreType;
  updatedAt: string;
};

export type FranchiseePanelItem = {
  contactName: string;
  contactPhone: string;
  contractEndsAt: string | null;
  createdAt: string;
  id: string;
  name: string;
  remark: string | null;
  status: FranchiseeStatus;
  storeCount: number;
  updatedAt: string;
};

type StoreSummary = {
  active: number;
  direct: number;
  disabled: number;
  franchise: number;
  total: number;
};

type FranchiseeSummary = {
  active: number;
  expired: number;
  suspended: number;
  total: number;
};

type StoreManagementPanelProps = {
  canManageAllStores: boolean;
  initialFranchisees: FranchiseePanelItem[];
  initialFranchiseeSummary: FranchiseeSummary;
  initialStoreSummary: StoreSummary;
  initialStores: StorePanelItem[];
};

type ModalState =
  | { item: null; mode: "create-franchisee" }
  | { item: FranchiseePanelItem; mode: "edit-franchisee" }
  | { item: null; mode: "create-store" }
  | { item: StorePanelItem; mode: "edit-store" };

type StoreForm = {
  address: string;
  city: string;
  code: string;
  contactName: string;
  contactPhone: string;
  customerServiceTel: string;
  cutoffTime: string;
  district: string;
  franchiseEndsAt: string;
  franchiseeId: string;
  name: string;
  province: string;
  status: StoreStatus;
  type: StoreType;
};

type FranchiseeForm = {
  contactName: string;
  contactPhone: string;
  contractEndsAt: string;
  name: string;
  remark: string;
  status: FranchiseeStatus;
};

const STORE_STATUS_LABELS: Record<StoreStatus, string> = {
  ACTIVE: "营业",
  DISABLED: "停用",
};

const STORE_TYPE_LABELS: Record<StoreType, string> = {
  DIRECT: "直营",
  FRANCHISE: "加盟",
};

const FRANCHISEE_STATUS_LABELS: Record<FranchiseeStatus, string> = {
  ACTIVE: "合作中",
  EXPIRED: "已到期",
  SUSPENDED: "暂停",
};

function dateInputValue(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function buildStoreForm(item?: StorePanelItem | null): StoreForm {
  return {
    address: item?.addressDetail ?? "",
    city: item?.city ?? "",
    code: item?.code ?? "",
    contactName: item?.contactName ?? "",
    contactPhone: item?.contactPhone ?? "",
    customerServiceTel: item?.customerServiceTel ?? "",
    cutoffTime: item?.cutoffTime ?? "18:00",
    district: item?.district ?? "",
    franchiseEndsAt: dateInputValue(item?.franchiseEndsAt),
    franchiseeId: item?.franchiseeId ?? "",
    name: item?.name ?? "",
    province: item?.province ?? "",
    status: item?.status ?? "ACTIVE",
    type: item?.type ?? "FRANCHISE",
  };
}

function buildFranchiseeForm(
  item?: FranchiseePanelItem | null,
): FranchiseeForm {
  return {
    contactName: item?.contactName ?? "",
    contactPhone: item?.contactPhone ?? "",
    contractEndsAt: dateInputValue(item?.contractEndsAt),
    name: item?.name ?? "",
    remark: item?.remark ?? "",
    status: item?.status ?? "ACTIVE",
  };
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

export function StoreManagementPanel({
  canManageAllStores,
  initialFranchisees,
  initialFranchiseeSummary,
  initialStoreSummary,
  initialStores,
}: StoreManagementPanelProps) {
  const [stores, setStores] = useState(initialStores);
  const [storeSummary, setStoreSummary] = useState(initialStoreSummary);
  const [franchisees, setFranchisees] = useState(initialFranchisees);
  const [franchiseeSummary, setFranchiseeSummary] = useState(
    initialFranchiseeSummary,
  );
  const [modal, setModal] = useState<ModalState | null>(null);
  const [storeForm, setStoreForm] = useState<StoreForm>(buildStoreForm());
  const [franchiseeForm, setFranchiseeForm] = useState<FranchiseeForm>(
    buildFranchiseeForm(),
  );
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

  const franchiseeOptions = useMemo(
    () => franchisees.filter((item) => item.status !== "EXPIRED"),
    [franchisees],
  );

  function resetModal() {
    setFullscreen(false);
    setOffset({ x: 0, y: 0 });
    setError(null);
  }

  function openCreateStore() {
    setModal({ item: null, mode: "create-store" });
    setStoreForm(buildStoreForm());
    resetModal();
  }

  function openEditStore(item: StorePanelItem) {
    setModal({ item, mode: "edit-store" });
    setStoreForm(buildStoreForm(item));
    resetModal();
  }

  function openCreateFranchisee() {
    setModal({ item: null, mode: "create-franchisee" });
    setFranchiseeForm(buildFranchiseeForm());
    resetModal();
  }

  function openEditFranchisee(item: FranchiseePanelItem) {
    setModal({ item, mode: "edit-franchisee" });
    setFranchiseeForm(buildFranchiseeForm(item));
    resetModal();
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

  function updateStoreForm<K extends keyof StoreForm>(key: K, value: StoreForm[K]) {
    setStoreForm((current) => ({ ...current, [key]: value }));
  }

  function updateFranchiseeForm<K extends keyof FranchiseeForm>(
    key: K,
    value: FranchiseeForm[K],
  ) {
    setFranchiseeForm((current) => ({ ...current, [key]: value }));
  }

  async function reloadStores() {
    const response = await fetch("/api/admin/stores");
    const result = (await response.json()) as {
      data?: { stores: StorePanelItem[]; summary: StoreSummary };
      success: boolean;
    };

    if (response.ok && result.success && result.data) {
      setStores(result.data.stores);
      setStoreSummary(result.data.summary);
    }
  }

  async function reloadFranchisees() {
    if (!canManageAllStores) {
      return;
    }

    const response = await fetch("/api/admin/franchisees");
    const result = (await response.json()) as {
      data?: { items: FranchiseePanelItem[]; summary: FranchiseeSummary };
      success: boolean;
    };

    if (response.ok && result.success && result.data) {
      setFranchisees(result.data.items);
      setFranchiseeSummary(result.data.summary);
    }
  }

  async function submitModal() {
    if (!modal || !canManageAllStores) {
      return;
    }

    setSaving(true);
    setError(null);

    const isStoreModal =
      modal.mode === "create-store" || modal.mode === "edit-store";
    const endpoint = isStoreModal
      ? modal.mode === "create-store"
        ? "/api/admin/stores"
        : `/api/admin/stores/${modal.item.id}`
      : modal.mode === "create-franchisee"
        ? "/api/admin/franchisees"
        : `/api/admin/franchisees/${modal.item.id}`;
    const payload = isStoreModal
      ? {
          ...storeForm,
          address: storeForm.address || null,
          city: storeForm.city || null,
          customerServiceTel: storeForm.customerServiceTel || null,
          district: storeForm.district || null,
          franchiseEndsAt: storeForm.franchiseEndsAt || null,
          franchiseeId:
            storeForm.type === "FRANCHISE" ? storeForm.franchiseeId : null,
          province: storeForm.province || null,
        }
      : {
          ...franchiseeForm,
          contractEndsAt: franchiseeForm.contractEndsAt || null,
          remark: franchiseeForm.remark || null,
        };

    try {
      const response = await fetch(endpoint, {
        body: JSON.stringify(payload),
        headers: { "content-type": "application/json" },
        method:
          modal.mode === "create-store" || modal.mode === "create-franchisee"
            ? "POST"
            : "PATCH",
      });
      const result = (await response.json()) as {
        error?: { message: string };
        success: boolean;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message ?? "保存失败");
      }

      await Promise.all([reloadStores(), reloadFranchisees()]);
      setModal(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="rounded-2xl border border-[#dbe6dc] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#1f8f4f]">
              <Store size={18} />
              门店管理
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-normal">
              加盟门店
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#66756d]">
              多门店按加盟模型管理，会员、套餐、任务和订单都归属到具体门店。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["全部", storeSummary.total],
              ["营业", storeSummary.active],
              ["停用", storeSummary.disabled],
              ["加盟", storeSummary.franchise],
              ["直营", storeSummary.direct],
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
              className="flex h-[58px] items-center gap-2 rounded-xl bg-[#1f8f4f] px-5 text-sm font-semibold text-white disabled:bg-[#b8d8bf]"
              disabled={!canManageAllStores}
              onClick={openCreateStore}
              type="button"
            >
              <Plus size={17} />
              新建门店
            </button>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-[#dbe6dc]">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-[#f5f8f3] text-[#66756d]">
              <tr>
                <th className="px-4 py-3 font-medium">门店</th>
                <th className="px-4 py-3 font-medium">加盟商</th>
                <th className="px-4 py-3 font-medium">运营</th>
                <th className="px-4 py-3 font-medium">业务数据</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ed]">
              {stores.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4">
                    <div className="max-w-60 truncate font-semibold">
                      {item.name}
                    </div>
                    <div className="mt-1 text-xs text-[#66756d]">{item.code}</div>
                    <div className="mt-1 max-w-72 truncate text-xs text-[#66756d]">
                      {item.address || "未填写地址"}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold">
                      {STORE_TYPE_LABELS[item.type]}
                    </div>
                    <div className="mt-1 text-xs text-[#66756d]">
                      {item.franchiseeName}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold">{item.contactName}</div>
                    <div className="mt-1 text-xs text-[#66756d]">
                      {item.contactPhone} · 截单 {item.cutoffTime}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold">{item.orderCount} 单</div>
                    <div className="mt-1 text-xs text-[#66756d]">
                      {item.memberCount} 会员 · {item.adminUserCount} 后台账号
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-[#eef5eb] px-2.5 py-1 text-xs font-semibold text-[#1f8f4f]">
                      {STORE_STATUS_LABELS[item.status]}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#dbe6dc] text-[#1f8f4f] disabled:opacity-50"
                      disabled={!canManageAllStores}
                      onClick={() => openEditStore(item)}
                      title="编辑门店"
                      type="button"
                    >
                      <Pencil size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="rounded-2xl border border-[#dbe6dc] bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#1f8f4f]">
              <Building2 size={18} />
              加盟商
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-normal">
              合作主体
            </h2>
          </div>
          <button
            className="flex h-10 items-center gap-2 rounded-xl bg-[#1f8f4f] px-4 text-sm font-semibold text-white disabled:bg-[#b8d8bf]"
            disabled={!canManageAllStores}
            onClick={openCreateFranchisee}
            type="button"
          >
            <Plus size={16} />
            新建
          </button>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            ["全部", franchiseeSummary.total],
            ["合作", franchiseeSummary.active],
            ["暂停", franchiseeSummary.suspended],
            ["到期", franchiseeSummary.expired],
          ].map(([label, value]) => (
            <div className="rounded-xl bg-[#f8fbf7] p-3" key={label}>
              <div className="text-xs text-[#66756d]">{label}</div>
              <div className="mt-1 text-lg font-semibold">{value}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {franchisees.map((item) => (
            <div
              className="rounded-xl border border-[#edf2ed] p-4"
              key={item.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{item.name}</div>
                  <div className="mt-1 truncate text-xs text-[#66756d]">
                    {item.contactName} · {item.contactPhone}
                  </div>
                </div>
                <button
                  className="grid h-8 w-8 place-items-center rounded-lg border border-[#dbe6dc] text-[#1f8f4f] disabled:opacity-50"
                  disabled={!canManageAllStores}
                  onClick={() => openEditFranchisee(item)}
                  title="编辑加盟商"
                  type="button"
                >
                  <Pencil size={15} />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-[#66756d]">
                <span>{item.storeCount} 家门店</span>
                <span>{FRANCHISEE_STATUS_LABELS[item.status]}</span>
              </div>
              <div className="mt-2 text-xs text-[#66756d]">
                合同到期：{formatDate(item.contractEndsAt)}
              </div>
            </div>
          ))}

          {!canManageAllStores ? (
            <div className="rounded-xl border border-dashed border-[#dbe6dc] p-4 text-sm leading-6 text-[#66756d]">
              当前账号为门店授权账号，只能查看自己负责的加盟门店。
            </div>
          ) : null}
        </div>
      </aside>

      {modal ? (
        <div className="fixed inset-0 z-50 bg-[#0f2418]/32">
          <div
            className={
              fullscreen
                ? "absolute inset-5 flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                : "absolute left-1/2 top-20 flex h-[74vh] w-[min(820px,calc(100vw-48px))] -translate-x-1/2 resize flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            }
            style={
              fullscreen
                ? undefined
                : { transform: `translate(calc(-50% + ${offset.x}px), ${offset.y}px)` }
            }
          >
            <div
              className="flex cursor-move items-start justify-between gap-4 border-b border-[#dbe6dc] px-6 py-4"
              onPointerDown={handleHeaderPointerDown}
              onPointerMove={handleHeaderPointerMove}
              onPointerUp={handleHeaderPointerUp}
            >
              <div>
                <h3 className="text-lg font-semibold tracking-normal">
                  {modal.mode === "create-store"
                    ? "新建门店"
                    : modal.mode === "edit-store"
                      ? "编辑门店"
                      : modal.mode === "create-franchisee"
                        ? "新建加盟商"
                        : "编辑加盟商"}
                </h3>
                <p className="mt-1 text-sm text-[#66756d]">
                  标题栏可拖动，右下角可伸缩，右上角支持全屏。
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="grid h-9 w-9 place-items-center rounded-lg border border-[#dbe6dc] text-[#1f8f4f]"
                  onClick={() => setFullscreen((value) => !value)}
                  title={fullscreen ? "退出全屏" : "全屏"}
                  type="button"
                >
                  {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button
                  className="grid h-9 w-9 place-items-center rounded-lg border border-[#ffd6d6] bg-[#fff7f7] text-[#d43c2f]"
                  onClick={closeModal}
                  title="关闭"
                  type="button"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {modal.mode === "create-store" || modal.mode === "edit-store" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1 text-sm font-medium">
                    <span>门店名称</span>
                    <input
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) => updateStoreForm("name", event.target.value)}
                      value={storeForm.name}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    <span>门店编码</span>
                    <input
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) => updateStoreForm("code", event.target.value)}
                      value={storeForm.code}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    <span>门店类型</span>
                    <select
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        updateStoreForm("type", event.target.value as StoreType)
                      }
                      value={storeForm.type}
                    >
                      <option value="FRANCHISE">加盟</option>
                      <option value="DIRECT">直营</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    <span>加盟商</span>
                    <select
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      disabled={storeForm.type === "DIRECT"}
                      onChange={(event) =>
                        updateStoreForm("franchiseeId", event.target.value)
                      }
                      value={storeForm.franchiseeId}
                    >
                      <option value="">请选择加盟商</option>
                      {franchiseeOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    <span>状态</span>
                    <select
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        updateStoreForm("status", event.target.value as StoreStatus)
                      }
                      value={storeForm.status}
                    >
                      <option value="ACTIVE">营业</option>
                      <option value="DISABLED">停用</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    <span>截单时间</span>
                    <input
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        updateStoreForm("cutoffTime", event.target.value)
                      }
                      placeholder="18:00"
                      value={storeForm.cutoffTime}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    <span>店长</span>
                    <input
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        updateStoreForm("contactName", event.target.value)
                      }
                      value={storeForm.contactName}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    <span>门店电话</span>
                    <input
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        updateStoreForm("contactPhone", event.target.value)
                      }
                      value={storeForm.contactPhone}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    <span>客服电话</span>
                    <input
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        updateStoreForm("customerServiceTel", event.target.value)
                      }
                      value={storeForm.customerServiceTel}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    <span>加盟到期</span>
                    <input
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        updateStoreForm("franchiseEndsAt", event.target.value)
                      }
                      type="date"
                      value={storeForm.franchiseEndsAt}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    <span>省份</span>
                    <input
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        updateStoreForm("province", event.target.value)
                      }
                      value={storeForm.province}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    <span>城市</span>
                    <input
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) => updateStoreForm("city", event.target.value)}
                      value={storeForm.city}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    <span>区县</span>
                    <input
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        updateStoreForm("district", event.target.value)
                      }
                      value={storeForm.district}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium md:col-span-2">
                    <span>详细地址</span>
                    <input
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        updateStoreForm("address", event.target.value)
                      }
                      value={storeForm.address}
                    />
                  </label>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1 text-sm font-medium md:col-span-2">
                    <span>加盟商名称</span>
                    <input
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        updateFranchiseeForm("name", event.target.value)
                      }
                      value={franchiseeForm.name}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    <span>联系人</span>
                    <input
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        updateFranchiseeForm("contactName", event.target.value)
                      }
                      value={franchiseeForm.contactName}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    <span>联系电话</span>
                    <input
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        updateFranchiseeForm("contactPhone", event.target.value)
                      }
                      value={franchiseeForm.contactPhone}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    <span>状态</span>
                    <select
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        updateFranchiseeForm(
                          "status",
                          event.target.value as FranchiseeStatus,
                        )
                      }
                      value={franchiseeForm.status}
                    >
                      <option value="ACTIVE">合作中</option>
                      <option value="SUSPENDED">暂停</option>
                      <option value="EXPIRED">已到期</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    <span>合同到期</span>
                    <input
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        updateFranchiseeForm("contractEndsAt", event.target.value)
                      }
                      type="date"
                      value={franchiseeForm.contractEndsAt}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium md:col-span-2">
                    <span>备注</span>
                    <textarea
                      className="min-h-24 w-full rounded-xl border border-[#dbe6dc] px-3 py-2 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        updateFranchiseeForm("remark", event.target.value)
                      }
                      value={franchiseeForm.remark}
                    />
                  </label>
                </div>
              )}

              {error ? (
                <div className="mt-4 rounded-xl border border-[#ffd7bd] bg-[#fff8f2] px-4 py-3 text-sm text-[#b45309]">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-3 border-t border-[#dbe6dc] px-6 py-4">
              <button
                className="h-11 rounded-xl border border-[#dbe6dc] px-5 text-sm font-semibold"
                disabled={saving}
                onClick={closeModal}
                type="button"
              >
                取消
              </button>
              <button
                className="h-11 rounded-xl bg-[#1f8f4f] px-6 text-sm font-semibold text-white disabled:bg-[#b8d8bf]"
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
