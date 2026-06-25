"use client";

import {
  Ban,
  Download,
  Eye,
  Maximize2,
  Minimize2,
  Pencil,
  Plus,
  RotateCcw,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import { utils, write } from "xlsx";

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
import { AdminAlertDialog } from "./admin-confirm-dialog";
import { canCloseAdminModal } from "./admin-modal-close-guard";
import {
  buildMemberFormState,
  hasUnsavedMemberModalChanges,
  type MemberFormState,
} from "./member-modal-state";
import { getImportResultFromApiPayload } from "./member-import-response";
import { AdminMemberAvatar } from "./admin-member-avatar";
import { formatDateOnly } from "./date-format";
import { RequiredLabel } from "./required-mark";

type StoreOption = {
  id: string;
  name: string;
};

type BindingStatus = "ACTIVE" | "DISABLED";

export type MemberPanelItem = {
  activePackageCount: number;
  addresses?: Array<{
    city: string | null;
    detail: string;
    district: string | null;
    id: string;
    isDefault: boolean;
    province: string | null;
    receiverName: string;
    receiverPhone: string;
  }>;
  avatarUrl: string | null;
  bindingId: string;
  bindingStatus: BindingStatus;
  createdAt: string;
  defaultAddress: {
    city: string | null;
    detail: string;
    district: string | null;
    id: string;
    province: string | null;
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
  userId?: string;
  packages?: Array<{
    id: string;
    nameSnapshot: string;
    remainingTimes: number;
    status: string;
    totalTimes: number;
    usedTimes: number;
    weightLimitJin: number;
  }>;
  phone: string | null;
  recentOrders?: Array<{
    id: string;
    items: Array<{
      dishNameSnapshot: string;
      weightJin: number;
    }>;
    orderNo: string;
    status: string;
    totalWeightJin: number;
  }>;
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

type SpringMemberPanelItem = Partial<MemberPanelItem> & {
  status?: string;
  userStatus?: string;
};

type MemberManagementPanelProps = {
  initialItems: MemberPanelItem[];
  initialPagination: AdminPaginationMeta;
  initialSummary: {
    active: number;
    disabled: number;
    total: number;
  };
  store: StoreOption | null;
};

type MemberModalMode = "detail" | "edit";

type CreateMemberFormState = MemberFormState & {
  nickname: string;
  phone: string;
};

type MemberImportResult = {
  createdBindings: number;
  createdUsers: number;
  failedRows: number;
  failures: Array<{
    phone: string | null;
    reason: string;
    rowNumber: number;
  }>;
  importedRows: number;
  totalRows: number;
  updatedBindings: number;
  updatedUsers: number;
};

type UserPackageImportResult = {
  createdBindings: number;
  createdPackages: number;
  createdUsers: number;
  failedRows: number;
  failures: Array<{
    phone: string | null;
    reason: string;
    rowNumber: number;
    templateName: string | null;
  }>;
  importedRows: number;
  totalRows: number;
  updatedPackages: number;
};

type ImportMode = "members" | "packages";
type ImportResult = MemberImportResult | UserPackageImportResult;

const IMPORT_FILE_ACCEPT =
  ".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv";

const IMPORT_TEMPLATES: Record<
  ImportMode,
  { fileName: string; rows: string[][] }
> = {
  members: {
    fileName: "会员导入模板.xlsx",
    rows: [
      ["手机号", "姓名", "备注", "状态", "停用原因"],
      ["15295081992", "张三", "配送前电话确认", "正常", ""],
      ["13800001111", "李四", "暂停配送", "停用", "长期不在家"],
    ],
  },
  packages: {
    fileName: "会员套餐导入模板.xlsx",
    rows: [
      ["手机号", "套餐名称", "总次数", "已用次数", "单次斤数", "状态", "备注"],
      ["15295081992", "8斤周套餐", "8", "0", "8", "正常", "后台导入用户套餐"],
    ],
  },
};

function downloadImportTemplate(mode: ImportMode) {
  const template = IMPORT_TEMPLATES[mode];
  const workbook = utils.book_new();
  const worksheet = utils.aoa_to_sheet(template.rows);
  worksheet["!cols"] = template.rows[0]?.map((header) => ({
    wch: Math.max(header.length + 6, 14),
  }));
  utils.book_append_sheet(workbook, worksheet, "导入模板");
  const content = write(workbook, {
    bookType: "xlsx",
    type: "array",
  }) as ArrayBuffer;
  const blob = new Blob([content], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = template.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function isPackageImportResult(
  result: ImportResult,
): result is UserPackageImportResult {
  return "createdPackages" in result;
}

const STATUS_LABELS: Record<BindingStatus, string> = {
  ACTIVE: "可服务",
  DISABLED: "已停用",
};

function displayPhone(phone: string | null) {
  return phone ?? "未绑定手机号";
}

function formatJin(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatAddress(
  address: MemberPanelItem["defaultAddress"] | null | undefined,
) {
  if (!address) {
    return "未设置";
  }

  return (
    [address.province, address.city, address.district, address.detail]
      .filter(Boolean)
      .join(" ") || "未设置"
  );
}

function formatRecentOrder(order: NonNullable<MemberPanelItem["recentOrders"]>[number]) {
  const itemSummary = order.items.length
    ? order.items
        .map((item) => `${item.dishNameSnapshot}${formatJin(item.weightJin)}斤`)
        .join("、")
    : `合计${formatJin(order.totalWeightJin)}斤`;

  return `${order.orderNo} · ${itemSummary}`;
}

function buildCreateMemberFormState(): CreateMemberFormState {
  return {
    defaultAddress: {
      city: "",
      detail: "",
      district: "",
      id: null,
      province: "",
      receiverName: "",
      receiverPhone: "",
    },
    disabledReason: "",
    nickname: "",
    phone: "",
    remark: "",
    status: "ACTIVE",
  };
}

export function getMemberUserId(member: SpringMemberPanelItem) {
  return member.id ?? member.userId ?? "";
}

export function normalizeMemberPanelItem(
  member: SpringMemberPanelItem,
): MemberPanelItem {
  const bindingStatus = (member.bindingStatus ??
    member.status ??
    "ACTIVE") as BindingStatus;
  const userStatus = member.userStatus ?? member.status ?? "ACTIVE";

  return {
    activePackageCount: Number(member.activePackageCount ?? 0),
    addresses: member.addresses ?? [],
    avatarUrl: member.avatarUrl ?? null,
    bindingId: member.bindingId ?? "",
    bindingStatus,
    createdAt: member.createdAt ?? "",
    defaultAddress: member.defaultAddress ?? null,
    defaultStoreId: member.defaultStoreId ?? null,
    disabledReason: member.disabledReason ?? null,
    id: getMemberUserId(member),
    isDefaultBinding: Boolean(member.isDefaultBinding),
    latestActivePackage: member.latestActivePackage ?? null,
    nickname: member.nickname ?? null,
    orderCount: Number(member.orderCount ?? 0),
    packages: member.packages ?? [],
    phone: member.phone ?? null,
    recentOrders: member.recentOrders ?? [],
    remark: member.remark ?? null,
    source: member.source ?? null,
    status: userStatus,
    store: member.store ?? {
      code: "",
      id: "",
      name: "",
    },
    updatedAt: member.updatedAt ?? member.createdAt ?? "",
    userId: member.userId ?? member.id ?? "",
  };
}

export function normalizeMemberPanelItems(items: SpringMemberPanelItem[]) {
  return items.map(normalizeMemberPanelItem);
}

export function MemberManagementPanel({
  initialItems,
  initialPagination,
  initialSummary,
  store,
}: MemberManagementPanelProps) {
  const [items, setItems] = useState(() => normalizeMemberPanelItems(initialItems));
  const [pagination, setPagination] = useState(initialPagination);
  const [summary, setSummary] = useState(initialSummary);
  const [modalMember, setModalMember] = useState<MemberPanelItem | null>(null);
  const [modalMode, setModalMode] = useState<MemberModalMode>("edit");
  const [form, setForm] = useState<MemberFormState | null>(null);
  const [initialForm, setInitialForm] = useState<MemberFormState | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<BindingStatus | "ALL">("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateMemberFormState>(
    buildCreateMemberFormState,
  );
  const [createError, setCreateError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>("members");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
  } | null>(null);

  async function reloadMembers(
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
      const response = await fetch(`/api/admin/members?${params.toString()}`);
      const result = (await response.json()) as {
        data?: {
          items: MemberPanelItem[];
          pagination: AdminPaginationMeta;
          summary: typeof initialSummary;
        };
        error?: { message: string };
        success: boolean;
      };

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error?.message ?? "加载会员失败");
      }

      const nextList = normalizeAdminListPayload(
        result.data,
        initialSummary,
        pagination.pageSize,
      );
      setItems(normalizeMemberPanelItems(nextList.items));
      setPagination(nextList.pagination);
      setSummary(nextList.summary);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载会员失败");
    } finally {
      setLoadingList(false);
    }
  }

  function resetFilters() {
    setQuery("");
    setStatusFilter("ALL");
    void reloadMembers(1, { query: "", statusFilter: "ALL" });
  }

  function openCreateModal() {
    setCreateForm(buildCreateMemberFormState());
    setCreateError(null);
    setCreateOpen(true);
  }

  function closeCreateModal() {
    if (saving) {
      return;
    }

    setCreateOpen(false);
    setCreateError(null);
  }

  async function submitCreateModal() {
    if (!store) {
      return;
    }

    if (!createForm.phone.trim()) {
      setCreateError("请输入会员手机号");
      return;
    }
    if (createForm.status === "DISABLED" && !createForm.disabledReason.trim()) {
      setCreateError("停用会员时必须填写停用原因");
      return;
    }

    setSaving(true);
    setCreateError(null);

    try {
      const shouldSubmitAddress =
        [
          createForm.defaultAddress.province,
          createForm.defaultAddress.city,
          createForm.defaultAddress.district,
          createForm.defaultAddress.detail,
          createForm.defaultAddress.receiverName,
          createForm.defaultAddress.receiverPhone,
        ].some((value) => Boolean(value.trim()));
      const response = await fetch("/api/admin/members", {
        body: JSON.stringify({
          defaultAddress: shouldSubmitAddress
            ? createForm.defaultAddress
            : null,
          disabledReason: createForm.disabledReason,
          nickname: createForm.nickname,
          phone: createForm.phone,
          remark: createForm.remark,
          status: createForm.status,
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
        throw new Error(result.error?.message ?? "新增会员失败");
      }

      await reloadMembers(1);
      setCreateOpen(false);
      setCreateForm(buildCreateMemberFormState());
    } catch (submitError) {
      setCreateError(
        submitError instanceof Error ? submitError.message : "新增会员失败",
      );
    } finally {
      setSaving(false);
    }
  }

  function openModal(member: MemberPanelItem) {
    const normalizedMember = normalizeMemberPanelItem(member);
    const nextForm = buildMemberFormState(normalizedMember);

    setModalMode("edit");
    setModalMember(normalizedMember);
    setForm(nextForm);
    setInitialForm(nextForm);
    setFullscreen(false);
    setOffset({ x: 0, y: 0 });
    setError(null);
    void hydrateMemberDetail(normalizedMember);
  }

  function openDetailModal(member: MemberPanelItem) {
    const normalizedMember = normalizeMemberPanelItem(member);
    const nextForm = buildMemberFormState(normalizedMember);

    setModalMode("detail");
    setModalMember(normalizedMember);
    setForm(nextForm);
    setInitialForm(nextForm);
    setFullscreen(false);
    setOffset({ x: 0, y: 0 });
    setError(null);
    void hydrateMemberDetail(normalizedMember);
  }

  function openModalWithStatus(member: MemberPanelItem, status: BindingStatus) {
    const normalizedMember = normalizeMemberPanelItem(member);
    const nextInitialForm = buildMemberFormState(normalizedMember);

    setModalMode("edit");
    setModalMember(normalizedMember);
    setForm({
      ...nextInitialForm,
      status,
    });
    setInitialForm(nextInitialForm);
    setFullscreen(false);
    setOffset({ x: 0, y: 0 });
    setError(null);
    void hydrateMemberDetail(normalizedMember, status);
  }

  async function hydrateMemberDetail(
    member: MemberPanelItem,
    statusOverride?: BindingStatus,
  ) {
    if (!store) {
      return;
    }

    setLoadingDetail(true);

    try {
      const detail = normalizeMemberPanelItem(
        await loadDetailResource<MemberPanelItem>(
          buildStoreScopedDetailPath("members", member.id, store.id),
          "member",
        ),
      );

      setItems((value) => replaceItemById(value, detail));
      setModalMember((current) =>
        current?.id === member.id ? { ...current, ...detail } : current,
      );
      setForm((current) =>
        current
          ? {
              ...buildMemberFormState(detail),
              status: statusOverride ?? detail.bindingStatus,
            }
          : current,
      );
      setInitialForm(buildMemberFormState(detail));
    } catch (detailError) {
      setError(
        detailError instanceof Error ? detailError.message : "会员详情加载失败",
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
      modalMode !== "detail" &&
      form &&
      initialForm &&
      !canCloseAdminModal({
        hasUnsavedChanges: hasUnsavedMemberModalChanges({
          current: form,
          initial: initialForm,
        }),
      })
    ) {
      return;
    }

    setModalMember(null);
    setModalMode("edit");
    setForm(null);
    setInitialForm(null);
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
    if (modalMode === "detail" || !modalMember || !form || !store) {
      return;
    }

    if (form.status === "DISABLED" && !form.disabledReason.trim()) {
      setError("停用会员时必须填写停用原因");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const shouldSubmitAddress =
        Boolean(form.defaultAddress.id) ||
        [
          form.defaultAddress.province,
          form.defaultAddress.city,
          form.defaultAddress.district,
          form.defaultAddress.detail,
        ].some((value) => Boolean(value.trim()));
      const response = await fetch(`/api/admin/members/${modalMember.id}`, {
        body: JSON.stringify({
          defaultAddress: shouldSubmitAddress ? form.defaultAddress : null,
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
            defaultAddress: MemberPanelItem["defaultAddress"];
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
                defaultAddress: updatedMember.defaultAddress,
                disabledReason: updatedMember.disabledReason,
                remark: updatedMember.remark,
              }
            : item,
          ),
      );
      await reloadMembers(pagination.page);
      setModalMember(null);
      setModalMode("edit");
      setForm(null);
      setInitialForm(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function openImportModal(mode: ImportMode) {
    setImportMode(mode);
    setImportOpen(true);
    setImportFile(null);
    setImportError(null);
    setImportResult(null);
  }

  function closeImportModal() {
    if (importing) {
      return;
    }

    setImportOpen(false);
    setImportFile(null);
    setImportError(null);
    setImportResult(null);
  }

  function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setImportFile(file);
    setImportError(null);
    setImportResult(null);
    event.target.value = "";
  }

  async function submitImport() {
    if (!store) {
      return;
    }

    if (!importFile) {
      setImportError("请先选择 .xlsx、.xls 或 .csv 文件");
      return;
    }

    setImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.set("storeId", store.id);
      formData.set("file", importFile);

      const response = await fetch(
        importMode === "members"
          ? "/api/admin/members/import"
          : "/api/admin/user-packages/import",
        {
        body: formData,
        method: "POST",
        },
      );
      const result = (await response.json()) as {
        data?: ImportResult | { result?: ImportResult | null } | null;
        error?: { message: string };
        success: boolean;
      };
      const importPayload = getImportResultFromApiPayload<ImportResult>(result);

      if (!response.ok || !result.success || !importPayload) {
        throw new Error(result.error?.message ?? "导入失败");
      }

      setImportResult(importPayload);
      if (importPayload.importedRows > 0) {
        await reloadMembers(1);
      }
    } catch (submitError) {
      setImportError(
        submitError instanceof Error ? submitError.message : "导入失败",
      );
    } finally {
      setImporting(false);
    }
  }

  const isPackageImport = importMode === "packages";
  const importTitle = isPackageImport ? "导入会员套餐" : "导入会员";
  const importDescription = isPackageImport
    ? "上传 Excel 或 CSV 后，按手机号查找或自动创建会员，按套餐名称匹配模板。"
    : "上传 Excel 或 CSV 后，按手机号创建或更新会员资料。";
  const importRecommendedHeaders = isPackageImport
    ? "推荐表头：手机号、套餐名称、总次数、已用次数、单次斤数、状态、备注"
    : "推荐表头：手机号、姓名、备注、状态、停用原因";
  const importRules = isPackageImport
    ? [
        "手机号和套餐名称必填；会员不存在时会自动创建，并绑定当前数据范围。",
        "套餐名称优先精确匹配，匹配多个模板时会标记失败。",
        "导入会新增用户套餐，不覆盖旧套餐；总次数、已用次数、单次斤数可留空，留空时使用模板值。",
        "状态可填：正常、冻结、已用完、过期。",
      ]
    : [
        "手机号必填，支持 11 位大陆手机号。",
        "状态可填：正常、启用、停用、禁用。",
        "已存在手机号会更新备注并保留原有数据归属。",
        "失败行会列出原因，其它合法行继续导入。",
      ];
  const importResultCards = importResult
    ? isPackageImportResult(importResult)
      ? [
          ["总行数", importResult.totalRows],
          ["成功", importResult.importedRows],
          ["新建会员", importResult.createdUsers],
          ["新建绑定", importResult.createdBindings],
          ["开通套餐", importResult.createdPackages],
          ["更新套餐", importResult.updatedPackages],
          ["失败", importResult.failedRows],
        ]
      : [
          ["总行数", importResult.totalRows],
          ["成功", importResult.importedRows],
          ["新建会员", importResult.createdUsers],
          ["更新会员", importResult.updatedUsers],
          ["失败", importResult.failedRows],
        ]
    : [];

  return (
    <section className="rounded-2xl border border-[#dbe6dc] bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1f8f4f]">
            <UserRound size={18} />
            会员用户管理
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-normal">
            会员用户
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#66756d]">
            会员用户来自小程序登录，与系统后台用户分开管理。
          </p>
        </div>
        <div className="flex flex-wrap items-start justify-end gap-3">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1f8f4f] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!store}
            onClick={openCreateModal}
            type="button"
          >
            <Plus size={16} />
            新增会员
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#cfe3d3] bg-[#edf7ef] px-4 text-sm font-semibold text-[#1f8f4f] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!store}
            onClick={() => openImportModal("members")}
            type="button"
          >
            <Upload size={16} />
            导入会员
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#cfe3d3] bg-[#edf7ef] px-4 text-sm font-semibold text-[#1f8f4f] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!store}
            onClick={() => openImportModal("packages")}
            type="button"
          >
            <Upload size={16} />
            导入会员套餐
          </button>
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
      </div>

      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] p-3">
        <label className="flex min-w-[260px] flex-1 flex-col gap-1 text-xs font-semibold text-[#66756d]">
          关键字
          <input
            className="h-10 rounded-xl border border-[#dbe6dc] bg-white px-3 text-sm font-normal text-[#15261d] outline-none focus:border-[#1f8f4f]"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void reloadMembers(1);
              }
            }}
            placeholder="会员昵称 / 手机号 / 备注"
            value={query}
          />
        </label>
        <label className="flex w-40 flex-col gap-1 text-xs font-semibold text-[#66756d]">
          状态
          <select
            className="h-10 rounded-xl border border-[#dbe6dc] bg-white px-3 text-sm font-normal text-[#15261d] outline-none focus:border-[#1f8f4f]"
            onChange={(event) =>
              setStatusFilter(event.target.value as BindingStatus | "ALL")
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
          onClick={() => void reloadMembers(1)}
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
                  <div className="flex min-w-0 items-center gap-3">
                    <AdminMemberAvatar
                      avatarUrl={member.avatarUrl}
                      name={member.nickname}
                      phone={member.phone}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="truncate font-semibold">
                        {member.nickname ?? "未命名会员"}
                      </div>
                      <div className="mt-1 text-xs text-[#66756d]">
                        {displayPhone(member.phone)} · {formatDateOnly(member.createdAt)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-semibold">
	                    {member.latestActivePackage
	                      ? `${member.latestActivePackage.remainingTimes}/${member.latestActivePackage.totalTimes} 次`
	                      : "无可用套餐"}
	                  </div>
	                  <div className="mt-1 text-xs text-[#66756d]">
	                    可用套餐 {member.activePackageCount} 个
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
                    {formatAddress(member.defaultAddress)}
                  </div>
                  <div className="mt-1 text-xs text-[#66756d]">
                    {member.defaultAddress?.receiverName ?? "-"} ·{" "}
                    {displayPhone(member.defaultAddress?.receiverPhone ?? null)}
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
                      onClick={() => openDetailModal(member)}
                      title="查看详情"
                      type="button"
                    >
                      <Eye size={16} />
                    </button>
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
                  暂无会员用户
                </td>
              </tr>
            ) : null}
        </tbody>
      </table>
      <AdminPagination
        disabled={loadingList}
        onPageChange={(nextPage) => void reloadMembers(nextPage)}
        pagination={pagination}
      />
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-50 bg-[#0f2418]/35 p-5">
          <div
            aria-modal="true"
            className="mx-auto flex max-h-full min-h-[560px] w-[760px] max-w-full flex-col overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-2xl"
            role="dialog"
          >
            <div className="flex items-start justify-between border-b border-[#dbe6dc] px-6 py-4">
              <div>
                <div className="text-lg font-semibold">新增会员</div>
                <div className="mt-1 text-sm text-[#66756d]">
                  手动创建会员或将已有手机号绑定到当前数据范围。
                </div>
              </div>
              <button
                className="rounded-full bg-[#edf7ef] px-4 py-2 text-sm font-semibold text-[#1f8f4f]"
                disabled={saving}
                onClick={closeCreateModal}
                type="button"
              >
                关闭
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  <RequiredLabel>手机号</RequiredLabel>
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    onChange={(event) =>
                      setCreateForm((value) => ({
                        ...value,
                        phone: event.target.value,
                      }))
                    }
                    placeholder="请输入会员手机号"
                    value={createForm.phone}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  会员昵称
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    onChange={(event) =>
                      setCreateForm((value) => ({
                        ...value,
                        nickname: event.target.value,
                      }))
                    }
                    placeholder="可选"
                    value={createForm.nickname}
                  />
                </label>
              </div>

              <section className="mt-5 rounded-xl border border-[#dbe6dc] p-4">
                <h3 className="font-semibold">默认地址</h3>
                <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                  <label className="flex flex-col gap-2 font-medium">
                    收货人
                    <input
                      className="h-10 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        setCreateForm((value) => ({
                          ...value,
                          defaultAddress: {
                            ...value.defaultAddress,
                            receiverName: event.target.value,
                          },
                        }))
                      }
                      placeholder="默认使用会员昵称"
                      value={createForm.defaultAddress.receiverName}
                    />
                  </label>
                  <label className="flex flex-col gap-2 font-medium">
                    联系电话
                    <input
                      className="h-10 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        setCreateForm((value) => ({
                          ...value,
                          defaultAddress: {
                            ...value.defaultAddress,
                            receiverPhone: event.target.value,
                          },
                        }))
                      }
                      placeholder="默认使用会员手机号"
                      value={createForm.defaultAddress.receiverPhone}
                    />
                  </label>
                  <label className="flex flex-col gap-2 font-medium">
                    省
                    <input
                      className="h-10 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        setCreateForm((value) => ({
                          ...value,
                          defaultAddress: {
                            ...value.defaultAddress,
                            province: event.target.value,
                          },
                        }))
                      }
                      placeholder="例如 江苏省"
                      value={createForm.defaultAddress.province}
                    />
                  </label>
                  <label className="flex flex-col gap-2 font-medium">
                    市
                    <input
                      className="h-10 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        setCreateForm((value) => ({
                          ...value,
                          defaultAddress: {
                            ...value.defaultAddress,
                            city: event.target.value,
                          },
                        }))
                      }
                      placeholder="例如 南京市"
                      value={createForm.defaultAddress.city}
                    />
                  </label>
                  <label className="flex flex-col gap-2 font-medium">
                    区
                    <input
                      className="h-10 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        setCreateForm((value) => ({
                          ...value,
                          defaultAddress: {
                            ...value.defaultAddress,
                            district: event.target.value,
                          },
                        }))
                      }
                      placeholder="例如 六合区"
                      value={createForm.defaultAddress.district}
                    />
                  </label>
                  <label className="flex flex-col gap-2 font-medium md:col-span-2">
                    详细地址
                    <input
                      className="h-10 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                      onChange={(event) =>
                        setCreateForm((value) => ({
                          ...value,
                          defaultAddress: {
                            ...value.defaultAddress,
                            detail: event.target.value,
                          },
                        }))
                      }
                      placeholder="街道、小区、楼栋、门牌号"
                      value={createForm.defaultAddress.detail}
                    />
                  </label>
                </div>
              </section>

              <section className="mt-5 rounded-xl border border-[#dbe6dc] p-4">
                <h3 className="font-semibold">
                  <RequiredLabel>服务状态</RequiredLabel>
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(["ACTIVE", "DISABLED"] as const).map((status) => (
                    <button
                      className={[
                        "h-10 rounded-xl border text-sm font-semibold",
                        createForm.status === status
                          ? "border-[#1f8f4f] bg-[#e8f6ed] text-[#1f8f4f]"
                          : "border-[#dbe6dc] text-[#66756d]",
                      ].join(" ")}
                      key={status}
                      onClick={() =>
                        setCreateForm((value) => ({
                          ...value,
                          status,
                        }))
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
                    className="min-h-20 resize-y rounded-xl border border-[#dbe6dc] p-3 outline-none focus:border-[#1f8f4f]"
                    onChange={(event) =>
                      setCreateForm((value) => ({
                        ...value,
                        remark: event.target.value,
                      }))
                    }
                    placeholder="可选"
                    value={createForm.remark}
                  />
                </label>
                <label className="mt-4 flex flex-col gap-2 text-sm font-medium">
                  <span>
                    停用原因
                    {createForm.status === "DISABLED" ? (
                      <span className="ml-1 text-red-500">*</span>
                    ) : null}
                  </span>
                  <textarea
                    className="min-h-20 resize-y rounded-xl border border-[#dbe6dc] p-3 outline-none focus:border-[#1f8f4f]"
                    disabled={createForm.status === "ACTIVE"}
                    onChange={(event) =>
                      setCreateForm((value) => ({
                        ...value,
                        disabledReason: event.target.value,
                      }))
                    }
                    placeholder={
                      createForm.status === "DISABLED" ? "请输入停用原因" : ""
                    }
                    required={createForm.status === "DISABLED"}
                    value={createForm.disabledReason}
                  />
                </label>
              </section>

              {createError ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {createError}
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-3 border-t border-[#dbe6dc] px-6 py-4">
              <button
                className="h-10 rounded-xl border border-[#dbe6dc] px-5"
                disabled={saving}
                onClick={closeCreateModal}
                type="button"
              >
                取消
              </button>
              <button
                className="h-10 rounded-xl bg-[#1f8f4f] px-5 font-semibold text-white disabled:opacity-60"
                disabled={saving || !createForm.phone.trim()}
                onClick={() => void submitCreateModal()}
                type="button"
              >
                {saving ? "保存中" : "保存"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {importOpen ? (
        <div className="fixed inset-0 z-50 bg-[#0f2418]/35 p-5">
          <div
            aria-modal="true"
            className="mx-auto flex max-h-full min-h-[560px] w-[760px] max-w-full flex-col overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-2xl"
            role="dialog"
          >
            <div className="flex items-start justify-between border-b border-[#dbe6dc] px-6 py-4">
              <div>
                <div className="text-lg font-semibold">{importTitle}</div>
                <div className="mt-1 text-sm text-[#66756d]">
                  {importDescription}
                </div>
              </div>
              <button
                className="rounded-full bg-[#edf7ef] px-4 py-2 text-sm font-semibold text-[#1f8f4f]"
                disabled={importing}
                onClick={closeImportModal}
                type="button"
              >
                关闭
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="grid gap-4 md:grid-cols-[1fr_240px]">
                <div>
                  <div className="rounded-2xl border border-dashed border-[#cfe3d3] bg-[#f8fbf7] p-5">
                    <div className="text-sm font-semibold">
                      <RequiredLabel>导入文件</RequiredLabel>
                    </div>
                    <div className="mt-2 text-sm leading-6 text-[#66756d]">
                      支持 .xlsx、.xls、.csv，单个文件不超过 5MB。
                    </div>
                    <div className="mt-4 rounded-xl bg-white px-4 py-3 text-sm">
                      {importFile ? (
                        <span className="font-semibold text-[#15261d]">
                          {importFile.name}
                        </span>
                      ) : (
                        <span className="text-[#8a9a90]">尚未选择文件</span>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-[#cfe3d3] px-4 text-sm font-semibold text-[#1f8f4f]">
                        <Upload size={16} />
                        选择文件
                        <input
                          accept={IMPORT_FILE_ACCEPT}
                          className="hidden"
                          onChange={handleImportFile}
                          type="file"
                        />
                      </label>
                      <button
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#cfe3d3] bg-white px-4 text-sm font-semibold text-[#1f8f4f]"
                        onClick={() => downloadImportTemplate(importMode)}
                        type="button"
                      >
                        <Download size={16} />
                        下载模板
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 text-xs leading-5 text-[#66756d]">
                    {importRecommendedHeaders}。模板为 xlsx 文件，可下载后直接填写导入。
                  </div>
                </div>

                <aside className="rounded-2xl border border-[#dbe6dc] bg-[#f8fbf7] p-4">
                  <div className="text-sm font-semibold">导入规则</div>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-[#66756d]">
                    {importRules.map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                </aside>
              </div>

              {importResult ? (
                <div className="mt-4 rounded-2xl border border-[#dbe6dc] p-4">
                  <div className="flex flex-wrap gap-3 text-sm">
                    {importResultCards.map(([label, value]) => (
                      <div
                        className="rounded-xl bg-[#f8fbf7] px-4 py-2"
                        key={label}
                      >
                        <div className="text-xs text-[#66756d]">{label}</div>
                        <div className="mt-1 text-lg font-semibold">{value}</div>
                      </div>
                    ))}
                  </div>
                  {importResult.failures.length > 0 ? (
                    <div className="mt-4 max-h-40 overflow-auto rounded-xl bg-[#fffaf0] p-3 text-sm text-[#9a6a18]">
                      {importResult.failures.map((failure) => (
                        <div key={`${failure.rowNumber}-${failure.phone}`}>
                          第 {failure.rowNumber} 行：{failure.reason}
                          {failure.phone ? `（${failure.phone}）` : ""}
                          {"templateName" in failure && failure.templateName
                            ? `，套餐：${failure.templateName}`
                            : ""}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-3 border-t border-[#dbe6dc] px-6 py-4">
              <button
                className="h-10 rounded-xl border border-[#dbe6dc] px-5"
                disabled={importing}
                onClick={closeImportModal}
                type="button"
              >
                取消
              </button>
              <button
                className="h-10 rounded-xl bg-[#1f8f4f] px-5 font-semibold text-white disabled:opacity-60"
                disabled={importing}
                onClick={() => void submitImport()}
                type="button"
              >
                {importing ? "导入中" : "开始导入"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modalMember && form ? (
        <div className="fixed inset-0 z-50 bg-[#0f2418]/35 p-5">
          <div
            aria-modal="true"
            className={[
              "mx-auto flex min-h-[500px] flex-col overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-2xl",
              fullscreen
                ? "h-full w-full"
                : "h-[64vh] w-[720px] max-w-full resize",
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
                <div className="truncate text-lg font-semibold">
                  {modalMode === "detail" ? "会员详情" : "编辑会员"} ·{" "}
                  {modalMember.nickname ?? modalMember.phone}
                </div>
                {loadingDetail ? (
                  <div className="mt-1 text-sm text-[#66756d]">
                    正在加载最新会员详情
                  </div>
                ) : null}
              </div>
              <div
                className="flex items-center gap-2"
                onPointerDown={(event) => event.stopPropagation()}
              >
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
                  <div className="flex items-center gap-3">
                    <AdminMemberAvatar
                      avatarUrl={modalMember.avatarUrl}
                      name={modalMember.nickname}
                      phone={modalMember.phone}
                    />
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">
                        {modalMember.nickname ?? "未命名会员"}
                      </h3>
                      <div className="mt-1 text-sm text-[#66756d]">
                        {displayPhone(modalMember.phone)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                    <div>
                      <div className="text-[#66756d]">手机号</div>
                      <div className="mt-1 font-medium">
                        {displayPhone(modalMember.phone)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#66756d]">会员状态</div>
                      <div className="mt-1 font-medium">
                        {STATUS_LABELS[modalMember.bindingStatus]}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#66756d]">订单数</div>
                      <div className="mt-1 font-medium">
                        {modalMember.orderCount} 单
                      </div>
                    </div>
                    <div>
	                      <div className="text-[#66756d]">可用套餐</div>
                      <div className="mt-1 font-medium">
                        {modalMember.activePackageCount} 个
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-[#dbe6dc] p-4">
                  <h3 className="font-semibold">默认地址</h3>
                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                    <label className="flex flex-col gap-2 font-medium">
                      <RequiredLabel>收货人</RequiredLabel>
                      <input
                        className="h-10 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                        onChange={(event) =>
                          setForm((value) =>
                            value
                              ? {
                                  ...value,
                                  defaultAddress: {
                                    ...value.defaultAddress,
                                    receiverName: event.target.value,
                                  },
                                }
                              : value,
                          )
                        }
                        readOnly={modalMode === "detail"}
                        value={form.defaultAddress.receiverName}
                      />
                    </label>
                    <label className="flex flex-col gap-2 font-medium">
                      <RequiredLabel>联系电话</RequiredLabel>
                      <input
                        className="h-10 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                        onChange={(event) =>
                          setForm((value) =>
                            value
                              ? {
                                  ...value,
                                  defaultAddress: {
                                    ...value.defaultAddress,
                                    receiverPhone: event.target.value,
                                  },
                                }
                              : value,
                          )
                        }
                        readOnly={modalMode === "detail"}
                        value={form.defaultAddress.receiverPhone}
                      />
                    </label>
                    <label className="flex flex-col gap-2 font-medium">
                      <RequiredLabel>省</RequiredLabel>
                      <input
                        className="h-10 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                        onChange={(event) =>
                          setForm((value) =>
                            value
                              ? {
                                  ...value,
                                  defaultAddress: {
                                    ...value.defaultAddress,
                                    province: event.target.value,
                                  },
                                }
                              : value,
                          )
                        }
                        placeholder="例如 江苏省"
                        readOnly={modalMode === "detail"}
                        value={form.defaultAddress.province}
                      />
                    </label>
                    <label className="flex flex-col gap-2 font-medium">
                      <RequiredLabel>市</RequiredLabel>
                      <input
                        className="h-10 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                        onChange={(event) =>
                          setForm((value) =>
                            value
                              ? {
                                  ...value,
                                  defaultAddress: {
                                    ...value.defaultAddress,
                                    city: event.target.value,
                                  },
                                }
                              : value,
                          )
                        }
                        placeholder="例如 南京市"
                        readOnly={modalMode === "detail"}
                        value={form.defaultAddress.city}
                      />
                    </label>
                    <label className="flex flex-col gap-2 font-medium">
                      <RequiredLabel>区</RequiredLabel>
                      <input
                        className="h-10 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                        onChange={(event) =>
                          setForm((value) =>
                            value
                              ? {
                                  ...value,
                                  defaultAddress: {
                                    ...value.defaultAddress,
                                    district: event.target.value,
                                  },
                                }
                              : value,
                          )
                        }
                        placeholder="例如 六合区"
                        readOnly={modalMode === "detail"}
                        value={form.defaultAddress.district}
                      />
                    </label>
                    <label className="flex flex-col gap-2 font-medium md:col-span-2">
                      <RequiredLabel>详细地址</RequiredLabel>
                      <input
                        className="h-10 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                        onChange={(event) =>
                          setForm((value) =>
                            value
                              ? {
                                  ...value,
                                  defaultAddress: {
                                    ...value.defaultAddress,
                                    detail: event.target.value,
                                  },
                                }
                              : value,
                          )
                        }
                        placeholder="街道、小区、楼栋、门牌号"
                        readOnly={modalMode === "detail"}
                        value={form.defaultAddress.detail}
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-xl border border-[#dbe6dc] p-4">
                  <h3 className="font-semibold">套餐与订单</h3>
                  <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                    <div>
                      <div className="text-[#66756d]">全部套餐</div>
                      <div className="mt-1 font-medium">
                        {modalMember.packages?.length ?? modalMember.activePackageCount} 个
                      </div>
                    </div>
                    <div>
                      <div className="text-[#66756d]">最近订单</div>
                      <div className="mt-1 font-medium">
                        {modalMember.recentOrders?.length ?? modalMember.orderCount} 条
                      </div>
                    </div>
                  </div>
                  {modalMember.packages?.[0] ? (
                    <div className="mt-4 rounded-xl bg-[#f8fbf7] px-3 py-2 text-sm">
                      {modalMember.packages[0].nameSnapshot} · 剩余{" "}
                      {modalMember.packages[0].remainingTimes}/
                      {modalMember.packages[0].totalTimes} 次
                    </div>
                  ) : null}
                  {modalMember.recentOrders?.[0] ? (
                    <div className="mt-2 rounded-xl bg-[#f8fbf7] px-3 py-2 text-sm">
                      {formatRecentOrder(modalMember.recentOrders[0])}
                    </div>
                  ) : null}
                </section>
              </div>

              <aside className="flex flex-col gap-4">
                <div className="rounded-xl border border-[#cfe3d3] bg-[#f8fff8] p-4">
                  <h3 className="font-semibold">
                    <RequiredLabel>服务状态</RequiredLabel>
                  </h3>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {(["ACTIVE", "DISABLED"] as const).map((status) => (
                      <button
                        className={[
                          "h-10 rounded-xl border text-sm font-semibold",
                          form.status === status
                            ? "border-[#1f8f4f] bg-[#e8f6ed] text-[#1f8f4f]"
                            : "border-[#dbe6dc] text-[#66756d]",
                        ].join(" ")}
                        disabled={modalMode === "detail"}
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
                      readOnly={modalMode === "detail"}
                      value={form.remark}
                    />
                  </label>
                  <label className="mt-4 flex flex-col gap-2 text-sm font-medium">
                    <span>
                      停用原因
                      {form.status === "DISABLED" ? (
                        <span className="ml-1 text-red-500">*</span>
                      ) : null}
                    </span>
                    <textarea
                      className="min-h-20 resize-y rounded-xl border border-[#dbe6dc] p-3 outline-none focus:border-[#1f8f4f]"
                      disabled={modalMode === "detail" || form.status === "ACTIVE"}
                      onChange={(event) =>
                        setForm((value) =>
                          value
                            ? { ...value, disabledReason: event.target.value }
                            : value,
                        )
                      }
                      placeholder={
                        form.status === "DISABLED" ? "请输入停用原因" : ""
                      }
                      readOnly={modalMode === "detail"}
                      required={form.status === "DISABLED"}
                      value={form.disabledReason}
                    />
                  </label>
                </div>

              </aside>
            </div>

            <div className="flex justify-end gap-3 border-t border-[#dbe6dc] px-6 py-4">
              <button
                className="h-10 rounded-xl border border-[#dbe6dc] px-5"
                disabled={saving}
                onClick={closeModal}
                type="button"
              >
                {modalMode === "detail" ? "关闭" : "取消"}
              </button>
              {modalMode !== "detail" ? (
                <button
                  className="h-10 rounded-xl bg-[#1f8f4f] px-5 font-semibold text-white disabled:opacity-60"
                  disabled={saving || loadingDetail}
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
      {modalMember && error ? (
        <AdminAlertDialog message={error} onClose={() => setError(null)} />
      ) : null}
      {importOpen && importError ? (
        <AdminAlertDialog
          message={importError}
          onClose={() => setImportError(null)}
          title="导入失败"
        />
      ) : null}
    </section>
  );
}
