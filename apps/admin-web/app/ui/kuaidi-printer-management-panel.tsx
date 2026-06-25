"use client";

import {
  Eye,
  Maximize2,
  Minimize2,
  Pencil,
  Plus,
  Printer,
  Trash2,
  X,
} from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  AdminPagination,
  normalizeAdminListPayload,
  type AdminPaginationMeta,
} from "./admin-pagination";
import { AdminAlertDialog, AdminConfirmDialog } from "./admin-confirm-dialog";
import { canCloseAdminModal } from "./admin-modal-close-guard";
import { hasAdminFormChanges } from "./admin-form-dirty";
import { formatDateTimeSecond } from "./date-format";
import { RequiredLabel } from "./required-mark";

type StoreOption = {
  id: string;
  name: string;
};

type PrinterStatus = "ACTIVE" | "DISABLED";

export type KuaidiPrinterPanelItem = {
  apiKey: string | null;
  apiSecret: string | null;
  code: string | null;
  createdAt: string;
  expType: string | null;
  id: string;
  isDefault: boolean;
  kuaidicom: string | null;
  name: string;
  partnerId: string | null;
  partnerKey: string | null;
  payType: string | null;
  remark: string | null;
  requestParams: Record<string, unknown>;
  senderCompany: string | null;
  siid: string;
  sortOrder: number;
  status: PrinterStatus;
  storeId: string;
  tempId: string | null;
  updatedAt: string;
};

type KuaidiPrinterManagementPanelProps = {
  initialItems: KuaidiPrinterPanelItem[];
  initialPagination: AdminPaginationMeta;
  initialSummary: {
    active: number;
    defaults: number;
    disabled: number;
    total: number;
  };
  store: StoreOption | null;
};

type ModalState =
  | { item: null; mode: "create" }
  | { item: KuaidiPrinterPanelItem; mode: "detail" | "edit" };

type FormState = {
  apiKey: string;
  apiSecret: string;
  code: string;
  expType: string;
  isDefault: boolean;
  kuaidicom: string;
  name: string;
  partnerId: string;
  partnerKey: string;
  payType: string;
  remark: string;
  requestParamsText: string;
  senderCompany: string;
  siid: string;
  sortOrder: string;
  status: PrinterStatus;
  tempId: string;
};

const STATUS_LABELS: Record<PrinterStatus, string> = {
  ACTIVE: "启用",
  DISABLED: "停用",
};

function emptyForm(): FormState {
  return {
    apiKey: "",
    apiSecret: "",
    code: "",
    expType: "顺丰标快",
    isDefault: false,
    kuaidicom: "shunfeng",
    name: "",
    partnerId: "",
    partnerKey: "",
    payType: "SHIPPER",
    remark: "",
    requestParamsText: "{}",
    senderCompany: "",
    siid: "",
    sortOrder: "0",
    status: "ACTIVE",
    tempId: "",
  };
}

function buildForm(item: KuaidiPrinterPanelItem | null): FormState {
  if (!item) {
    return emptyForm();
  }

  return {
    apiKey: item.apiKey ?? "",
    apiSecret: item.apiSecret ?? "",
    code: item.code ?? "",
    expType: item.expType ?? "",
    isDefault: item.isDefault,
    kuaidicom: item.kuaidicom ?? "",
    name: item.name,
    partnerId: item.partnerId ?? "",
    partnerKey: item.partnerKey ?? "",
    payType: item.payType ?? "",
    remark: item.remark ?? "",
    requestParamsText: JSON.stringify(item.requestParams ?? {}, null, 2),
    senderCompany: item.senderCompany ?? "",
    siid: item.siid,
    sortOrder: String(item.sortOrder ?? 0),
    status: item.status,
    tempId: item.tempId ?? "",
  };
}

function nullable(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseRequestParams(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }
  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("请求参数必须是 JSON 对象");
  }
  return parsed as Record<string, unknown>;
}

