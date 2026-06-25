"use client";

import {
  CloudUpload,
  Maximize2,
  Minimize2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";

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
import { canCloseAdminModal } from "./admin-modal-close-guard";
import {
  buildOrderFormState,
  hasUnsavedOrderModalChanges,
  type OrderFormState,
  type OrderModalMode,
} from "./order-modal-state";
import { AdminAlertDialog } from "./admin-confirm-dialog";
import { AdminDatePicker } from "./admin-date-time-picker";
import { formatDateTimeSecond } from "./date-format";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminMemberAvatar } from "./admin-member-avatar";
import { RequiredLabel } from "./required-mark";

type StoreOption = {
  id: string;
  name: string;
};

type OrderMemberOption = {
  avatarUrl?: string | null;
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

type OrderCutoffTask = {
  cutoffTime: string;
  endsAt: string;
  id: string;
  name: string;
  startsAt: string;
  status: string;
};

type OrderStatus =
  | "CANCELED"
  | "PENDING_SHIPMENT"
  | "SHIPPED"
  | "SIGNED"
  | "VOIDED";

export type OrderPanelItem = {
  addressSnapshot: Record<string, unknown> | null;
  benefitItems: Array<{
    id: string;
    kind: string;
    nameSnapshot: string;
    quantity: number;
    unitSnapshot: string;
  }>;
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
  shipments: Array<{
    id?: string;
    logisticsNo: string | null;
    packageName: string;
    packageType: string;
    shippedAt?: string | null;
    signedAt?: string | null;
    status?: string | null;
  }>;
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
    avatarUrl?: string | null;
    id: string;
    nickname: string | null;
    phone: string | null;
    status: string;
  } | null;
  userPackage: {
    id: string;
    nameSnapshot: string;
  } | null;
  userVisibleRemark: string | null;
};

type OrderManagementPanelProps = {
  dishOptions: OrderDishOption[];
  initialItems: OrderPanelItem[];
  initialPagination: AdminPaginationMeta;
  initialSummary: OrderSummary;
  memberOptions: OrderMemberOption[];
  orderTasks?: OrderCutoffTask[];
  store: StoreOption | null;
};

type OrderSummary = {
  canceled: number;
  pendingShipment: number;
  shipped: number;
  signed: number;
  total: number;
};

type KuaidiPrinterOption = {
  id: string;
  isDefault: boolean;
  name: string;
  siid: string;
  status: string;
};

type OrderListFilters = {
  dateFrom: string;
  dateTo: string;
  query: string;
  statusFilter: "ALL" | OrderStatus;
};

type ModalState = {
  item: OrderPanelItem | null;
  mode: OrderModalMode;
};

type SpringOrderListItem = Partial<OrderPanelItem> & {
  packageName?: string | null;
  userAvatarUrl?: string | null;
  userNickname?: string | null;
  userPhone?: string | null;
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  CANCELED: "已取消",
  PENDING_SHIPMENT: "待配送",
  SHIPPED: "已发货",
  SIGNED: "已签收",
  VOIDED: "已作废",
};

const STATUS_FILTERS: Array<{
  label: string;
  value: "ALL" | OrderStatus;
}> = [
  { label: "全部", value: "ALL" },
  { label: "待配送", value: "PENDING_SHIPMENT" },
  { label: "已发货", value: "SHIPPED" },
  { label: "已签收", value: "SIGNED" },
  { label: "已取消", value: "CANCELED" },
];

function normalizeOrderListItem(
  item: OrderPanelItem | SpringOrderListItem,
  store: StoreOption | null,
): OrderPanelItem {
  const flatItem = item as SpringOrderListItem;
  const createdAt = String(item.createdAt ?? "");
  const logisticsNo = item.logisticsNo ?? null;
  const shipments =
    item.shipments ??
    (logisticsNo
      ? [
          {
            logisticsNo,
            packageName: "蔬菜包裹",
            packageType: "VEGETABLE",
          },
        ]
      : []);

  return {
    addressSnapshot: item.addressSnapshot ?? {},
    benefitItems: item.benefitItems ?? [],
    canceledAt: item.canceledAt ?? null,
    cancelReason: item.cancelReason ?? null,
    createdAt,
    id: item.id ?? "",
    internalRemark: item.internalRemark ?? null,
    items: item.items ?? [],
    logisticsNo,
    modifiedAt: item.modifiedAt ?? null,
    orderNo: item.orderNo ?? "",
    shippedAt: item.shippedAt ?? null,
    shipments,
    signedAt: item.signedAt ?? null,
    status: item.status ?? "PENDING_SHIPMENT",
    store: item.store ?? {
      code: "",
      id: store?.id ?? "",
      name: store?.name ?? "",
    },
    totalWeightJin: Number(item.totalWeightJin ?? 0),
    updatedAt: item.updatedAt ?? createdAt,
    user: item.user ?? {
      avatarUrl: flatItem.userAvatarUrl ?? null,
      id: "",
      nickname: flatItem.userNickname ?? null,
      phone: flatItem.userPhone ?? null,
      status: "ACTIVE",
    },
    userPackage: item.userPackage ?? {
      id: "",
      nameSnapshot: flatItem.packageName ?? "无套餐",
    },
    userVisibleRemark: item.userVisibleRemark ?? null,
  };
}

function displayPhone(phone: string | null | undefined) {
  return phone ?? "未绑定手机号";
}

function textFromSnapshot(
  snapshot: Record<string, unknown> | null | undefined,
  key: string,
  fallback: string | null = "",
) {
  const value = snapshot?.[key];
  return typeof value === "string" ? value : fallback;
}

function addressText(snapshot: Record<string, unknown> | null | undefined) {
  if (!snapshot || typeof snapshot !== "object") {
    return "未记录地址";
  }

  return [
    textFromSnapshot(snapshot, "province"),
    textFromSnapshot(snapshot, "city"),
    textFromSnapshot(snapshot, "district"),
    textFromSnapshot(snapshot, "detail"),
  ]
    .filter(Boolean)
    .join(" ") || "未记录地址";
}

