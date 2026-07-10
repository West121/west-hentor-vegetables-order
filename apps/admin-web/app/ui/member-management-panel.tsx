"use client";

import {
  Ban,
  ChevronDown,
  Download,
  Eye,
  Maximize2,
  Minimize2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { adminTransferHref } from "@/app/lib/admin-navigation";
import {
  createAdminModalDragState,
  getBoundedAdminModalOffset,
  type AdminModalDragState,
} from "./admin-modal-drag";
import { CHINA_PROVINCE_REGIONS, getChinaCityRegion } from "@hentor/shared";
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
import { AdminAlertDialog, AdminConfirmDialog } from "./admin-confirm-dialog";
import { canCloseAdminModal } from "./admin-modal-close-guard";
import {
  buildMemberFormState,
  hasUnsavedMemberModalChanges,
  type MemberFormState,
} from "./member-modal-state";
import { getImportResultFromApiPayload } from "./member-import-response";
import { AdminSelect } from "./admin-select";
import { AdminRadioGroup } from "./admin-radio-group";
import { AdminMemberAvatar } from "./admin-member-avatar";
import { AdminOverflowText } from "./admin-table-tooltip";
import { AdminFormField } from "./admin-form-field";
import { formatDateOnly, formatDateTimeMinute } from "./date-format";
import { RequiredLabel } from "./required-mark";

type StoreOption = {
  id: string;
  name: string;
};

type BindingStatus = "ACTIVE" | "DISABLED" | "DELETED";
type EditableBindingStatus = Exclude<BindingStatus, "DELETED">;

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
    createdAt?: string;
    id: string;
    lastUsedAt?: string | null;
    nameSnapshot: string;
    remainingTimes: number;
    status: string;
    totalTimes: number;
    updatedAt?: string;
    usedTimes: number;
    weightLimitJin: number;
  }>;
  phone: string | null;
  recentOrders?: Array<{
    createdAt?: string;
    id: string;
    items: Array<{
      dishNameSnapshot: string;
      weightJin: number;
    }>;
    orderNo: string;
    status: string;
    totalWeightJin: number;
    updatedAt?: string;
    userPackageId?: string;
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
  canWrite?: boolean;
  initialItems: MemberPanelItem[];
  initialPagination: AdminPaginationMeta;
  initialSummary: {
    active: number;
    deleted: number;
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

type MemberAddressFormErrors = Partial<
  Record<
    | "city"
    | "detail"
    | "district"
    | "province"
    | "receiverName"
    | "receiverPhone",
    string
  >
>;

type CreateMemberFormErrors = {
  defaultAddress?: MemberAddressFormErrors;
  disabledReason?: string;
  phone?: string;
};

type MemberFormErrors = {
  defaultAddress?: MemberAddressFormErrors;
  disabledReason?: string;
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
      [
        "手机号",
        "昵称",
        "省",
        "市",
        "区",
        "详细地址",
        "套餐名称",
        "总次数",
        "已用次数",
        "状态",
        "备注",
      ],
      [
        "15295081992",
        "张三",
        "江苏省",
        "南京市",
        "六合区",
        "龙池街道冠城大通",
        "8斤周套餐",
        "8",
        "0",
        "正常",
        "后台导入用户套餐",
      ],
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
  DELETED: "已删除",
  DISABLED: "已停用",
};

const PACKAGE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "可预订",
  EXHAUSTED: "已用完",
  EXPIRED: "已过期",
  FROZEN: "已冻结",
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  CANCELED: "已取消",
  DELIVERED: "已签收",
  PENDING_SHIPMENT: "待配送",
  SHIPPED: "已发货",
  VOIDED: "已作废",
};

const MEMBER_DETAIL_PREVIEW_LIMIT = 3;

function buildMemberRelatedHref(
  section: "orders" | "user-packages",
  member: MemberPanelItem,
  storeId?: string,
) {
  const query = (member.phone ?? member.nickname ?? "").trim();
  return adminTransferHref({ query, section, storeId });
}

function buildPanelMemberFormState(member: MemberPanelItem) {
  return buildMemberFormState({
    ...member,
    bindingStatus: toEditableBindingStatus(member.bindingStatus),
  });
}

function toEditableBindingStatus(status: BindingStatus): EditableBindingStatus {
  return status === "DISABLED" ? "DISABLED" : "ACTIVE";
}

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

type AddressRegionValue = Pick<
  MemberFormState["defaultAddress"],
  "city" | "district" | "province"
>;

type AddressRegionCascaderProps = {
  errors?: Partial<Record<keyof AddressRegionValue, string>>;
  onChange: (nextValue: AddressRegionValue) => void;
  readOnly?: boolean;
  required?: boolean;
  value: AddressRegionValue;
};

function appendCurrentOption(options: string[], currentValue: string) {
  const trimmed = currentValue.trim();
  if (!trimmed || options.includes(trimmed)) {
    return options;
  }

  return [trimmed, ...options];
}

type SearchableRegionSelectProps = {
  disabled?: boolean;
  error?: string | null;
  label: string;
  onClear: () => void;
  onValueChange: (value: string) => void;
  options: string[];
  placeholder: string;
  readOnly?: boolean;
  required?: boolean;
  value: string;
};

function SearchableRegionSelect({
  disabled = false,
  error,
  label,
  onClear,
  onValueChange,
  options,
  placeholder,
  readOnly = false,
  required = false,
  value,
}: SearchableRegionSelectProps) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const query = keyword.trim();
  const filteredOptions = query
    ? options.filter((option) => option.includes(query))
    : options;
  const interactiveDisabled = readOnly || disabled;

  function closeDropdown() {
    setOpen(false);
    setKeyword("");
  }

  return (
    <AdminFormField error={error} label={label} required={required}>
      {(invalid) => (
      <div
        className="relative"
        onBlur={(event) => {
          const nextTarget = event.relatedTarget;
          if (
            !nextTarget ||
            !event.currentTarget.contains(nextTarget as Node)
          ) {
            closeDropdown();
          }
        }}
      >
        <button
          aria-expanded={open}
          aria-haspopup="listbox"
          className="flex h-10 w-full items-center gap-2 rounded-xl border border-[#dbe6dc] bg-white px-3 pr-14 text-left text-sm font-normal text-[#15261d] transition hover:border-[#b8d8bf] disabled:cursor-not-allowed disabled:bg-[#f4f7f2] disabled:text-[#8a9a90]"
          aria-invalid={invalid}
          disabled={interactiveDisabled}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              closeDropdown();
            }
          }}
          type="button"
        >
          <span className={value ? "flex-1 truncate" : "flex-1 truncate text-[#8a9a90]"}>
            {value || placeholder}
          </span>
          <ChevronDown
            className={`shrink-0 text-[#6c7a71] transition ${open ? "rotate-180" : ""}`}
            size={16}
          />
        </button>
        {value && !interactiveDisabled ? (
          <button
            aria-label={`清除${label}`}
            className="absolute right-8 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full text-[#6c7a71] transition hover:bg-[#edf5ee] hover:text-[#1f8f4f]"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClear();
              closeDropdown();
            }}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            <X size={13} />
          </button>
        ) : null}
        {open && !interactiveDisabled ? (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[80] overflow-hidden rounded-xl border border-[#dbe6dc] bg-white shadow-xl">
            <div className="border-b border-[#e6eee7] p-2">
              <input
                autoFocus
                className="h-9 w-full rounded-lg border border-[#dbe6dc] px-3 text-sm outline-none transition placeholder:text-[#8a9a90] focus:border-[#1f8f4f]"
                onChange={(event) => setKeyword(event.target.value)}
                placeholder={`搜索${label}`}
                value={keyword}
              />
            </div>
            <div className="max-h-56 overflow-y-auto p-1" role="listbox">
              {filteredOptions.length ? (
                filteredOptions.map((option) => (
                  <button
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[#edf5ee] ${
                      option === value
                        ? "bg-[#e8f5eb] font-semibold text-[#1f8f4f]"
                        : "text-[#15261d]"
                    }`}
                    key={option}
                    onClick={() => {
                      onValueChange(option);
                      closeDropdown();
                    }}
                    onMouseDown={(event) => event.preventDefault()}
                    role="option"
                    type="button"
                  >
                    <span className="truncate">{option}</span>
                    {option === value ? <span className="text-xs">已选</span> : null}
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-sm text-[#8a9a90]">无匹配地区</div>
              )}
            </div>
          </div>
        ) : null}
      </div>
      )}
    </AdminFormField>
  );
}

function AddressRegionCascader({
  errors,
  onChange,
  readOnly = false,
  required = false,
  value,
}: AddressRegionCascaderProps) {
  const selectedProvince = value.province.trim();
  const selectedCity = value.city.trim();
  const selectedDistrict = value.district.trim();
  const provinceRegion = CHINA_PROVINCE_REGIONS.find(
    (region) => region.province === selectedProvince,
  );
  const provinceOptions = appendCurrentOption(
    CHINA_PROVINCE_REGIONS.map((region) => region.province),
    selectedProvince,
  );
  const cityOptions = appendCurrentOption(
    provinceRegion?.cities ?? [],
    selectedCity,
  );
  const districtOptions = appendCurrentOption(
    getChinaCityRegion(selectedProvince, selectedCity)?.districtNames ?? [],
    selectedDistrict,
  );

  return (
    <>
      <SearchableRegionSelect
        error={errors?.province}
        label="省"
        onClear={() => onChange({ city: "", district: "", province: "" })}
        onValueChange={(province) =>
          onChange({
            city: "",
            district: "",
            province,
          })
        }
        options={provinceOptions}
        placeholder="请选择省"
        readOnly={readOnly}
        required={required}
        value={selectedProvince}
      />
      <SearchableRegionSelect
        disabled={!selectedProvince}
        error={errors?.city}
        label="市"
        onClear={() =>
          onChange({
            city: "",
            district: "",
            province: selectedProvince,
          })
        }
        onValueChange={(city) =>
          onChange({
            city,
            district: "",
            province: selectedProvince,
          })
        }
        options={cityOptions}
        placeholder="请选择市"
        readOnly={readOnly}
        required={required}
        value={selectedCity}
      />
      <SearchableRegionSelect
        disabled={!selectedCity}
        error={errors?.district}
        label="区"
        onClear={() =>
          onChange({
            city: selectedCity,
            district: "",
            province: selectedProvince,
          })
        }
        onValueChange={(district) =>
          onChange({
            city: selectedCity,
            district,
            province: selectedProvince,
          })
        }
        options={districtOptions}
        placeholder="请选择区"
        readOnly={readOnly}
        required={required}
        value={selectedDistrict}
      />
    </>
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

function formatPackageStatus(status: string) {
  return PACKAGE_STATUS_LABELS[status] ?? status;
}

function formatOrderStatus(status: string) {
  return ORDER_STATUS_LABELS[status] ?? status;
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

function hasMemberFormErrors(
  errors: CreateMemberFormErrors | MemberFormErrors,
) {
  return Object.values(errors).some((value) =>
    typeof value === "string"
      ? Boolean(value)
      : value
        ? Object.values(value).some(Boolean)
        : false,
  );
}

function validateAddressIfPresent(
  address: MemberFormState["defaultAddress"],
  required: boolean,
) {
  const errors: MemberAddressFormErrors = {};
  const hasAnyAddressValue =
    required ||
    [
      address.province,
      address.city,
      address.district,
      address.detail,
      address.receiverName,
      address.receiverPhone,
    ].some((value) => Boolean(value.trim()));

  if (!hasAnyAddressValue) {
    return errors;
  }

  if (!address.receiverName.trim()) {
    errors.receiverName = "请输入收货人";
  }
  if (!address.receiverPhone.trim()) {
    errors.receiverPhone = "请输入联系电话";
  }
  if (!address.province.trim()) {
    errors.province = "请选择省";
  }
  if (!address.city.trim()) {
    errors.city = "请选择市";
  }
  if (!address.district.trim()) {
    errors.district = "请选择区";
  }
  if (!address.detail.trim()) {
    errors.detail = "请输入详细地址";
  }

  return errors;
}

function validateCreateMemberForm(form: CreateMemberFormState) {
  const errors: CreateMemberFormErrors = {};

  if (!form.phone.trim()) {
    errors.phone = "请输入会员手机号";
  }
  const addressErrors = validateAddressIfPresent(form.defaultAddress, false);
  if (Object.values(addressErrors).some(Boolean)) {
    errors.defaultAddress = addressErrors;
  }
  if (form.status === "DISABLED" && !form.disabledReason.trim()) {
    errors.disabledReason = "请输入停用原因";
  }

  return errors;
}

function validateMemberForm(form: MemberFormState) {
  const errors: MemberFormErrors = {};
  const addressErrors = validateAddressIfPresent(form.defaultAddress, true);
  if (Object.values(addressErrors).some(Boolean)) {
    errors.defaultAddress = addressErrors;
  }
  if (form.status === "DISABLED" && !form.disabledReason.trim()) {
    errors.disabledReason = "请输入停用原因";
  }

  return errors;
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
  canWrite = true,
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
  const [fullscreen, setFullscreen] = useState(true);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<BindingStatus | "ALL">("ACTIVE");
  const [deleteCandidate, setDeleteCandidate] = useState<MemberPanelItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateMemberFormState>(
    buildCreateMemberFormState,
  );
  const [createError, setCreateError] = useState<string | null>(null);
  const [createFormErrors, setCreateFormErrors] =
    useState<CreateMemberFormErrors>({});
  const [formErrors, setFormErrors] = useState<MemberFormErrors>({});
  const [importOpen, setImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>("members");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const dragRef = useRef<AdminModalDragState | null>(null);

  async function reloadMembers(
    page = pagination.page,
    filters = { query, statusFilter },
    pageSize = pagination.pageSize,
  ) {
    if (!store) {
      return;
    }

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      storeId: store.id,
    });
    const nextQuery = filters.query.trim();
    if (nextQuery) {
      params.set("query", nextQuery);
    }
    params.set("status", filters.statusFilter);

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
        pageSize,
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
    setStatusFilter("ACTIVE");
    void reloadMembers(1, { query: "", statusFilter: "ACTIVE" });
  }

  function openCreateModal() {
    if (!canWrite || !store) {
      return;
    }

    setCreateForm(buildCreateMemberFormState());
    setCreateError(null);
    setCreateFormErrors({});
    setFullscreen(true);
    setOffset({ x: 0, y: 0 });
    setCreateOpen(true);
  }

  function closeCreateModal() {
    if (saving) {
      return;
    }

    setCreateOpen(false);
    setCreateError(null);
    setCreateFormErrors({});
  }

  async function submitCreateModal() {
    if (!canWrite || !store) {
      return;
    }

    const validationErrors = validateCreateMemberForm(createForm);
    setCreateFormErrors(validationErrors);
    if (hasMemberFormErrors(validationErrors)) {
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
    if (!canWrite) {
      return;
    }

    const normalizedMember = normalizeMemberPanelItem(member);
    const nextForm = buildPanelMemberFormState(normalizedMember);

    setModalMode("edit");
    setModalMember(normalizedMember);
    setForm(nextForm);
    setInitialForm(nextForm);
    setFormErrors({});
    setFullscreen(true);
    setOffset({ x: 0, y: 0 });
    setError(null);
    void hydrateMemberDetail(normalizedMember);
  }

  function openDetailModal(member: MemberPanelItem) {
    const normalizedMember = normalizeMemberPanelItem(member);
    const nextForm = buildPanelMemberFormState(normalizedMember);

    setModalMode("detail");
    setModalMember(normalizedMember);
    setForm(nextForm);
    setInitialForm(nextForm);
    setFormErrors({});
    setFullscreen(true);
    setOffset({ x: 0, y: 0 });
    setError(null);
    if (normalizedMember.bindingStatus !== "DELETED") {
      void hydrateMemberDetail(normalizedMember);
    }
  }

  function openModalWithStatus(member: MemberPanelItem, status: EditableBindingStatus) {
    if (!canWrite) {
      return;
    }

    const normalizedMember = normalizeMemberPanelItem(member);
    if (normalizedMember.bindingStatus === "DELETED") {
      setError("已删除会员仅保留历史记录，不能继续编辑");
      return;
    }

    const nextInitialForm = buildPanelMemberFormState(normalizedMember);

    setModalMode("edit");
    setModalMember(normalizedMember);
    setForm({
      ...nextInitialForm,
      status,
    });
    setInitialForm(nextInitialForm);
    setFormErrors({});
    setFullscreen(true);
    setOffset({ x: 0, y: 0 });
    setError(null);
    void hydrateMemberDetail(normalizedMember, status);
  }

  async function hydrateMemberDetail(
    member: MemberPanelItem,
    statusOverride?: EditableBindingStatus,
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
              ...buildPanelMemberFormState(detail),
              status: statusOverride ?? toEditableBindingStatus(detail.bindingStatus),
            }
          : current,
      );
      setInitialForm(buildPanelMemberFormState(detail));
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
    setFormErrors({});
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

  async function submitModal() {
    if (!canWrite || modalMode === "detail" || !modalMember || !form || !store) {
      return;
    }

    const validationErrors = validateMemberForm(form);
    setFormErrors(validationErrors);
    if (hasMemberFormErrors(validationErrors)) {
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
          nickname: form.nickname,
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
            nickname: string | null;
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
                nickname: updatedMember.nickname,
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

  async function submitDeleteMember() {
    if (!canWrite || !store || !deleteCandidate) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const params = new URLSearchParams({ storeId: store.id });
      const response = await fetch(
        `/api/admin/members/${deleteCandidate.id}?${params.toString()}`,
        { method: "DELETE" },
      );
      const result = (await response.json().catch(() => null)) as {
        error?: { message: string };
        success?: boolean;
      } | null;

      if (!response.ok || !result?.success) {
        throw new Error(result?.error?.message ?? "删除会员失败");
      }

      setDeleteCandidate(null);
      await reloadMembers(pagination.page);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除会员失败");
    } finally {
      setSaving(false);
    }
  }

  function openImportModal(mode: ImportMode) {
    if (!canWrite || !store) {
      return;
    }

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
    if (!canWrite || !store) {
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
    ? "推荐表头：手机号、昵称、省、市、区、详细地址、套餐名称、总次数、已用次数、状态、备注"
    : "推荐表头：手机号、姓名、备注、状态、停用原因";
  const importRules = isPackageImport
    ? [
        "手机号、昵称、套餐名称和地址必填；会员不存在时会自动创建，并绑定当前数据范围。",
        "地址需填写省、市、区、详细地址，并且必须在当前配送范围内。",
        "套餐名称优先精确匹配，匹配多个模板时会标记失败。",
        "导入会新增用户套餐，不覆盖旧套餐；总次数、已用次数可留空，留空时使用模板值。",
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
          {canWrite ? (
            <>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1f8f4f] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#a8b9ae]"
                disabled={!store}
                onClick={openCreateModal}
                title={store ? "新增会员" : "当前账号未分配数据范围"}
                type="button"
              >
                <Plus size={16} />
                新增会员
              </button>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#cfe3d3] bg-[#edf7ef] px-4 text-sm font-semibold text-[#1f8f4f] disabled:cursor-not-allowed disabled:bg-[#edf0ec] disabled:text-[#91a497]"
                disabled={!store}
                onClick={() => openImportModal("packages")}
                title={store ? "导入会员套餐" : "当前账号未分配数据范围"}
                type="button"
              >
                <Upload size={16} />
                导入会员套餐
              </button>
            </>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {[
              ["全部", summary.total],
              ["可服务", summary.active],
              ["已停用", summary.disabled],
              ["已删除", summary.deleted],
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
          <AdminSelect
            contentLabel="状态"
            onChange={(value) =>
              setStatusFilter(value as BindingStatus | "ALL")
            }
            options={[
              { label: "全部状态", value: "ALL" },
              ...Object.entries(STATUS_LABELS).map(([value, label]) => ({
                label,
                value,
              })),
            ]}
            value={statusFilter}
          />
        </label>
        <button
          className="h-10 rounded-xl bg-[#1f8f4f] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#a8b9ae]"
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

      <div className="overflow-x-auto rounded-xl border border-[#dbe6dc]">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
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
                      <AdminOverflowText className="font-semibold" content={member.nickname ?? "未命名会员"}>
                        {member.nickname ?? "未命名会员"}
                      </AdminOverflowText>
                      <div className="mt-1 text-xs text-[#66756d]">
                        {displayPhone(member.phone)} · {formatDateOnly(member.createdAt)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <AdminOverflowText className="font-semibold" content={
                    member.latestActivePackage
                      ? `${member.latestActivePackage.remainingTimes}/${member.latestActivePackage.totalTimes} 次`
                      : "无可用套餐"
                  }>
                    {member.latestActivePackage
                      ? `${member.latestActivePackage.remainingTimes}/${member.latestActivePackage.totalTimes} 次`
                      : "无可用套餐"}
                  </AdminOverflowText>
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
                  <AdminOverflowText className="max-w-52" content={formatAddress(member.defaultAddress)}>
                    {formatAddress(member.defaultAddress)}
                  </AdminOverflowText>
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
                    <AdminOverflowText
                      className="mt-2 max-w-36 text-xs text-[#66756d]"
                      content={member.disabledReason}
                    >
                      {member.disabledReason}
                    </AdminOverflowText>
                  ) : null}
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2 whitespace-nowrap">
                    {member.bindingStatus === "DELETED" ? (
                      <span className="text-xs text-[#8a9a90]">已删除记录</span>
                    ) : (
                      <>
                        <Button
                          className="border-[#dbe6dc] text-[#1f8f4f]"
                          onClick={() => openDetailModal(member)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Eye data-icon="inline-start" />
                          查看
                        </Button>
                        {canWrite ? (
                          <>
                            <Button
                              className="border-[#dbe6dc] text-[#1f8f4f]"
                              onClick={() => openModal(member)}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              <Pencil data-icon="inline-start" />
                              编辑
                            </Button>
                            <Button
                              className="border-[#dbe6dc] text-[#1f8f4f]"
                              onClick={() =>
                                openModalWithStatus(
                                  member,
                                  member.bindingStatus === "ACTIVE"
                                    ? "DISABLED"
                                    : "ACTIVE",
                                )
                              }
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              {member.bindingStatus === "ACTIVE" ? (
                                <Ban data-icon="inline-start" />
                              ) : (
                                <RotateCcw data-icon="inline-start" />
                              )}
                              {member.bindingStatus === "ACTIVE" ? "停用" : "启用"}
                            </Button>
                            <Button
                              className="border-red-100 text-red-600 hover:bg-red-50"
                              disabled={saving}
                              onClick={() => setDeleteCandidate(member)}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              <Trash2 data-icon="inline-start" />
                              删除
                            </Button>
                          </>
                        ) : null}
                      </>
                    )}
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
        onPageSizeChange={(nextPageSize) =>
          void reloadMembers(1, { query, statusFilter }, nextPageSize)
        }
        pagination={pagination}
      />
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-50 bg-[#0f2418]/35 p-5">
          <div
            aria-modal="true"
            data-admin-modal-shell
            data-fullscreen={fullscreen ? "true" : "false"}
            className={[
              "mx-auto flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-2xl",
              fullscreen
                ? "h-full w-full"
                : "h-[72vh] w-[760px] max-w-full resize",
            ].join(" ")}
            role="dialog"
            style={
              fullscreen
                ? undefined
                : { transform: `translate(${offset.x}px, ${offset.y}px)` }
            }
          >
            <div
              data-admin-modal-drag-handle
              className="flex cursor-move items-start justify-between border-b border-[#dbe6dc] px-6 py-4"
              onPointerDown={handleHeaderPointerDown}
              onPointerMove={handleHeaderPointerMove}
              onPointerCancel={handleHeaderPointerUp}
              onPointerUp={handleHeaderPointerUp}
            >
              <div>
                <div className="text-lg font-semibold">新增会员</div>
                <div className="mt-1 text-sm text-[#66756d]">
                  手动创建会员或将已有手机号绑定到当前数据范围。
                </div>
              </div>
              <div
                className="flex items-center gap-2"
                onPointerDown={(event) => event.stopPropagation()}
              >
                <button
                  className="grid h-9 w-9 place-items-center rounded-xl border border-[#cfe3d3] bg-[#eff8f1] text-[#1f8f4f]"
                  disabled={saving}
                  onClick={() => setFullscreen((value) => !value)}
                  title={fullscreen ? "退出全屏" : "全屏"}
                  type="button"
                >
                  {fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                </button>
                <button
                  className="grid h-9 w-9 place-items-center rounded-xl border border-red-100 bg-red-50 text-red-600"
                  disabled={saving}
                  onClick={closeCreateModal}
                  title="关闭"
                  type="button"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <AdminFormField
                  error={createFormErrors.phone}
                  label="手机号"
                  required
                >
                  {(invalid) => (
                  <input
                    aria-invalid={invalid}
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    onChange={(event) =>
                      setCreateForm((value) => ({
                        ...value,
                        phone: event.target.value,
                      }))
                    }
                    onFocus={() =>
                      setCreateFormErrors((value) => ({
                        ...value,
                        phone: undefined,
                      }))
                    }
                    placeholder="请输入会员手机号"
                    value={createForm.phone}
                  />
                  )}
                </AdminFormField>
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
                  <AdminFormField
                    error={createFormErrors.defaultAddress?.receiverName}
                    label="收货人"
                  >
                    {(invalid) => (
                    <input
                      aria-invalid={invalid}
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
                      onFocus={() =>
                        setCreateFormErrors((value) => ({
                          ...value,
                          defaultAddress: {
                            ...value.defaultAddress,
                            receiverName: undefined,
                          },
                        }))
                      }
                      placeholder="默认使用会员昵称"
                      value={createForm.defaultAddress.receiverName}
                    />
                    )}
                  </AdminFormField>
                  <AdminFormField
                    error={createFormErrors.defaultAddress?.receiverPhone}
                    label="联系电话"
                  >
                    {(invalid) => (
                    <input
                      aria-invalid={invalid}
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
                      onFocus={() =>
                        setCreateFormErrors((value) => ({
                          ...value,
                          defaultAddress: {
                            ...value.defaultAddress,
                            receiverPhone: undefined,
                          },
                        }))
                      }
                      placeholder="默认使用会员手机号"
                      value={createForm.defaultAddress.receiverPhone}
                    />
                    )}
                  </AdminFormField>
                  <AddressRegionCascader
                    errors={createFormErrors.defaultAddress}
                    onChange={(region) => {
                      setCreateForm((value) => ({
                        ...value,
                        defaultAddress: {
                          ...value.defaultAddress,
                          ...region,
                        },
                      }));
                      setCreateFormErrors((value) => ({
                        ...value,
                        defaultAddress: {
                          ...value.defaultAddress,
                          province: undefined,
                          city: undefined,
                          district: undefined,
                        },
                      }));
                    }}
                    value={createForm.defaultAddress}
                  />
                  <AdminFormField
                    className="md:col-span-2"
                    error={createFormErrors.defaultAddress?.detail}
                    label="详细地址"
                  >
                    {(invalid) => (
                    <input
                      aria-invalid={invalid}
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
                      onFocus={() =>
                        setCreateFormErrors((value) => ({
                          ...value,
                          defaultAddress: {
                            ...value.defaultAddress,
                            detail: undefined,
                          },
                        }))
                      }
                      placeholder="街道、小区、楼栋、门牌号"
                      value={createForm.defaultAddress.detail}
                    />
                    )}
                  </AdminFormField>
                </div>
              </section>

              <section className="mt-5 rounded-xl border border-[#dbe6dc] p-4">
                <h3 className="font-semibold">
                  <RequiredLabel>服务状态</RequiredLabel>
                </h3>
                <div className="mt-2">
                  <AdminRadioGroup
                    name="create-member-status"
                    onChange={(status) =>
                      setCreateForm((value) => ({
                        ...value,
                        status,
                      }))
                    }
                    options={[
                      { label: STATUS_LABELS.ACTIVE, value: "ACTIVE" },
                      { label: STATUS_LABELS.DISABLED, value: "DISABLED" },
                    ]}
                    value={createForm.status}
                  />
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
                <AdminFormField
                  className="mt-4"
                  error={createFormErrors.disabledReason}
                  label="停用原因"
                  required={createForm.status === "DISABLED"}
                >
                  {(invalid) => (
                  <textarea
                    aria-invalid={invalid}
                    className="min-h-20 resize-y rounded-xl border border-[#dbe6dc] p-3 outline-none focus:border-[#1f8f4f]"
                    disabled={createForm.status === "ACTIVE"}
                    onChange={(event) =>
                      setCreateForm((value) => ({
                        ...value,
                        disabledReason: event.target.value,
                      }))
                    }
                    onFocus={() =>
                      setCreateFormErrors((value) => ({
                        ...value,
                        disabledReason: undefined,
                      }))
                    }
                    placeholder={
                      createForm.status === "DISABLED" ? "请输入停用原因" : ""
                    }
                    required={createForm.status === "DISABLED"}
                    value={createForm.disabledReason}
                  />
                  )}
                </AdminFormField>
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
                disabled={saving}
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
            data-admin-modal-shell
            data-fullscreen={fullscreen ? "true" : "false"}
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
            data-admin-modal-shell
            data-fullscreen={fullscreen ? "true" : "false"}
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
              data-admin-modal-drag-handle
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

            <div className="flex-1 overflow-auto p-5">
              <div className="space-y-4">
                <section className="rounded-xl border border-[#dbe6dc] p-3">
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
                  <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <AdminFormField label="会员昵称">
                      {() => (
                        <input
                          className="h-10 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                          maxLength={32}
                          onChange={(event) =>
                            setForm((value) =>
                              value
                                ? { ...value, nickname: event.target.value }
                                : value,
                            )
                          }
                          placeholder="未填写时显示微信用户"
                          readOnly={modalMode === "detail"}
                          value={form.nickname}
                        />
                      )}
                    </AdminFormField>
                  </div>
                  <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
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

                <section className="rounded-xl border border-[#dbe6dc] p-3">
                  <h3 className="font-semibold">默认地址</h3>
                  <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <AdminFormField
                      error={formErrors.defaultAddress?.receiverName}
                      label="收货人"
                      required
                    >
                      {(invalid) => (
                      <input
                        aria-invalid={invalid}
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
                      )}
                    </AdminFormField>
                    <AdminFormField
                      error={formErrors.defaultAddress?.receiverPhone}
                      label="联系电话"
                      required
                    >
                      {(invalid) => (
                      <input
                        aria-invalid={invalid}
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
                      )}
                    </AdminFormField>
                    <AddressRegionCascader
                      errors={formErrors.defaultAddress}
                      onChange={(region) =>
                        setForm((value) =>
                          value
                            ? {
                                ...value,
                                defaultAddress: {
                                  ...value.defaultAddress,
                                  ...region,
                                },
                              }
                            : value,
                        )
                      }
                      readOnly={modalMode === "detail"}
                      required
                      value={form.defaultAddress}
                    />
                    <AdminFormField
                      className="lg:col-span-2"
                      error={formErrors.defaultAddress?.detail}
                      label="详细地址"
                      required
                    >
                      {(invalid) => (
                      <input
                        aria-invalid={invalid}
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
                      )}
                    </AdminFormField>
                  </div>
                </section>

                <section className="rounded-xl border border-[#dbe6dc] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">套餐与订单</h3>
                    <div className="text-xs text-[#66756d]">
                      套餐 {modalMember.packages?.length ?? modalMember.activePackageCount} 个
                      <span className="mx-2 text-[#c8d6cc]">/</span>
                      订单 {modalMember.orderCount} 单
                      {modalMember.recentOrders?.length ? (
                        <span className="ml-1">
                          （最近 {modalMember.recentOrders.length} 条）
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 xl:grid-cols-2">
                    <div className="rounded-xl border border-[#edf2ed] bg-[#fbfdf9]">
                      <div className="flex items-center justify-between gap-2 border-b border-[#edf2ed] px-3 py-2 text-sm">
                        <div>
                          <span className="font-semibold">套餐明细</span>
                          <span className="ml-2 text-xs text-[#66756d]">
                            最近 {Math.min(modalMember.packages?.length ?? 0, MEMBER_DETAIL_PREVIEW_LIMIT)} / {modalMember.packages?.length ?? 0} 个
                          </span>
                        </div>
                        <Button asChild size="xs" variant="outline">
                          <a
                            href={buildMemberRelatedHref(
                              "user-packages",
                              modalMember,
                              store?.id,
                            )}
                          >
                            <Eye size={14} />
                            查看套餐
                          </a>
                        </Button>
                      </div>
                      <div>
                        {modalMember.packages?.length ? (
                          modalMember.packages.slice(0, MEMBER_DETAIL_PREVIEW_LIMIT).map((userPackage) => (
                            <div
                              className="grid grid-cols-[minmax(0,1.4fr)_auto_auto] items-center gap-3 border-b border-[#edf2ed] px-3 py-2 text-sm last:border-b-0"
                              key={userPackage.id}
                            >
                              <div className="min-w-0">
                                <AdminOverflowText
                                  className="font-medium"
                                  content={userPackage.nameSnapshot}
                                >
                                  {userPackage.nameSnapshot}
                                </AdminOverflowText>
                                <div className="mt-0.5 text-xs text-[#66756d]">
                                  {formatJin(userPackage.weightLimitJin)}斤/次
                                  {userPackage.createdAt ? (
                                    <>
                                      <span className="mx-1 text-[#c8d6cc]">·</span>
                                      {formatDateOnly(userPackage.createdAt)}
                                    </>
                                  ) : null}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">
                                  {userPackage.remainingTimes}/
                                  {userPackage.totalTimes} 次
                                </div>
                                <div className="mt-0.5 text-xs text-[#66756d]">
                                  已用 {userPackage.usedTimes} 次
                                </div>
                              </div>
                              <span className="rounded-full bg-[#e8f6ed] px-2 py-1 text-xs font-semibold text-[#1f8f4f]">
                                {formatPackageStatus(userPackage.status)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-4 text-sm text-[#66756d]">
                            暂无套餐
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#edf2ed] bg-[#fbfdf9]">
                      <div className="flex items-center justify-between gap-2 border-b border-[#edf2ed] px-3 py-2 text-sm">
                        <div>
                          <span className="font-semibold">最近订单</span>
                          <span className="ml-2 text-xs text-[#66756d]">
                            最近 {Math.min(modalMember.recentOrders?.length ?? 0, MEMBER_DETAIL_PREVIEW_LIMIT)} / 共 {modalMember.orderCount} 单
                          </span>
                        </div>
                        <Button asChild size="xs" variant="outline">
                          <a
                            href={buildMemberRelatedHref(
                              "orders",
                              modalMember,
                              store?.id,
                            )}
                          >
                            <Eye size={14} />
                            查看订单
                          </a>
                        </Button>
                      </div>
                      <div>
                        {modalMember.recentOrders?.length ? (
                          modalMember.recentOrders.slice(0, MEMBER_DETAIL_PREVIEW_LIMIT).map((order) => (
                            <div
                              className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-[#edf2ed] px-3 py-2 text-sm last:border-b-0"
                              key={order.id}
                            >
                              <div className="min-w-0">
                                <div className="flex min-w-0 items-center gap-2">
                                  <AdminOverflowText
                                    className="font-medium"
                                    content={order.orderNo}
                                  >
                                    {order.orderNo}
                                  </AdminOverflowText>
                                  <span className="shrink-0 rounded-full bg-[#fff7e0] px-2 py-0.5 text-xs font-semibold text-[#9b6b00]">
                                    {formatOrderStatus(order.status)}
                                  </span>
                                </div>
                                <AdminOverflowText
                                  className="mt-1 text-xs text-[#66756d]"
                                  content={
                                    order.items.length
                                      ? order.items
                                          .map(
                                            (item) =>
                                              `${item.dishNameSnapshot} ${formatJin(item.weightJin)}斤`,
                                          )
                                          .join("、")
                                      : "无菜品明细"
                                  }
                                >
                                  {order.items.length
                                    ? order.items
                                        .map(
                                          (item) =>
                                            `${item.dishNameSnapshot} ${formatJin(item.weightJin)}斤`,
                                        )
                                        .join("、")
                                    : "无菜品明细"}
                                </AdminOverflowText>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">
                                  {formatJin(order.totalWeightJin)}斤
                                </div>
                                <div className="mt-0.5 text-xs text-[#66756d]">
                                  {formatDateTimeMinute(order.createdAt, "未记录")}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-4 text-sm text-[#66756d]">
                            暂无订单
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
                <section className="rounded-xl border border-[#cfe3d3] bg-[#f8fff8] p-3">
                  <h3 className="font-semibold">
                    <RequiredLabel>服务状态</RequiredLabel>
                  </h3>
                  <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <div className="mb-2 font-medium text-[#405248]">状态</div>
                      <AdminRadioGroup
                        disabled={modalMode === "detail"}
                        name="member-status"
                        onChange={(status) =>
                          setForm((value) =>
                            value ? { ...value, status } : value,
                          )
                        }
                        options={[
                          { label: STATUS_LABELS.ACTIVE, value: "ACTIVE" },
                          { label: STATUS_LABELS.DISABLED, value: "DISABLED" },
                        ]}
                        value={form.status}
                      />
                    </div>
                    <label className="flex flex-col gap-2 font-medium">
                      会员备注
                      <textarea
                        className="min-h-20 resize-y rounded-xl border border-[#dbe6dc] p-3 outline-none focus:border-[#1f8f4f]"
                        onChange={(event) =>
                          setForm((value) =>
                            value ? { ...value, remark: event.target.value } : value,
                          )
                        }
                        readOnly={modalMode === "detail"}
                        value={form.remark}
                      />
                    </label>
                    <AdminFormField
                      error={formErrors.disabledReason}
                      label="停用原因"
                      required={form.status === "DISABLED"}
                    >
                      {(invalid) => (
                      <textarea
                        aria-invalid={invalid}
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
                      )}
                    </AdminFormField>
                  </div>
                </section>
              </div>
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
              {canWrite && modalMode !== "detail" ? (
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
      {deleteCandidate ? (
        <AdminConfirmDialog
          busy={saving}
          confirmLabel="删除"
          message={
            <>
              删除后该会员将从默认会员列表隐藏，历史订单、套餐和操作日志仍会保留。确认删除
              「{deleteCandidate.nickname ?? deleteCandidate.phone ?? "未命名会员"}」吗？
            </>
          }
          onCancel={() => {
            if (!saving) {
              setDeleteCandidate(null);
            }
          }}
          onConfirm={() => void submitDeleteMember()}
          title="删除会员"
          variant="danger"
        />
      ) : null}
      {error && !modalMember ? (
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