function validateForm(form: FormState) {
  if (!form.name.trim()) {
    return "请输入打印机名称";
  }
  if (!form.siid.trim()) {
    return "请输入快递100打印机 siid";
  }
  try {
    parseRequestParams(form.requestParamsText);
  } catch (caught) {
    return caught instanceof Error ? caught.message : "请求参数 JSON 格式不正确";
  }
  return null;
}

function nowIso() {
  return new Date().toISOString();
}

export function KuaidiPrinterManagementPanel({
  initialItems,
  initialPagination,
  initialSummary,
  store,
}: KuaidiPrinterManagementPanelProps) {
  const [items, setItems] = useState(initialItems);
  const [pagination, setPagination] = useState(initialPagination);
  const [summary, setSummary] = useState(initialSummary);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [initialForm, setInitialForm] = useState<FormState>(emptyForm);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PrinterStatus | "ALL">("ALL");
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] =
    useState<KuaidiPrinterPanelItem | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
  } | null>(null);

  async function reloadPrinters(
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
    if (filters.query.trim()) {
      params.set("query", filters.query.trim());
    }
    if (filters.statusFilter !== "ALL") {
      params.set("status", filters.statusFilter);
    }

    setLoadingList(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/kuaidi-printers?${params.toString()}`);
      const result = (await response.json()) as {
        data?: {
          items: KuaidiPrinterPanelItem[];
          pagination: AdminPaginationMeta;
          summary: typeof initialSummary;
        };
        error?: { message: string };
        success: boolean;
      };
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error?.message ?? "加载打印机失败");
      }
      const next = normalizeAdminListPayload(
        result.data,
        initialSummary,
        pagination.pageSize,
      );
      setItems(next.items);
      setPagination(next.pagination);
      setSummary(next.summary);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "加载打印机失败");
    } finally {
      setLoadingList(false);
    }
  }

  function resetModalPosition() {
    setFullscreen(false);
    setOffset({ x: 0, y: 0 });
    setError(null);
  }

  function openModal(item: KuaidiPrinterPanelItem | null, mode: ModalState["mode"]) {
    const nextForm = buildForm(item);
    setModal(item ? { item, mode: mode as "detail" | "edit" } : { item: null, mode: "create" });
    setForm(nextForm);
    setInitialForm(nextForm);
    resetModalPosition();
  }

  function closeModal() {
    if (saving) {
      return;
    }
    if (
      modal &&
      modal.mode !== "detail" &&
      !canCloseAdminModal({
        hasUnsavedChanges: hasAdminFormChanges({ current: form, initial: initialForm }),
      })
    ) {
      return;
    }
    setModal(null);
    setError(null);
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
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
    if (!modal || modal.mode === "detail" || !store) {
      return;
    }
    const validation = validateForm(form);
    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        apiKey: nullable(form.apiKey),
        apiSecret: nullable(form.apiSecret),
        code: nullable(form.code),
        expType: nullable(form.expType),
        isDefault: form.isDefault,
        kuaidicom: nullable(form.kuaidicom),
        name: form.name.trim(),
        partnerId: nullable(form.partnerId),
        partnerKey: nullable(form.partnerKey),
        payType: nullable(form.payType),
        remark: nullable(form.remark),
        requestParams: parseRequestParams(form.requestParamsText),
        senderCompany: nullable(form.senderCompany),
        siid: form.siid.trim(),
        sortOrder: Number(form.sortOrder || 0),
        status: form.status,
        storeId: store.id,
        tempId: nullable(form.tempId),
      };
      const response = await fetch(
        modal.mode === "create"
          ? "/api/admin/kuaidi-printers"
          : `/api/admin/kuaidi-printers/${modal.item.id}`,
        {
          body: JSON.stringify(payload),
          headers: { "content-type": "application/json" },
          method: modal.mode === "create" ? "POST" : "PATCH",
        },
      );
      const result = (await response.json()) as {
        data?: { printer: Partial<KuaidiPrinterPanelItem> };
        error?: { message: string };
        success: boolean;
      };
      if (!response.ok || !result.success || !result.data?.printer) {
        throw new Error(result.error?.message ?? "保存打印机失败");
      }
      const printer = result.data.printer;
      const nextItem: KuaidiPrinterPanelItem = {
        apiKey: printer.apiKey ?? payload.apiKey,
        apiSecret: printer.apiSecret ?? payload.apiSecret,
        code: printer.code ?? payload.code,
        createdAt: printer.createdAt ?? nowIso(),
        expType: printer.expType ?? payload.expType,
        id: printer.id ?? (modal.item?.id ?? crypto.randomUUID()),
        isDefault: printer.isDefault ?? payload.isDefault,
        kuaidicom: printer.kuaidicom ?? payload.kuaidicom,
        name: printer.name ?? payload.name,
        partnerId: printer.partnerId ?? payload.partnerId,
        partnerKey: printer.partnerKey ?? payload.partnerKey,
        payType: printer.payType ?? payload.payType,
        remark: printer.remark ?? payload.remark,
        requestParams: printer.requestParams ?? payload.requestParams,
        senderCompany: printer.senderCompany ?? payload.senderCompany,
        siid: printer.siid ?? payload.siid,
        sortOrder: printer.sortOrder ?? payload.sortOrder,
        status: (printer.status as PrinterStatus | undefined) ?? payload.status,
        storeId: printer.storeId ?? store.id,
        tempId: printer.tempId ?? payload.tempId,
        updatedAt: printer.updatedAt ?? nowIso(),
      };
      setItems((current) =>
        modal.mode === "create"
          ? [nextItem, ...current]
          : current.map((item) => (item.id === nextItem.id ? nextItem : item)),
      );
      setModal(null);
      await reloadPrinters(1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存打印机失败");
    } finally {
      setSaving(false);
    }
  }

  async function deletePrinter(item: KuaidiPrinterPanelItem) {
    if (!store) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/kuaidi-printers/${item.id}?storeId=${encodeURIComponent(store.id)}`,
        { method: "DELETE" },
      );
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error?.message ?? "删除打印机失败");
      }
      setConfirmDelete(null);
      await reloadPrinters(1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "删除打印机失败");
    } finally {
      setSaving(false);
    }
  }

  const readOnly = modal?.mode === "detail";

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-[#dbe6dc] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#1f8f4f]">
              <Printer className="h-4 w-4" />
              快递100打印机
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">打印机管理</h2>
            <p className="mt-2 text-sm leading-6 text-[#66756d]">
              配置快递100云打印参数，电子面单可按打印机选择生成。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              ["全部", summary.total],
              ["启用", summary.active],
              ["停用", summary.disabled],
              ["默认", summary.defaults],
            ].map(([label, value]) => (
              <div
                className="min-w-16 rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] px-4 py-3 text-center"
                key={label}
              >
                <div className="text-xs text-[#66756d]">{label}</div>
                <div className="mt-1 text-xl font-semibold">{value}</div>
              </div>
            ))}
            <button
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#1f8f4f] px-5 text-sm font-semibold text-white disabled:opacity-60"
              disabled={!store}
              onClick={() => openModal(null, "create")}
              type="button"
            >
              <Plus className="h-4 w-4" />
              新建打印机
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 rounded-2xl border border-[#dbe6dc] bg-[#f8fbf7] p-3 lg:grid-cols-[1fr_220px_auto_auto]">
          <input
            className="h-10 rounded-xl border border-[#dbe6dc] bg-white px-3 text-sm outline-none focus:border-[#1f8f4f]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="打印机名称 / siid / 快递公司"
            value={query}
          />
          <Select
            onValueChange={(value) => setStatusFilter(value as PrinterStatus | "ALL")}
            value={statusFilter}
          >
            <SelectTrigger className="h-10 w-full rounded-xl border-[#dbe6dc] bg-white text-sm">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>状态</SelectLabel>
                <SelectItem value="ALL">全部状态</SelectItem>
                <SelectItem value="ACTIVE">启用</SelectItem>
                <SelectItem value="DISABLED">停用</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <button
            className="h-10 rounded-xl bg-[#1f8f4f] px-5 text-sm font-semibold text-white disabled:opacity-60"
            disabled={loadingList}
            onClick={() => void reloadPrinters(1)}
            type="button"
          >
            查询
          </button>
          <button
            className="h-10 rounded-xl border border-[#dbe6dc] bg-white px-5 text-sm font-semibold text-[#405248]"
            onClick={() => {
              setQuery("");
              setStatusFilter("ALL");
              void reloadPrinters(1, { query: "", statusFilter: "ALL" });
            }}
            type="button"
          >
            重置
          </button>
        </div>
      </div>

      {error && !modal ? (
        <AdminAlertDialog message={error} onClose={() => setError(null)} />
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="bg-[#f3f7f1] text-[#66756d]">
              <tr>
                <th className="px-5 py-3 font-medium">打印机</th>
                <th className="px-5 py-3 font-medium">快递公司</th>
                <th className="px-5 py-3 font-medium">siid</th>
                <th className="px-5 py-3 font-medium">模板</th>
                <th className="px-5 py-3 font-medium">状态</th>
                <th className="px-5 py-3 font-medium">更新时间</th>
                <th className="px-5 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ed]">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-[#102017]">{item.name}</div>
                    <div className="mt-1 text-xs text-[#66756d]">
                      {item.isDefault ? "默认打印机" : `排序 ${item.sortOrder}`}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[#405248]">
                    {item.kuaidicom || "继承默认"}
                  </td>
                  <td className="px-5 py-4 text-[#405248]">{item.siid}</td>
                  <td className="px-5 py-4 text-[#405248]">
                    {item.tempId || "继承默认"}
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-[#e8f6ed] px-3 py-1 text-xs font-semibold text-[#1f8f4f]">
                      {STATUS_LABELS[item.status] ?? item.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[#405248]">
                    {formatDateTimeSecond(item.updatedAt)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        className="grid h-9 w-9 place-items-center rounded-xl border border-[#cfe3d3] text-[#1f8f4f]"
                        onClick={() => openModal(item, "detail")}
                        title="查看打印机"
                        type="button"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        className="grid h-9 w-9 place-items-center rounded-xl border border-[#cfe3d3] text-[#1f8f4f]"
                        onClick={() => openModal(item, "edit")}
                        title="编辑打印机"
                        type="button"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="grid h-9 w-9 place-items-center rounded-xl border border-red-100 bg-red-50 text-red-600"
                        onClick={() => setConfirmDelete(item)}
                        title="删除打印机"
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-[#66756d]" colSpan={7}>
                    {loadingList ? "打印机加载中" : "暂无打印机配置"}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <AdminPagination pagination={pagination} onPageChange={(page) => reloadPrinters(page)} />
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07140c]/35 p-5">
          <div
            className={[
              "flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-2xl shadow-[#0f2418]/20",
              fullscreen ? "h-[calc(100vh-40px)] max-w-none" : "max-w-4xl",
            ].join(" ")}
            style={
              fullscreen
                ? undefined
                : { transform: `translate(${offset.x}px, ${offset.y}px)` }
            }
          >
            <div
              className="flex cursor-move items-start justify-between gap-4 border-b border-[#dbe6dc] px-6 py-5"
              onPointerDown={handleHeaderPointerDown}
              onPointerMove={handleHeaderPointerMove}
              onPointerUp={handleHeaderPointerUp}
            >
              <div>
                <h3 className="text-lg font-semibold">
                  {modal.mode === "create"
                    ? "新建打印机"
                    : `${modal.mode === "detail" ? "详情" : "编辑"} · ${modal.item.name}`}
                </h3>
                <div className="mt-1 text-sm text-[#66756d]">快递100云打印参数</div>
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

            <div className="flex-1 overflow-auto p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  <RequiredLabel>打印机名称</RequiredLabel>
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    onChange={(event) => updateForm("name", event.target.value)}
                    readOnly={readOnly}
                    value={form.name}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  <RequiredLabel>siid</RequiredLabel>
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    onChange={(event) => updateForm("siid", event.target.value)}
                    readOnly={readOnly}
                    value={form.siid}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  快递公司编码
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    onChange={(event) => updateForm("kuaidicom", event.target.value)}
                    readOnly={readOnly}
                    value={form.kuaidicom}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  模板 ID
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    onChange={(event) => updateForm("tempId", event.target.value)}
                    readOnly={readOnly}
                    value={form.tempId}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  授权 key
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    onChange={(event) => updateForm("apiKey", event.target.value)}
                    readOnly={readOnly}
                    value={form.apiKey}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  授权 secret
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    onChange={(event) => updateForm("apiSecret", event.target.value)}
                    readOnly={readOnly}
                    value={form.apiSecret}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  电子面单账号
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    onChange={(event) => updateForm("partnerId", event.target.value)}
                    readOnly={readOnly}
                    value={form.partnerId}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  电子面单密码
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    onChange={(event) => updateForm("partnerKey", event.target.value)}
                    readOnly={readOnly}
                    value={form.partnerKey}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  月结卡号 code
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    onChange={(event) => updateForm("code", event.target.value)}
                    readOnly={readOnly}
                    value={form.code}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  产品类型
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    onChange={(event) => updateForm("expType", event.target.value)}
                    readOnly={readOnly}
                    value={form.expType}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  付款方式
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    onChange={(event) => updateForm("payType", event.target.value)}
                    readOnly={readOnly}
                    value={form.payType}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  寄件公司
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    onChange={(event) => updateForm("senderCompany", event.target.value)}
                    readOnly={readOnly}
                    value={form.senderCompany}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  排序
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                    onChange={(event) => updateForm("sortOrder", event.target.value.replace(/\D/g, ""))}
                    readOnly={readOnly}
                    value={form.sortOrder}
                  />
                </label>
                <div className="flex flex-col gap-2 text-sm font-medium">
                  状态
                  <div className="grid h-11 grid-cols-2 gap-2 rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] p-1">
                    {(["ACTIVE", "DISABLED"] as const).map((status) => (
                      <button
                        className={[
                          "rounded-lg text-sm font-semibold transition",
                          form.status === status
                            ? "bg-white text-[#1f8f4f] shadow-sm"
                            : "text-[#66756d] hover:bg-white/70",
                        ].join(" ")}
                        disabled={readOnly}
                        key={status}
                        onClick={() => updateForm("status", status)}
                        type="button"
                      >
                        {STATUS_LABELS[status]}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="inline-flex items-center gap-3 rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] px-4 py-3 text-sm font-medium">
                  <input
                    checked={form.isDefault}
                    className="h-4 w-4 accent-[#1f8f4f]"
                    disabled={readOnly}
                    onChange={(event) => updateForm("isDefault", event.target.checked)}
                    type="checkbox"
                  />
                  设为默认打印机
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
                  额外请求参数 JSON
                  <textarea
                    className="min-h-32 rounded-xl border border-[#dbe6dc] px-3 py-3 font-mono text-sm outline-none focus:border-[#1f8f4f]"
                    onChange={(event) => updateForm("requestParamsText", event.target.value)}
                    readOnly={readOnly}
                    value={form.requestParamsText}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
                  备注
                  <textarea
                    className="min-h-24 rounded-xl border border-[#dbe6dc] px-3 py-3 outline-none focus:border-[#1f8f4f]"
                    onChange={(event) => updateForm("remark", event.target.value)}
                    readOnly={readOnly}
                    value={form.remark}
                  />
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
                className="h-11 rounded-xl border border-[#dbe6dc] px-6 text-sm font-semibold text-[#405248]"
                disabled={saving}
                onClick={closeModal}
                type="button"
              >
                {modal.mode === "detail" ? "关闭" : "取消"}
              </button>
              {modal.mode !== "detail" ? (
                <button
                  className="h-11 rounded-xl bg-[#1f8f4f] px-6 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={saving}
                  onClick={() => void submitModal()}
                  type="button"
                >
                  {saving ? "保存中" : "保存"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {confirmDelete ? (
        <AdminConfirmDialog
          busy={saving}
          confirmLabel="删除"
          message={`删除后订单页不会再展示“${confirmDelete.name}”。`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => void deletePrinter(confirmDelete)}
          title="删除打印机"
          variant="danger"
        />
      ) : null}
    </section>
  );
}
