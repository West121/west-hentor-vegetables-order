"use client";

import {
  Building2,
  Eye,
  Maximize2,
  Minimize2,
  Pencil,
  Plus,
  Store,
  X,
} from "lucide-react";
import { useMemo, useRef, useState, type PointerEvent } from "react";
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
  buildDetailPath,
  loadDetailResource,
  replaceItemById,
} from "./detail-loaders";
import { AdminAlertDialog } from "./admin-confirm-dialog";
import {
  AdminDatePicker,
  AdminTimePicker,
} from "./admin-date-time-picker";
import { AdminSelect } from "./admin-select";
import { canCloseAdminModal } from "./admin-modal-close-guard";
import {
  buildFranchiseeFormState,
  buildStoreFormState,
  hasUnsavedFranchiseeModalChanges,
  hasUnsavedStoreModalChanges,
  type FranchiseeFormState,
  type FranchiseeStatus,
  type StoreFormState,
  type StoreStatus,
  type StoreType,
} from "./store-modal-state";
import { formatDateOnly } from "./date-format";
import { RequiredLabel, RequiredMark } from "./required-mark";

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
  stores?: Array<{
    id: string;
    name: string;
    status: StoreStatus;
  }>;
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
  initialFranchiseePagination: AdminPaginationMeta;
  initialFranchiseeSummary: FranchiseeSummary;
  initialStorePagination: AdminPaginationMeta;
  initialStoreSummary: StoreSummary;
  initialStores: StorePanelItem[];
  mode: "franchisees" | "stores";
};

type ModalState =
  | { item: null; mode: "create-franchisee" }
  | { item: FranchiseePanelItem; mode: "detail-franchisee" }
  | { item: FranchiseePanelItem; mode: "edit-franchisee" }
  | { item: null; mode: "create-store" }
  | { item: StorePanelItem; mode: "detail-store" }
  | { item: StorePanelItem; mode: "edit-store" };

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