function formatJin(value: number) {
  const rounded = Number(value.toFixed(1));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function pickOrderItemText(order: OrderPanelItem) {
  return [
    ...(order.items ?? []).map((item) => item.dishNameSnapshot),
    ...(order.benefitItems ?? []).map((benefit) => benefit.nameSnapshot),
  ]
    .filter(Boolean)
    .join(" / ");
}

function formatQuantity(value: number) {
  const rounded = Number(value.toFixed(2));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function logisticsText(order: Pick<OrderPanelItem, "logisticsNo" | "shipments">) {
  const shipments = order.shipments ?? [];

  const shipped = shipments
    .map((shipment) => shipment.logisticsNo?.trim())
    .filter(Boolean);

  if (shipped.length > 0) {
    return shipped.join(" / ");
  }

  return order.logisticsNo ?? "未发货";
}

function hasGeneratedLogistics(order: Pick<OrderPanelItem, "logisticsNo" | "shipments">) {
  return (
    Boolean(order.logisticsNo?.trim()) ||
    (order.shipments ?? []).some((shipment) => Boolean(shipment.logisticsNo?.trim()))
  );
}

function canCreateElectronicWaybill(order: OrderPanelItem) {
  return order.status === "PENDING_SHIPMENT" && !hasGeneratedLogistics(order);
}

function parseTaskDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfLocalDay(date: Date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

function endOfLocalDay(date: Date) {
  const day = new Date(date);
  day.setHours(23, 59, 59, 999);
  return day;
}

function parseCutoffAt(cutoffTime: string, now: Date) {
  const match = cutoffTime.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) {
    return null;
  }

  const cutoffAt = new Date(now);
  cutoffAt.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return cutoffAt;
}

function findTodayCutoffTask(tasks: OrderCutoffTask[], now: Date) {
  const todayStart = startOfLocalDay(now);
  const todayEnd = endOfLocalDay(now);

  return tasks
    .filter((task) => String(task.status).toUpperCase() === "ACTIVE")
    .map((task) => ({
      task,
      endsAt: parseTaskDate(task.endsAt),
      startsAt: parseTaskDate(task.startsAt),
    }))
    .filter((item): item is { task: OrderCutoffTask; startsAt: Date; endsAt: Date } => {
      const startsAt = item.startsAt;
      const endsAt = item.endsAt;

      return (
        startsAt !== null &&
        endsAt !== null &&
        startsAt <= todayEnd &&
        endsAt >= todayStart
      );
    })
    .sort((left, right) => {
      const leftRunning = left.startsAt <= now && left.endsAt >= now;
      const rightRunning = right.startsAt <= now && right.endsAt >= now;

      if (leftRunning !== rightRunning) {
        return leftRunning ? -1 : 1;
      }

      return left.endsAt.getTime() - right.endsAt.getTime();
    })[0]?.task;
}

function buildCutoffDisplay(tasks: OrderCutoffTask[], now: Date) {
  const task = findTodayCutoffTask(tasks, now);
  if (!task) {
    return {
      cutoffText: "未设置",
      detailLines: ["今日无任务"],
      tone: "muted" as const,
    };
  }

  const cutoffAt = parseCutoffAt(task.cutoffTime, now);
  if (!cutoffAt) {
    return {
      cutoffText: "未设置",
      detailLines: ["截单时间异常"],
      tone: "warning" as const,
    };
  }

  if (now >= cutoffAt) {
    return {
      cutoffText: task.cutoffTime,
      detailLines: ["已截单"],
      tone: "danger" as const,
    };
  }

  const remainingMinutes = Math.max(
    0,
    Math.ceil((cutoffAt.getTime() - now.getTime()) / 60_000),
  );
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  return {
    cutoffText: task.cutoffTime,
    detailLines:
      hours > 0 ? [`还有 ${hours}小时`, `${minutes}分`] : [`还有 ${minutes}分`],
    tone: "active" as const,
  };
}

function defaultShipmentsForOrder(order: OrderPanelItem) {
  const safeShipments = order.shipments ?? [];
  const safeBenefits = order.benefitItems ?? [];

  if (safeShipments.length > 0) {
    return safeShipments.map((shipment) => ({
      logisticsNo: shipment.logisticsNo ?? "",
      packageName: shipment.packageName,
      packageType: shipment.packageType,
    }));
  }

  return [
    {
      logisticsNo: order.logisticsNo ?? "",
      packageName: "蔬菜包裹",
      packageType: "VEGETABLE",
    },
    ...safeBenefits.map((benefit) => ({
      logisticsNo: "",
      packageName: `${benefit.nameSnapshot}包裹`,
      packageType: benefit.kind,
    })),
  ];
}

function normalizedFormShipments(shipments: OrderFormState["shipments"]) {
  return shipments.map((shipment, index) => ({
    logisticsNo: shipment.logisticsNo.trim(),
    packageName: shipment.packageName.trim() || `包裹${index + 1}`,
    packageType: shipment.packageType.trim() || "EXTRA",
  }));
}

function nextExtraShipmentName(shipments: OrderFormState["shipments"]) {
  const existingNames = new Set(
    shipments.map((shipment) => shipment.packageName.trim()),
  );

  for (let index = 1; index <= shipments.length + 2; index += 1) {
    const name = `其他包裹${index}`;
    if (!existingNames.has(name)) {
      return name;
    }
  }

  return "其他包裹";
}

export function OrderManagementPanel({
  dishOptions,
  initialItems,
  initialPagination,
  initialSummary,
  memberOptions,
  orderTasks = [],
  store,
}: OrderManagementPanelProps) {
  const [items, setItems] = useState(() =>
    initialItems.map((item) => normalizeOrderListItem(item, store)),
  );
  const [pagination, setPagination] = useState(initialPagination);
  const [summary, setSummary] = useState(initialSummary);
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | OrderStatus>("ALL");
  const [loadingList, setLoadingList] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [form, setForm] = useState<OrderFormState>(
    buildOrderFormState(null, memberOptions),
  );
  const [initialForm, setInitialForm] = useState<OrderFormState>(
    buildOrderFormState(null, memberOptions),
  );
  const [fullscreen, setFullscreen] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [cloudPrinting, setCloudPrinting] = useState(false);
  const [printerOptions, setPrinterOptions] = useState<KuaidiPrinterOption[]>([]);
  const [pendingPrintOrderIds, setPendingPrintOrderIds] = useState<string[]>([]);
  const [printerSelectorOpen, setPrinterSelectorOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const detailRequestRef = useRef(0);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
  } | null>(null);

  function openModal(item: OrderPanelItem | null, mode: OrderModalMode) {
    const nextForm = buildOrderFormState(
      item ? { ...item, shipments: defaultShipmentsForOrder(item) } : null,
      memberOptions,
    );

    detailRequestRef.current += 1;
    setModal({ item, mode });
    setForm(nextForm);
    setInitialForm(nextForm);
    setFullscreen(false);
    setOffset({ x: 0, y: 0 });
    setLoadingDetail(false);
    setError(null);

    if (item) {
      void hydrateOrderDetail(item);
    }
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  function closeModal() {
    if (saving) {
      return;
    }

    if (
      modal &&
      !canCloseAdminModal({
        hasUnsavedChanges: hasUnsavedOrderModalChanges({
          current: form,
          initial: initialForm,
          mode: modal.mode,
        }),
      })
    ) {
      return;
    }

    detailRequestRef.current += 1;
    setModal(null);
    setError(null);
    setLoadingDetail(false);
  }

  async function hydrateOrderDetail(item: OrderPanelItem) {
    if (!store) {
      return;
    }

    const requestId = ++detailRequestRef.current;
    setLoadingDetail(true);

    try {
      const detail = await loadDetailResource<OrderPanelItem>(
        buildStoreScopedDetailPath("orders", item.id, store.id),
        "order",
      );

      if (requestId !== detailRequestRef.current) {
        return;
      }

      setItems((value) => replaceItemById(value, detail));
      setModal((value) =>
        value?.item?.id === detail.id
          ? {
              ...value,
              item: detail,
            }
          : value,
      );
      const nextForm = buildOrderFormState(
        { ...detail, shipments: defaultShipmentsForOrder(detail) },
        memberOptions,
      );
      setForm(nextForm);
      setInitialForm(nextForm);
    } catch (loadError) {
      if (requestId === detailRequestRef.current) {
        setError(
          loadError instanceof Error ? loadError.message : "订单详情加载失败",
        );
      }
    } finally {
      if (requestId === detailRequestRef.current) {
        setLoadingDetail(false);
      }
    }
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

  async function loadOrders(
    nextStatusFilter = statusFilter,
    nextPage = pagination.page,
    nextFilters?: Partial<OrderListFilters>,
  ) {
    if (!store) {
      return;
    }

    const params = new URLSearchParams({ storeId: store.id });
    params.set("page", String(nextPage));
    params.set("pageSize", String(pagination.pageSize));
    const effectiveQuery = nextFilters?.query ?? query;
    const effectiveDateFrom = nextFilters?.dateFrom ?? dateFrom;
    const effectiveDateTo = nextFilters?.dateTo ?? dateTo;
    const effectiveStatusFilter =
      nextFilters?.statusFilter ?? nextStatusFilter;
    const trimmedQuery = effectiveQuery.trim();
    if (trimmedQuery) {
      params.set("query", trimmedQuery);
    }
    if (effectiveDateFrom) {
      params.set("dateFrom", `${effectiveDateFrom}T00:00:00.000+08:00`);
    }
    if (effectiveDateTo) {
      params.set("dateTo", `${effectiveDateTo}T23:59:59.999+08:00`);
    }
    if (effectiveStatusFilter !== "ALL") {
      params.set("status", effectiveStatusFilter);
    }

    setLoadingList(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/admin/orders?${params.toString()}`);
      const result = (await response.json()) as {
        data?: {
          items: OrderPanelItem[];
          pagination: AdminPaginationMeta;
          summary: OrderSummary;
        };
        error?: { message: string };
        success: boolean;
      };

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error?.message ?? "加载订单失败");
      }

      const nextList = normalizeAdminListPayload(
        result.data,
        initialSummary,
        pagination.pageSize,
      );
      const normalizedItems = nextList.items.map((item) =>
        normalizeOrderListItem(item, store),
      );
      setItems(normalizedItems);
      setPagination(nextList.pagination);
      setSummary(nextList.summary);
      setSelectedOrderIds((selected) =>
        selected.filter((orderId) =>
          normalizedItems.some(
            (item) => item.id === orderId && canCreateElectronicWaybill(item),
          ),
        ),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载订单失败");
    } finally {
      setLoadingList(false);
    }
  }

  function applyStatusFilter(nextStatusFilter: "ALL" | OrderStatus) {
    setStatusFilter(nextStatusFilter);
    void loadOrders(nextStatusFilter, 1);
  }

  function resetOrderFilters() {
    setQuery("");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("ALL");
    void loadOrders("ALL", 1, {
      dateFrom: "",
      dateTo: "",
      query: "",
      statusFilter: "ALL",
    });
  }

  function exportOrders() {
    if (!store) {
      return;
    }

    const params = new URLSearchParams({ storeId: store.id });
    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      params.set("query", trimmedQuery);
    }
    if (dateFrom) {
      params.set("dateFrom", `${dateFrom}T00:00:00.000+08:00`);
    }
    if (dateTo) {
      params.set("dateTo", `${dateTo}T23:59:59.999+08:00`);
    }
    if (statusFilter !== "ALL") {
      params.set("status", statusFilter);
    }

    window.location.href = `/api/admin/orders/export?${params.toString()}`;
  }

  function currentPrintOrderIds() {
    return selectedOrderIds;
  }

  async function cloudPrintOrders(orderIds = currentPrintOrderIds()) {
    if (!store) {
      return;
    }

    const ids = [...new Set(orderIds)].filter(Boolean);
    if (!ids.length) {
      setError("请先勾选需要生成电子面单的待配送订单");
      return;
    }

    setError(null);
    setSuccessMessage(null);

    try {
      const printers = await loadActivePrinters();
      if (printers.length > 2) {
        setPrinterOptions(printers);
        setPendingPrintOrderIds(ids);
        setPrinterSelectorOpen(true);
        return;
      }
      const preferredPrinter = printers.find((printer) => printer.isDefault) ?? printers[0];
      await submitCloudPrintOrders(ids, preferredPrinter?.id ?? null);
    } catch (printError) {
      setError(
        printError instanceof Error ? printError.message : "电子面单生成失败",
      );
    }
  }

  async function loadActivePrinters() {
    if (!store) {
      return [];
    }
    const params = new URLSearchParams({
      pageSize: "100",
      status: "ACTIVE",
      storeId: store.id,
    });
    const response = await fetch(`/api/admin/kuaidi-printers?${params.toString()}`);
    const result = (await response.json()) as {
      data?: { items?: KuaidiPrinterOption[] };
      error?: { message: string };
      success: boolean;
    };
    if (!response.ok || !result.success) {
      throw new Error(result.error?.message ?? "加载打印机失败");
    }
    return (result.data?.items ?? []).filter((printer) => printer.status === "ACTIVE");
  }

  async function submitCloudPrintOrders(orderIds: string[], printerId: string | null) {
    if (!store) {
      return;
    }

    setCloudPrinting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/admin/orders/print-labels", {
        body: JSON.stringify({
          orderIds,
          printerId,
          storeId: store.id,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as {
        data?: {
          failureCount: number;
          failures: Array<{ message: string; orderNo: string; packageName: string }>;
          successCount: number;
        };
        error?: { message: string };
        success: boolean;
      };

      if (!response.ok || !result.success) {
        const failureMessage = result.data?.failures
          ?.map((failure) => `${failure.orderNo} ${failure.packageName}：${failure.message}`)
          .join("；");
        throw new Error(
          failureMessage || result.error?.message || "电子面单生成失败",
        );
      }

      if ((result.data?.failureCount ?? 0) > 0) {
        const failureMessage = result.data?.failures
          ?.map((failure) => `${failure.orderNo} ${failure.packageName}：${failure.message}`)
          .join("；");
        throw new Error(failureMessage || "电子面单生成失败");
      }

      const successCount = result.data?.successCount ?? orderIds.length;
      await loadOrders();
      setSelectedOrderIds([]);
      setSuccessMessage(`电子面单生成成功，已处理 ${successCount} 个包裹`);
    } catch (printError) {
      setError(
        printError instanceof Error ? printError.message : "电子面单生成失败",
      );
    } finally {
      setCloudPrinting(false);
    }
  }

  function choosePrinter(printerId: string) {
    const ids = pendingPrintOrderIds;
    setPrinterSelectorOpen(false);
    setPendingPrintOrderIds([]);
    void submitCloudPrintOrders(ids, printerId);
  }

  function toggleOrderSelection(orderId: string, checked: boolean) {
    setSelectedOrderIds((selected) => {
      if (checked) {
        return selected.includes(orderId) ? selected : [...selected, orderId];
      }

      return selected.filter((selectedOrderId) => selectedOrderId !== orderId);
    });
  }

  function toggleAllPrintableOrders(checked: boolean) {
    setSelectedOrderIds(checked ? printableOrderIdsInView : []);
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

  function addShipmentRow() {
    setForm((value) => ({
      ...value,
      shipments: [
        ...value.shipments,
        {
          logisticsNo: "",
          packageName: nextExtraShipmentName(value.shipments),
          packageType: "EXTRA",
        },
      ],
    }));
  }

  function removeShipmentRow(index: number) {
    setForm((value) => {
      const nextShipments = value.shipments.filter(
        (_, itemIndex) => itemIndex !== index,
      );

      return {
        ...value,
        logisticsNo:
          index === 0 ? (nextShipments[0]?.logisticsNo ?? "") : value.logisticsNo,
        shipments: nextShipments,
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
      setInitialForm((value) => ({
        ...value,
        internalRemark: form.internalRemark,
      }));
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

    const shipments = normalizedFormShipments(form.shipments);
    if (shipments.some((shipment) => !shipment.logisticsNo)) {
      setError("请输入每个包裹的运单号");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(`/api/admin/orders/${modal.item.id}/ship`, {
        body: JSON.stringify({
          logisticsNo: shipments[0]?.logisticsNo ?? form.logisticsNo,
          shipments,
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
      setInitialForm((value) => ({
        ...value,
        logisticsNo: shipments[0]?.logisticsNo ?? form.logisticsNo,
        shipments,
      }));
      await loadOrders();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "发货失败");
    } finally {
      setSaving(false);
    }
  }

  async function saveOrderModalChanges() {
    if (!modal?.item || !store) {
      return;
    }

    const shipments = normalizedFormShipments(form.shipments);
    const logisticsNo = shipments[0]?.logisticsNo ?? form.logisticsNo.trim();
    const hasRemarkChange = form.internalRemark !== initialForm.internalRemark;
    const hasLogisticsChange =
      JSON.stringify(shipments) !==
      JSON.stringify(normalizedFormShipments(initialForm.shipments));

    if (!hasRemarkChange && !hasLogisticsChange) {
      closeModal();
      return;
    }

    if (hasLogisticsChange && shipments.some((shipment) => !shipment.logisticsNo)) {
      setError("请输入每个包裹的运单号");
      return;
    }

    if (hasLogisticsChange && modal.item.status !== "PENDING_SHIPMENT") {
      setError("只有待配送订单可以录入运单号");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let shouldReload = false;

      if (hasRemarkChange) {
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
        shouldReload = true;
      }

      if (hasLogisticsChange) {
        const response = await fetch(`/api/admin/orders/${modal.item.id}/ship`, {
          body: JSON.stringify({
            logisticsNo,
            shipments,
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
        shouldReload = true;
      }

      setInitialForm((value) => ({
        ...value,
        internalRemark: form.internalRemark,
        logisticsNo,
        shipments,
      }));

      if (shouldReload) {
        await loadOrders();
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function signCurrentOrder() {
    if (!modal?.item || !store) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/orders/${modal.item.id}/sign`, {
        body: JSON.stringify({
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
        throw new Error(result.error?.message ?? "签收失败");
      }

      patchCurrentOrder(result.data?.order ?? {});
      await loadOrders();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "签收失败");
    } finally {
      setSaving(false);
    }
  }

  async function voidCurrentOrder() {
    if (!modal?.item || !store) {
      return;
    }

    const reason = form.voidReason.trim();
    if (!reason) {
      setError("请输入作废原因");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/orders/${modal.item.id}/void`, {
        body: JSON.stringify({
          reason,
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
        throw new Error(result.error?.message ?? "作废失败");
      }

      patchCurrentOrder(result.data?.order ?? {});
      setModal(null);
      await loadOrders();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "作废失败");
    } finally {
      setSaving(false);
    }
  }

  async function createOrder() {
    if (!store || !selectedCreateMember || !createPackage || !createAddress) {
      setError("请选择具备可用套餐和默认地址的会员");
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

      setModal(null);
      await loadOrders();
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
  const modalIsReadOnly = modal?.mode === "detail";
  const modalCanEditShipment =
    modal?.mode === "edit" && modal.item?.status === "PENDING_SHIPMENT";
  const printableOrderIdsInView = items
    .filter(canCreateElectronicWaybill)
    .map((order) => order.id);
  const selectedPrintableCount = selectedOrderIds.filter((orderId) =>
    printableOrderIdsInView.includes(orderId),
  ).length;
  const allPrintableSelected =
    printableOrderIdsInView.length > 0 &&
    printableOrderIdsInView.every((orderId) => selectedOrderIds.includes(orderId));
  const cutoffDisplay = buildCutoffDisplay(orderTasks, now);
  const cutoffBadgeClass =
    cutoffDisplay.tone === "danger"
      ? "bg-red-50 text-red-700"
      : cutoffDisplay.tone === "muted"
        ? "bg-[#eef4ef] text-[#66756d]"
        : "bg-[#fff1d3] text-[#8a5a00]";
  return (
    <section className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["今日待发货", summary.pendingShipment, "border-l-[#1f8f4f]"],
          ["今日订单", summary.total, "border-l-[#2f5fb3]"],
          ["已发货", summary.shipped, "border-l-[#d29b2d]"],
          ["已签收", summary.signed, "border-l-[#64748b]"],
        ].map(([label, value, accent]) => (
          <div
            className={`rounded-xl border border-[#dbe6dc] border-l-4 ${accent} bg-white px-4 py-4 shadow-sm`}
            key={label}
          >
            <div className="text-sm font-medium text-[#66756d]">{label}</div>
            <div className="mt-2 text-3xl font-semibold text-[#102017]">
              {value}
            </div>
          </div>
        ))}
        <div className="rounded-xl border border-[#dbe6dc] bg-white px-4 py-4 shadow-sm">
          <div className="text-sm font-medium text-[#66756d]">今日截单</div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="text-3xl font-semibold text-[#102017]">
              {cutoffDisplay.cutoffText}
            </div>
            <div
              className={`rounded-full px-3 py-1 text-center text-sm font-semibold leading-5 ${cutoffBadgeClass}`}
            >
              {cutoffDisplay.detailLines.map((line) => (
                <span className="block" key={line}>
                  {line}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-nowrap items-center gap-3 overflow-x-auto rounded-xl border border-[#dbe6dc] bg-white px-6 py-4 shadow-sm">
        <div className="flex min-w-[190px] flex-1 items-center gap-2 rounded-lg border border-[#dbe6dc] bg-[#f8fbf7] px-3">
          <Search size={16} className="shrink-0 text-[#66756d]" />
          <input
            className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void loadOrders(statusFilter, 1);
              }
            }}
            placeholder="订单号 / 手机号 / 菜品"
            value={query}
          />
        </div>
        <AdminDatePicker
          buttonClassName="h-10 w-[140px] shrink-0 bg-[#f8fbf7]"
          onChange={setDateFrom}
          placeholder="开始日期"
          value={dateFrom}
        />
        <AdminDatePicker
          buttonClassName="h-10 w-[140px] shrink-0 bg-[#f8fbf7]"
          onChange={setDateTo}
          placeholder="结束日期"
          value={dateTo}
        />
        <Select
          onValueChange={(value) =>
            applyStatusFilter(value as "ALL" | OrderStatus)
          }
          value={statusFilter}
        >
          <SelectTrigger className="h-10 w-[170px] shrink-0 border-[#dbe6dc] bg-[#f8fbf7]">
            <SelectValue placeholder="订单状态" />
          </SelectTrigger>
          <SelectContent align="start" position="popper">
            <SelectGroup>
              <SelectLabel>订单状态</SelectLabel>
              {STATUS_FILTERS.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <button
          className="h-10 shrink-0 rounded-lg bg-[#1f8f4f] px-5 text-sm font-semibold text-white disabled:opacity-60"
          disabled={loadingList}
          onClick={() => void loadOrders(statusFilter, 1)}
          type="button"
        >
          查询
        </button>
        <button
          className="h-10 shrink-0 rounded-lg border border-[#cfe3d3] bg-white px-5 text-sm font-semibold text-[#1f8f4f] disabled:opacity-60"
          disabled={loadingList}
          onClick={resetOrderFilters}
          type="button"
        >
          重置
        </button>
        <button
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-[#cfe3d3] bg-[#eff8f1] px-4 text-sm font-semibold text-[#1f8f4f] disabled:opacity-60"
          disabled={!store || cloudPrinting || selectedPrintableCount === 0}
          onClick={() => void cloudPrintOrders()}
          title={
            selectedPrintableCount > 0
              ? `为已勾选的 ${selectedPrintableCount} 个订单生成电子面单`
              : "请先勾选待配送且未生成运单的订单"
          }
          type="button"
        >
          <CloudUpload className="h-4 w-4" />
          {cloudPrinting
            ? "生成中"
            : selectedPrintableCount > 0
              ? `电子面单 ${selectedPrintableCount}`
              : "电子面单"}
        </button>
        <button
          className="h-10 shrink-0 rounded-lg border border-[#cfe3d3] bg-white px-4 text-sm font-semibold text-[#1f8f4f] disabled:opacity-60"
          disabled={!store}
          onClick={exportOrders}
          type="button"
        >
          导出
        </button>
      </div>

      {successMessage && !modal ? (
        <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[#dbe6dc] bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold tracking-normal">订单列表</h2>
            <span className="rounded-full bg-[#e8f6ed] px-3 py-1 text-sm font-semibold text-[#1f8f4f]">
              {summary.pendingShipment} 条待处理
            </span>
          </div>
          <button
            className="rounded-lg bg-[#1f8f4f] px-5 py-2 text-sm font-semibold text-white"
            onClick={() => openModal(null, "create")}
            type="button"
          >
            新建订单
          </button>
        </div>
        <div className="overflow-x-auto px-6 pb-5">
          <table className="w-full min-w-[1020px] border-collapse text-left text-sm">
            <thead className="border-b border-[#dbe6dc] text-[#66756d]">
              <tr>
                <th className="w-12 py-3 pr-4 font-medium">
                  <input
                    aria-label="选择当前页可生成电子面单的订单"
                    checked={allPrintableSelected}
                    className="h-4 w-4 rounded border-[#cfe3d3] accent-[#1f8f4f]"
                    disabled={printableOrderIdsInView.length === 0 || cloudPrinting}
                    onChange={(event) => toggleAllPrintableOrders(event.target.checked)}
                    type="checkbox"
                  />
                </th>
                <th className="py-3 pr-4 font-medium">订单号</th>
                <th className="py-3 pr-4 font-medium">会员</th>
                <th className="py-3 pr-4 font-medium">套餐</th>
                <th className="py-3 pr-4 font-medium">重量</th>
                <th className="py-3 pr-4 font-medium">菜品</th>
                <th className="py-3 pr-4 font-medium">物流</th>
                <th className="py-3 pr-4 font-medium">下单</th>
                <th className="py-3 pr-4 font-medium">状态</th>
                <th className="py-3 text-left font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ed]">
              {items.map((order) => {
                const orderCanPrint = canCreateElectronicWaybill(order);
                const orderSelected = selectedOrderIds.includes(order.id);

                return (
                  <tr key={order.id}>
                    <td className="py-4 pr-4">
                      <input
                        aria-label={`选择订单 ${order.orderNo}`}
                        checked={orderSelected}
                        className="h-4 w-4 rounded border-[#cfe3d3] accent-[#1f8f4f] disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={!orderCanPrint || cloudPrinting}
                        onChange={(event) =>
                          toggleOrderSelection(order.id, event.target.checked)
                        }
                        title={
                          orderCanPrint
                            ? "勾选后可批量生成电子面单"
                            : "仅待配送且未生成运单的订单可勾选"
                        }
                        type="checkbox"
                      />
                    </td>
                    <td className="py-4 pr-4 font-semibold text-[#102017]">
                      {order.orderNo}
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <AdminMemberAvatar
                          avatarUrl={order.user?.avatarUrl}
                          name={order.user?.nickname}
                          phone={order.user?.phone}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="truncate font-semibold">
                            {order.user?.nickname ?? "未命名会员"}
                          </div>
                          <div className="mt-1 text-xs text-[#66756d]">
                            {displayPhone(order.user?.phone)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-[#405248]">
                      {order.userPackage?.nameSnapshot ?? "无套餐"}
                    </td>
                    <td className="py-4 pr-4 font-semibold">
                      {formatJin(order.totalWeightJin)}斤
                    </td>
                    <td className="py-4 pr-4 text-[#405248]">
                      <div className="max-w-32 truncate">
                        {pickOrderItemText(order) || "无商品信息"}
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-[#405248]">
                      {logisticsText(order)}
                    </td>
                    <td className="py-4 pr-4 text-[#405248]">
                      {formatDateTimeSecond(order.createdAt)}
                    </td>
                    <td className="py-4 pr-4">
                      <span className="rounded-full bg-[#e8f6ed] px-3 py-1 text-xs font-semibold text-[#1f8f4f]">
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <button
                          className="text-sm font-semibold text-[#1f8f4f] hover:underline"
                          onClick={() => openModal(order, "detail")}
                          title="查看详情"
                          type="button"
                        >
                          详情
                        </button>
                        <button
                          className="text-sm font-semibold text-[#1f8f4f] hover:underline"
                          onClick={() => openModal(order, "edit")}
                          title="编辑备注"
                          type="button"
                        >
                          编辑
                        </button>
                        <button
                          className="text-sm font-semibold text-[#1f8f4f] hover:underline disabled:text-[#9bb6a5] disabled:no-underline"
                          disabled={cloudPrinting || !orderCanPrint}
                          onClick={() => void cloudPrintOrders([order.id])}
                          title={
                            orderCanPrint
                              ? "生成电子面单"
                              : hasGeneratedLogistics(order)
                                ? "该订单已生成运单"
                                : "仅待配送订单可生成电子面单"
                          }
                          type="button"
                        >
                          {hasGeneratedLogistics(order) ? "已生成" : "电子面单"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-[#66756d]" colSpan={10}>
                    {loadingList ? "订单加载中" : "没有符合条件的订单"}
                  </td>
                </tr>
              ) : null}
          </tbody>
        </table>
        <AdminPagination
          disabled={loadingList}
          onPageChange={(nextPage) => void loadOrders(statusFilter, nextPage)}
          pagination={pagination}
        />
        </div>
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 bg-[#0f2418]/35 p-5">
          <div
            aria-modal="true"
            className={[
              "mx-auto flex min-h-[540px] flex-col overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-2xl",
              fullscreen
                ? "h-full w-full"
                : "h-[70vh] w-[820px] max-w-full resize",
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
                <div className="truncate text-lg font-semibold">{modalTitle}</div>
                {loadingDetail ? (
                  <div className="mt-1 text-sm text-[#66756d]">
                    正在加载订单详情
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

            <div
              aria-busy={loadingDetail}
              className={[
                "flex-1 gap-6 overflow-auto p-6",
                modal.item ? "block" : "grid lg:grid-cols-[1fr_280px]",
              ].join(" ")}
            >
              {modal.item ? (
                <div className="space-y-8">
                    <section>
                      <h3 className="text-base font-semibold">基础信息</h3>
                      <div className="mt-6 space-y-4 text-sm leading-6 text-[#405248]">
                        <div className="flex items-center gap-3">
                          <AdminMemberAvatar
                            avatarUrl={modal.item.user?.avatarUrl}
                            name={modal.item.user?.nickname}
                            phone={modal.item.user?.phone}
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-[#102017]">
                              {modal.item.user?.nickname ?? "未命名会员"}
                            </div>
                            <div className="text-[#66756d]">
                              {displayPhone(modal.item.user?.phone)}
                            </div>
                          </div>
                        </div>
                        <div>配送地址：{addressText(modal.item.addressSnapshot)}</div>
                        <div>
                          套餐：{modal.item.userPackage?.nameSnapshot ?? "无套餐"} ·{" "}
                          {STATUS_LABELS[modal.item.status] ?? modal.item.status}
                        </div>
                      </div>
	                    </section>

	                    <section>
	                      <h3 className="text-base font-semibold">菜品明细</h3>
                      <div className="mt-4 rounded-xl border border-[#dbe6dc] px-6 py-5">
                        <div className="flex flex-wrap gap-4">
                          {(modal.item.items ?? []).length === 0 ? (
                            <div className="text-sm text-[#66756d]">无菜品记录</div>
                          ) : null}
                          {(modal.item.items ?? []).map((item) => (
                            <div
                              className="flex min-w-[118px] items-center justify-center gap-4 rounded-lg border border-[#dbe6dc] bg-[#f8fbf7] px-4 py-3 text-sm"
                              key={item.id}
                            >
                              <span className="font-semibold">
                                {item.dishNameSnapshot}
                              </span>
                              <span className="text-[#405248]">
                                {formatJin(item.weightJin)}斤
                              </span>
                            </div>
                          ))}
	                        </div>
	                        <div className="mt-5 border-t border-[#edf2ed] pt-4 text-sm text-[#405248]">
	                          备注：{modal.item.userVisibleRemark || "无备注"}
	                        </div>
	                      </div>
	                      {(modal.item.benefitItems ?? []).length > 0 ? (
	                        <div className="mt-3 rounded-xl border border-[#dbe6dc] bg-[#fffdf5] px-6 py-4">
	                          <div className="text-sm font-semibold">附加权益</div>
	                          <div className="mt-3 flex flex-wrap gap-3">
	                            {(modal.item.benefitItems ?? []).map((benefit) => (
	                              <div
	                                className="rounded-lg border border-[#f1e1b8] bg-white px-4 py-2 text-sm"
	                                key={benefit.id}
	                              >
	                                <span className="font-semibold">
	                                  {benefit.nameSnapshot}
	                                </span>
	                                <span className="ml-3 text-[#6d4b0f]">
	                                  {formatQuantity(benefit.quantity)}
	                                  {benefit.unitSnapshot}
	                                </span>
	                              </div>
	                            ))}
	                          </div>
	                        </div>
	                      ) : null}
	                    </section>

                    <section>
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-base font-semibold">配送处理</h3>
                        {modalCanEditShipment ? (
                          <button
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#cfe3d3] bg-white px-3 text-sm font-semibold text-[#1f8f4f] hover:bg-[#f4fbf5]"
                            disabled={loadingDetail || saving}
                            onClick={addShipmentRow}
                            type="button"
                          >
                            <Plus className="h-4 w-4" />
                            新增包裹
                          </button>
                        ) : null}
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {form.shipments.map((shipment, index) => (
                          <div
                            className="rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] p-3 text-sm"
                            key={`${shipment.packageType}-${index}`}
                          >
                            <div className="mb-3 flex items-start gap-2">
                              <label className="min-w-0 flex-1 font-medium">
                                <span className="mb-2 block text-[#405248]">
                                  {modalCanEditShipment ? (
                                    <RequiredLabel>包裹名称</RequiredLabel>
                                  ) : (
                                    "包裹名称"
                                  )}
                                </span>
                                <input
                                  className="h-10 w-full rounded-lg border border-[#dbe6dc] bg-white px-3 text-sm outline-none focus:border-[#1f8f4f]"
                                  disabled={
                                    loadingDetail ||
                                    !modalCanEditShipment
                                  }
                                  onChange={(event) =>
                                    setForm((value) => ({
                                      ...value,
                                      shipments: value.shipments.map(
                                        (item, itemIndex) =>
                                          itemIndex === index
                                            ? {
                                                ...item,
                                                packageName: event.target.value,
                                              }
                                            : item,
                                      ),
                                    }))
                                  }
                                  placeholder="例如：蔬菜包裹、鸡蛋包裹"
                                  value={shipment.packageName}
                                />
                              </label>
                              {form.shipments.length > 1 &&
                              modalCanEditShipment ? (
                                <button
                                  aria-label={`删除${shipment.packageName || "包裹"}`}
                                  className="mt-7 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-100 bg-white text-red-500 hover:bg-red-50"
                                  disabled={loadingDetail || saving}
                                  onClick={() => removeShipmentRow(index)}
                                  type="button"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              ) : null}
                            </div>
                            <label className="block font-medium">
                              <span className="mb-2 block text-[#405248]">
                                {modalCanEditShipment ? (
                                  <RequiredLabel>运单号</RequiredLabel>
                                ) : (
                                  "运单号"
                                )}
                              </span>
                              <input
                                className="h-11 w-full rounded-lg border border-[#dbe6dc] bg-white px-4 text-sm outline-none focus:border-[#1f8f4f]"
                                disabled={
                                  !modalCanEditShipment
                                }
                                onChange={(event) =>
                                  setForm((value) => ({
                                    ...value,
                                    logisticsNo:
                                      index === 0
                                        ? event.target.value
                                        : value.logisticsNo,
                                    shipments: value.shipments.map(
                                      (item, itemIndex) =>
                                        itemIndex === index
                                          ? {
                                              ...item,
                                              logisticsNo: event.target.value,
                                            }
                                          : item,
                                    ),
                                  }))
                                }
                                placeholder="录入运单号"
                                value={shipment.logisticsNo}
                              />
                            </label>
                          </div>
                        ))}
                      </div>
                      {modal.mode === "edit" ? (
                        <label className="mt-5 flex max-w-xl flex-col gap-2 text-sm font-medium">
                          内部备注
                          <textarea
                            className="min-h-24 resize-y rounded-xl border border-[#dbe6dc] p-3 outline-none focus:border-[#1f8f4f]"
                            disabled={loadingDetail}
                            onChange={(event) =>
                              setForm((value) => ({
                                ...value,
                                internalRemark: event.target.value,
                              }))
                            }
                            value={form.internalRemark}
                          />
                        </label>
                      ) : modal.item.internalRemark ? (
                        <div className="mt-5 rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] p-4 text-sm">
                          <div className="font-semibold text-[#102017]">内部备注</div>
                          <div className="mt-2 whitespace-pre-wrap text-[#405248]">
                            {modal.item.internalRemark}
                          </div>
                        </div>
                      ) : null}
                    </section>
                  </div>
              ) : (
                <>
                  <div className="flex flex-col gap-5">
                    <section className="rounded-xl border border-[#dbe6dc] p-4">
                      <h3 className="font-semibold">会员与套餐</h3>
                      <label className="mt-4 flex flex-col gap-2 text-sm font-medium">
                        <RequiredLabel>会员</RequiredLabel>
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
                              {displayPhone(member.phone)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                        <div className="rounded-xl bg-[#f8fbf7] p-3">
	                          <div className="text-[#66756d]">可用套餐</div>
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
                        <h3 className="font-semibold">
                          <RequiredLabel>选择菜品</RequiredLabel>
                        </h3>
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

            </div>

            <div className="flex justify-end gap-3 border-t border-[#dbe6dc] px-6 py-4">
              {modal.mode === "edit" ? (
                <button
                  className="h-10 rounded-xl bg-[#1f8f4f] px-5 font-semibold text-white disabled:opacity-60"
                  disabled={saving || loadingDetail || !store}
                  onClick={saveOrderModalChanges}
                  type="button"
                >
                  {saving ? "保存中" : "保存"}
                </button>
              ) : null}
              <button
                className="h-10 rounded-xl border border-[#dbe6dc] px-5"
                disabled={saving}
                onClick={closeModal}
                type="button"
              >
                {modalIsReadOnly ? "关闭" : "取消"}
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
      {printerSelectorOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#07140c]/40 p-5">
          <div
            aria-modal="true"
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-2xl shadow-[#0f2418]/20"
            role="dialog"
          >
            <div className="border-b border-[#edf2ed] px-6 py-5">
              <h3 className="text-lg font-semibold text-[#102017]">选择电子面单打印机</h3>
              <div className="mt-2 text-sm leading-6 text-[#66756d]">
                已选择 {pendingPrintOrderIds.length} 个订单，选择打印机后开始生成电子面单。
              </div>
            </div>
            <div className="max-h-[50vh] overflow-auto p-4">
              <div className="grid gap-3">
                {printerOptions.map((printer) => (
                  <button
                    className="flex items-center justify-between gap-4 rounded-2xl border border-[#dbe6dc] bg-[#f8fbf7] px-4 py-4 text-left transition hover:border-[#1f8f4f] hover:bg-[#eff8f1]"
                    disabled={cloudPrinting}
                    key={printer.id}
                    onClick={() => choosePrinter(printer.id)}
                    type="button"
                  >
                    <span>
                      <span className="block font-semibold text-[#102017]">
                        {printer.name}
                      </span>
                      <span className="mt-1 block text-xs text-[#66756d]">
                        siid：{printer.siid}
                      </span>
                    </span>
                    {printer.isDefault ? (
                      <span className="rounded-full bg-[#e8f6ed] px-3 py-1 text-xs font-semibold text-[#1f8f4f]">
                        默认
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-[#edf2ed] px-6 py-4">
              <button
                className="h-10 rounded-xl border border-[#dbe6dc] px-5 text-sm font-semibold text-[#405248]"
                disabled={cloudPrinting}
                onClick={() => {
                  setPrinterSelectorOpen(false);
                  setPendingPrintOrderIds([]);
                }}
                type="button"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {error ? (
        <AdminAlertDialog message={error} onClose={() => setError(null)} />
      ) : null}
    </section>
  );
}