export function StoreManagementPanel({
  canManageAllStores,
  initialFranchisees,
  initialFranchiseePagination,
  initialFranchiseeSummary,
  initialStorePagination,
  initialStoreSummary,
  initialStores,
  mode,
}: StoreManagementPanelProps) {
  const [stores, setStores] = useState(initialStores);
  const [storePagination, setStorePagination] = useState(initialStorePagination);
  const [storeSummary, setStoreSummary] = useState(initialStoreSummary);
  const [franchisees, setFranchisees] = useState(initialFranchisees);
  const [franchiseePagination, setFranchiseePagination] = useState(
    initialFranchiseePagination,
  );
  const [franchiseeSummary, setFranchiseeSummary] = useState(
    initialFranchiseeSummary,
  );
  const [modal, setModal] = useState<ModalState | null>(null);
  const [storeForm, setStoreForm] = useState<StoreFormState>(
    buildStoreFormState(),
  );
  const [initialStoreForm, setInitialStoreForm] = useState<StoreFormState>(
    buildStoreFormState(),
  );
  const [franchiseeForm, setFranchiseeForm] = useState<FranchiseeFormState>(
    buildFranchiseeFormState(),
  );
  const [initialFranchiseeForm, setInitialFranchiseeForm] =
    useState<FranchiseeFormState>(buildFranchiseeFormState());
  const [fullscreen, setFullscreen] = useState(true);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingFranchisees, setLoadingFranchisees] = useState(false);
  const [loadingStores, setLoadingStores] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storeQuery, setStoreQuery] = useState("");
  const [storeStatusFilter, setStoreStatusFilter] = useState<
    StoreStatus | "ALL"
  >("ALL");
  const [storeTypeFilter, setStoreTypeFilter] = useState<StoreType | "ALL">(
    "ALL",
  );
  const [franchiseeQuery, setFranchiseeQuery] = useState("");
  const [franchiseeStatusFilter, setFranchiseeStatusFilter] = useState<
    FranchiseeStatus | "ALL"
  >("ALL");
  const dragRef = useRef<AdminModalDragState | null>(null);

  const franchiseeOptions = useMemo(
    () => franchisees.filter((item) => item.status !== "EXPIRED"),
    [franchisees],
  );

  function resetModal() {
    setFullscreen(true);
    setOffset({ x: 0, y: 0 });
    setError(null);
  }

  function openCreateStore() {
    const nextForm = buildStoreFormState();
    setModal({ item: null, mode: "create-store" });
    setStoreForm(nextForm);
    setInitialStoreForm(nextForm);
    resetModal();
  }

  function openEditStore(item: StorePanelItem) {
    const nextForm = buildStoreFormState(item);
    setModal({ item, mode: "edit-store" });
    setStoreForm(nextForm);
    setInitialStoreForm(nextForm);
    resetModal();
    void hydrateStoreDetail(item);
  }

  function openDetailStore(item: StorePanelItem) {
    const nextForm = buildStoreFormState(item);
    setModal({ item, mode: "detail-store" });
    setStoreForm(nextForm);
    setInitialStoreForm(nextForm);
    resetModal();
    void hydrateStoreDetail(item);
  }

  function openCreateFranchisee() {
    const nextForm = buildFranchiseeFormState();
    setModal({ item: null, mode: "create-franchisee" });
    setFranchiseeForm(nextForm);
    setInitialFranchiseeForm(nextForm);
    resetModal();
  }

  function openEditFranchisee(item: FranchiseePanelItem) {
    const nextForm = buildFranchiseeFormState(item);
    setModal({ item, mode: "edit-franchisee" });
    setFranchiseeForm(nextForm);
    setInitialFranchiseeForm(nextForm);
    resetModal();
    void hydrateFranchiseeDetail(item);
  }

  function openDetailFranchisee(item: FranchiseePanelItem) {
    const nextForm = buildFranchiseeFormState(item);
    setModal({ item, mode: "detail-franchisee" });
    setFranchiseeForm(nextForm);
    setInitialFranchiseeForm(nextForm);
    resetModal();
    void hydrateFranchiseeDetail(item);
  }

  async function hydrateStoreDetail(item: StorePanelItem) {
    setLoadingDetail(true);

    try {
      const detail = await loadDetailResource<StorePanelItem>(
        buildDetailPath("stores", item.id),
        "store",
      );

      setStores((value) => replaceItemById(value, detail));
      setModal((current) => {
        if (
          (current?.mode === "detail-store" ||
            current?.mode === "edit-store") &&
          current.item.id === item.id
        ) {
          return { ...current, item: detail };
        }

        return current;
      });
      const nextForm = buildStoreFormState(detail);
      setStoreForm(nextForm);
      setInitialStoreForm(nextForm);
    } catch (detailError) {
      setError(
        detailError instanceof Error ? detailError.message : "门店详情加载失败",
      );
    } finally {
      setLoadingDetail(false);
    }
  }

  async function hydrateFranchiseeDetail(item: FranchiseePanelItem) {
    setLoadingDetail(true);

    try {
      const detail = await loadDetailResource<FranchiseePanelItem>(
        buildDetailPath("franchisees", item.id),
        "franchisee",
      );

      setFranchisees((value) => replaceItemById(value, detail));
      setModal((current) => {
        if (
          (current?.mode === "detail-franchisee" ||
            current?.mode === "edit-franchisee") &&
          current.item.id === item.id
        ) {
          return { ...current, item: detail };
        }

        return current;
      });
      const nextForm = buildFranchiseeFormState(detail);
      setFranchiseeForm(nextForm);
      setInitialFranchiseeForm(nextForm);
    } catch (detailError) {
      setError(
        detailError instanceof Error ? detailError.message : "加盟商详情加载失败",
      );
    } finally {
      setLoadingDetail(false);
    }
  }

  function closeModal() {
    if (saving) {
      return;
    }

    const hasUnsavedChanges =
      modal !== null &&
      modal.mode !== "detail-store" &&
      modal.mode !== "detail-franchisee" &&
      (modal.mode === "create-store" || modal.mode === "edit-store"
        ? hasUnsavedStoreModalChanges({
            current: storeForm,
            initial: initialStoreForm,
          })
        : Boolean(
            modal &&
              hasUnsavedFranchiseeModalChanges({
                current: franchiseeForm,
                initial: initialFranchiseeForm,
              }),
          ));

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

  function updateStoreForm<K extends keyof StoreFormState>(
    key: K,
    value: StoreFormState[K],
  ) {
    setStoreForm((current) => ({ ...current, [key]: value }));
  }

  function updateFranchiseeForm<K extends keyof FranchiseeFormState>(
    key: K,
    value: FranchiseeFormState[K],
  ) {
    setFranchiseeForm((current) => ({ ...current, [key]: value }));
  }

  async function reloadStores(
    page = storePagination.page,
    filters = { storeQuery, storeStatusFilter, storeTypeFilter },
    pageSize = storePagination.pageSize,
  ) {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    const nextQuery = filters.storeQuery.trim();
    if (nextQuery) {
      params.set("query", nextQuery);
    }
    if (filters.storeStatusFilter !== "ALL") {
      params.set("status", filters.storeStatusFilter);
    }
    if (filters.storeTypeFilter !== "ALL") {
      params.set("type", filters.storeTypeFilter);
    }

    setLoadingStores(true);
    setError(null);

    const response = await fetch(`/api/admin/stores?${params.toString()}`);
    const result = (await response.json()) as {
      data?: {
        pagination: AdminPaginationMeta;
        stores: StorePanelItem[];
        summary: StoreSummary;
      };
      success: boolean;
    };

    if (response.ok && result.success && result.data) {
      const nextList = normalizeAdminListPayload(
        {
          ...result.data,
          items: result.data.stores,
        },
        storeSummary,
        pageSize,
      );
      setStores(nextList.items);
      setStorePagination(nextList.pagination);
      setStoreSummary(nextList.summary);
    }
    setLoadingStores(false);
  }

  async function reloadFranchisees(
    page = franchiseePagination.page,
    filters = { franchiseeQuery, franchiseeStatusFilter },
    pageSize = franchiseePagination.pageSize,
  ) {
    if (!canManageAllStores) {
      return;
    }

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    const nextQuery = filters.franchiseeQuery.trim();
    if (nextQuery) {
      params.set("query", nextQuery);
    }
    if (filters.franchiseeStatusFilter !== "ALL") {
      params.set("status", filters.franchiseeStatusFilter);
    }

    setLoadingFranchisees(true);
    setError(null);

    const response = await fetch(`/api/admin/franchisees?${params.toString()}`);
    const result = (await response.json()) as {
      data?: {
        items: FranchiseePanelItem[];
        pagination: AdminPaginationMeta;
        summary: FranchiseeSummary;
      };
      success: boolean;
    };

    if (response.ok && result.success && result.data) {
      const nextList = normalizeAdminListPayload(
        result.data,
        franchiseeSummary,
        pageSize,
      );
      setFranchisees(nextList.items);
      setFranchiseePagination(nextList.pagination);
      setFranchiseeSummary(nextList.summary);
    }
    setLoadingFranchisees(false);
  }

  function resetStoreFilters() {
    setStoreQuery("");
    setStoreStatusFilter("ALL");
    setStoreTypeFilter("ALL");
    void reloadStores(1, {
      storeQuery: "",
      storeStatusFilter: "ALL",
      storeTypeFilter: "ALL",
    });
  }

  function resetFranchiseeFilters() {
    setFranchiseeQuery("");
    setFranchiseeStatusFilter("ALL");
    void reloadFranchisees(1, {
      franchiseeQuery: "",
      franchiseeStatusFilter: "ALL",
    });
  }

  async function submitModal() {
    if (
      !modal ||
      modal.mode === "detail-store" ||
      modal.mode === "detail-franchisee" ||
      !canManageAllStores
    ) {
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

      await Promise.all([
        reloadStores(modal.mode === "create-store" ? 1 : storePagination.page),
        reloadFranchisees(
          modal.mode === "create-franchisee" ? 1 : franchiseePagination.page,
        ),
      ]);
      setModal(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  const isDetailModal =
    modal?.mode === "detail-store" || modal?.mode === "detail-franchisee";

  return (
    <section className="grid gap-5">
      {mode === "stores" ? (
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

        <div className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] p-3">
          <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-xs font-semibold text-[#66756d]">
            关键字
            <input
              className="h-10 rounded-xl border border-[#dbe6dc] bg-white px-3 text-sm font-normal text-[#15261d] outline-none focus:border-[#1f8f4f]"
              onChange={(event) => setStoreQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void reloadStores(1);
                }
              }}
              placeholder="门店名称 / 编码 / 店长 / 加盟商"
              value={storeQuery}
            />
          </label>
          <label className="flex w-36 flex-col gap-1 text-xs font-semibold text-[#66756d]">
            状态
            <AdminSelect
              contentLabel="状态"
              onChange={(value) =>
                setStoreStatusFilter(value as StoreStatus | "ALL")
              }
              options={[
                { label: "全部状态", value: "ALL" },
                ...Object.entries(STORE_STATUS_LABELS).map(([value, label]) => ({
                  label,
                  value,
                })),
              ]}
              value={storeStatusFilter}
            />
          </label>
          <label className="flex w-36 flex-col gap-1 text-xs font-semibold text-[#66756d]">
            类型
            <AdminSelect
              contentLabel="类型"
              onChange={(value) => setStoreTypeFilter(value as StoreType | "ALL")}
              options={[
                { label: "全部类型", value: "ALL" },
                ...Object.entries(STORE_TYPE_LABELS).map(([value, label]) => ({
                  label,
                  value,
                })),
              ]}
              value={storeTypeFilter}
            />
          </label>
          <button
            className="h-10 rounded-xl bg-[#1f8f4f] px-5 text-sm font-semibold text-white disabled:opacity-60"
            disabled={loadingStores}
            onClick={() => void reloadStores(1)}
            type="button"
          >
            查询
          </button>
          <button
            className="h-10 rounded-xl border border-[#dbe6dc] bg-white px-5 text-sm font-semibold text-[#66756d] hover:bg-[#f3f7f1]"
            disabled={loadingStores}
            onClick={resetStoreFilters}
            type="button"
          >
            重置
          </button>
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
                    <div className="flex flex-wrap justify-end gap-2 whitespace-nowrap">
                      <Button
                        className="border-[#dbe6dc] text-[#1f8f4f]"
                        onClick={() => openDetailStore(item)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <Eye data-icon="inline-start" />
                        查看
                      </Button>
                      <Button
                        className="border-[#dbe6dc] text-[#1f8f4f] disabled:opacity-50"
                        disabled={!canManageAllStores}
                        onClick={() => openEditStore(item)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <Pencil data-icon="inline-start" />
                        编辑
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <AdminPagination
            disabled={loadingStores}
            onPageChange={(nextPage) => void reloadStores(nextPage)}
            onPageSizeChange={(nextPageSize) =>
              void reloadStores(
                1,
                { storeQuery, storeStatusFilter, storeTypeFilter },
                nextPageSize,
              )
            }
            pagination={storePagination}
          />
        </div>
      </div>
      ) : null}

      {mode === "franchisees" ? (
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
            新建加盟商
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

        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] p-3">
          <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-xs font-semibold text-[#66756d]">
            关键字
            <input
              className="h-10 rounded-xl border border-[#dbe6dc] bg-white px-3 text-sm font-normal text-[#15261d] outline-none focus:border-[#1f8f4f]"
              onChange={(event) => setFranchiseeQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void reloadFranchisees(1);
                }
              }}
              placeholder="加盟商名称 / 联系人 / 电话"
              value={franchiseeQuery}
            />
          </label>
          <label className="flex w-36 flex-col gap-1 text-xs font-semibold text-[#66756d]">
            状态
            <AdminSelect
              contentLabel="状态"
              onChange={(value) =>
                setFranchiseeStatusFilter(value as FranchiseeStatus | "ALL")
              }
              options={[
                { label: "全部状态", value: "ALL" },
                ...Object.entries(FRANCHISEE_STATUS_LABELS).map(
                  ([value, label]) => ({
                    label,
                    value,
                  }),
                ),
              ]}
              value={franchiseeStatusFilter}
            />
          </label>
          <button
            className="h-10 rounded-xl bg-[#1f8f4f] px-5 text-sm font-semibold text-white disabled:opacity-60"
            disabled={loadingFranchisees || !canManageAllStores}
            onClick={() => void reloadFranchisees(1)}
            type="button"
          >
            查询
          </button>
          <button
            className="h-10 rounded-xl border border-[#dbe6dc] bg-white px-5 text-sm font-semibold text-[#66756d] hover:bg-[#f3f7f1]"
            disabled={loadingFranchisees || !canManageAllStores}
            onClick={resetFranchiseeFilters}
            type="button"
          >
            重置
          </button>
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
                <div className="flex shrink-0 flex-wrap gap-2 whitespace-nowrap">
                  <Button
                    className="border-[#dbe6dc] text-[#1f8f4f] disabled:opacity-50"
                    disabled={!canManageAllStores}
                    onClick={() => openDetailFranchisee(item)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Eye data-icon="inline-start" />
                    查看
                  </Button>
                  <Button
                    className="border-[#dbe6dc] text-[#1f8f4f] disabled:opacity-50"
                    disabled={!canManageAllStores}
                    onClick={() => openEditFranchisee(item)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Pencil data-icon="inline-start" />
                    编辑
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-[#66756d]">
                <span>{item.storeCount} 家门店</span>
                <span>{FRANCHISEE_STATUS_LABELS[item.status]}</span>
              </div>
              <div className="mt-2 text-xs text-[#66756d]">
                合同到期：{formatDateOnly(item.contractEndsAt)}
              </div>
            </div>
          ))}

          {!canManageAllStores ? (
            <div className="rounded-xl border border-dashed border-[#dbe6dc] p-4 text-sm leading-6 text-[#66756d]">
              当前账号为门店授权账号，只能查看自己负责的加盟门店。
            </div>
          ) : null}
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-[#dbe6dc]">
          <AdminPagination
            disabled={loadingFranchisees || !canManageAllStores}
            onPageChange={(nextPage) => void reloadFranchisees(nextPage)}
            onPageSizeChange={(nextPageSize) =>
              void reloadFranchisees(
                1,
                { franchiseeQuery, franchiseeStatusFilter },
                nextPageSize,
              )
            }
            pagination={franchiseePagination}
          />
        </div>
      </aside>
      ) : null}

      {modal ? (
        <div className="fixed inset-0 z-50 bg-[#0f2418]/32">
          <div
            aria-modal="true"
            data-admin-modal-shell
            data-fullscreen={fullscreen ? "true" : "false"}
            className={
              fullscreen
                ? "absolute inset-5 flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                : "absolute left-1/2 top-20 flex h-[74vh] w-[min(820px,calc(100vw-48px))] -translate-x-1/2 resize flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            }
            role="dialog"
            style={
              fullscreen
                ? undefined
                : { transform: `translate(calc(-50% + ${offset.x}px), ${offset.y}px)` }
            }
          >
            <div
              data-admin-modal-drag-handle
              className="flex cursor-move items-start justify-between gap-4 border-b border-[#dbe6dc] px-6 py-4"
              onPointerDown={handleHeaderPointerDown}
              onPointerMove={handleHeaderPointerMove}
              onPointerCancel={handleHeaderPointerUp}
              onPointerUp={handleHeaderPointerUp}
            >
              <div>
                <h3 className="text-lg font-semibold tracking-normal">
                  {modal.mode === "create-store"
                    ? "新建门店"
                    : modal.mode === "detail-store"
                      ? `门店详情 · ${modal.item.name}`
                    : modal.mode === "edit-store"
                      ? "编辑门店"
                      : modal.mode === "create-franchisee"
                        ? "新建加盟商"
                        : modal.mode === "detail-franchisee"
                          ? `加盟商详情 · ${modal.item.name}`
                          : "编辑加盟商"}
                </h3>
                {loadingDetail ? (
                  <p className="mt-1 text-sm text-[#66756d]">
                    正在加载最新管理详情
                  </p>
                ) : null}
              </div>
              <div
                className="flex items-center gap-2"
                onPointerDown={(event) => event.stopPropagation()}
              >
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
              {modal.mode === "create-store" ||
              modal.mode === "detail-store" ||
              modal.mode === "edit-store" ? (
                <>
                {modal.mode !== "create-store" ? (
                  <div className="mb-4 grid gap-3 rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] p-4 text-sm md:grid-cols-3">
                    <div>
                      <div className="text-[#66756d]">会员</div>
                      <div className="mt-1 font-semibold">{modal.item.memberCount}</div>
                    </div>
                    <div>
                      <div className="text-[#66756d]">订单</div>
                      <div className="mt-1 font-semibold">{modal.item.orderCount}</div>
                    </div>
                    <div>
                      <div className="text-[#66756d]">后台账号</div>
                      <div className="mt-1 font-semibold">
                        {modal.item.adminUserCount}
                      </div>
                    </div>
                  </div>
                ) : null}
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1 text-sm font-medium">
                    <RequiredLabel>门店名称</RequiredLabel>
                    <input
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) => updateStoreForm("name", event.target.value)}
                      readOnly={isDetailModal}
                      value={storeForm.name}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    <RequiredLabel>门店编码</RequiredLabel>
                    <input
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) => updateStoreForm("code", event.target.value)}
                      readOnly={isDetailModal}
                      value={storeForm.code}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    <RequiredLabel>门店类型</RequiredLabel>
                    <AdminSelect
                      contentLabel="门店类型"
                      disabled={isDetailModal}
                      onChange={(value) => updateStoreForm("type", value as StoreType)}
                      options={[
                        { label: "加盟", value: "FRANCHISE" },
                        { label: "直营", value: "DIRECT" },
                      ]}
                      triggerClassName="h-11 w-full border-[#dbe6dc] bg-white"
                      value={storeForm.type}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    <span>
                      加盟商
                      {storeForm.type === "FRANCHISE" ? <RequiredMark /> : null}
                    </span>
                    <AdminSelect
                      contentLabel="加盟商"
                      disabled={isDetailModal || storeForm.type === "DIRECT"}
                      onChange={(value) => updateStoreForm("franchiseeId", value)}
                      options={[
                        { label: "请选择加盟商", value: "" },
                        ...franchiseeOptions.map((item) => ({
                          label: item.name,
                          value: item.id,
                        })),
                      ]}
                      triggerClassName="h-11 w-full border-[#dbe6dc] bg-white"
                      value={storeForm.franchiseeId}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    <RequiredLabel>状态</RequiredLabel>
                    <AdminSelect
                      contentLabel="状态"
                      disabled={isDetailModal}
                      onChange={(value) =>
                        updateStoreForm("status", value as StoreStatus)
                      }
                      options={[
                        { label: "营业", value: "ACTIVE" },
                        { label: "停用", value: "DISABLED" },
                      ]}
                      triggerClassName="h-11 w-full border-[#dbe6dc] bg-white"
                      value={storeForm.status}
                    />
                  </label>
                  <AdminTimePicker
                    buttonClassName="h-11 w-full"
                    label="截单时间"
                    onChange={(value) => updateStoreForm("cutoffTime", value)}
                    readOnly={isDetailModal}
                    required
                    value={storeForm.cutoffTime}
                  />
                  <label className="space-y-1 text-sm font-medium">
                    <RequiredLabel>店长</RequiredLabel>
                    <input
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        updateStoreForm("contactName", event.target.value)
                      }
                      readOnly={isDetailModal}
                      value={storeForm.contactName}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    <RequiredLabel>门店电话</RequiredLabel>
                    <input
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        updateStoreForm("contactPhone", event.target.value)
                      }
                      readOnly={isDetailModal}
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
                      readOnly={isDetailModal}
                      value={storeForm.customerServiceTel}
                    />
                  </label>
                  <AdminDatePicker
                    buttonClassName="h-11 w-full"
                    label="加盟到期"
                    onChange={(value) => updateStoreForm("franchiseEndsAt", value)}
                    readOnly={isDetailModal}
                    value={storeForm.franchiseEndsAt}
                  />
                  <label className="space-y-1 text-sm font-medium">
                    <span>省份</span>
                    <input
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        updateStoreForm("province", event.target.value)
                      }
                      readOnly={isDetailModal}
                      value={storeForm.province}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    <span>城市</span>
                    <input
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) => updateStoreForm("city", event.target.value)}
                      readOnly={isDetailModal}
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
                      readOnly={isDetailModal}
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
                      readOnly={isDetailModal}
                      value={storeForm.address}
                    />
                  </label>
                </div>
                </>
              ) : (
                <>
                {modal.mode !== "create-franchisee" ? (
                  <div className="mb-4 rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] p-4 text-sm">
                    <div className="font-semibold">
                      旗下门店 {modal.item.storeCount} 家
                    </div>
                    {modal.item.stores?.length ? (
                      <div className="mt-2 text-[#66756d]">
                        {modal.item.stores.map((store) => store.name).join("、")}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1 text-sm font-medium md:col-span-2">
                    <RequiredLabel>加盟商名称</RequiredLabel>
                    <input
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        updateFranchiseeForm("name", event.target.value)
                      }
                      readOnly={isDetailModal}
                      value={franchiseeForm.name}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    <RequiredLabel>联系人</RequiredLabel>
                    <input
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        updateFranchiseeForm("contactName", event.target.value)
                      }
                      readOnly={isDetailModal}
                      value={franchiseeForm.contactName}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    <RequiredLabel>联系电话</RequiredLabel>
                    <input
                      className="h-11 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        updateFranchiseeForm("contactPhone", event.target.value)
                      }
                      readOnly={isDetailModal}
                      value={franchiseeForm.contactPhone}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    <RequiredLabel>状态</RequiredLabel>
                    <AdminSelect
                      contentLabel="状态"
                      disabled={isDetailModal}
                      onChange={(value) =>
                        updateFranchiseeForm("status", value as FranchiseeStatus)
                      }
                      options={[
                        { label: "合作中", value: "ACTIVE" },
                        { label: "暂停", value: "SUSPENDED" },
                        { label: "已到期", value: "EXPIRED" },
                      ]}
                      triggerClassName="h-11 w-full border-[#dbe6dc] bg-white"
                      value={franchiseeForm.status}
                    />
                  </label>
                  <AdminDatePicker
                    buttonClassName="h-11 w-full"
                    label="合同到期"
                    onChange={(value) =>
                      updateFranchiseeForm("contractEndsAt", value)
                    }
                    readOnly={isDetailModal}
                    value={franchiseeForm.contractEndsAt}
                  />
                  <label className="space-y-1 text-sm font-medium md:col-span-2">
                    <span>备注</span>
                    <textarea
                      className="min-h-24 w-full rounded-xl border border-[#dbe6dc] px-3 py-2 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        updateFranchiseeForm("remark", event.target.value)
                      }
                      readOnly={isDetailModal}
                      value={franchiseeForm.remark}
                    />
                  </label>
                </div>
                </>
              )}

            </div>

            <div className="flex justify-end gap-3 border-t border-[#dbe6dc] px-6 py-4">
              <button
                className="h-11 rounded-xl border border-[#dbe6dc] px-5 text-sm font-semibold"
                disabled={saving || loadingDetail}
                onClick={closeModal}
                type="button"
              >
                {isDetailModal ? "关闭" : "取消"}
              </button>
              {!isDetailModal ? (
                <button
                  className="h-11 rounded-xl bg-[#1f8f4f] px-6 text-sm font-semibold text-white disabled:bg-[#b8d8bf]"
                  disabled={saving}
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
      {modal && error ? (
        <AdminAlertDialog message={error} onClose={() => setError(null)} />
      ) : null}
    </section>
  );
}
