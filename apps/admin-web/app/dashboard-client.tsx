"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CalendarClock,
  CheckCircle2,
  PackageCheck,
  Sprout,
  Truck,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import {
  buildAdminMenuTree,
  buildAdminNavGroups,
  resolveAdminSection,
  type AdminSectionId,
} from "@/app/lib/admin-navigation";

import { AdminShell } from "./ui/admin-shell";
import { AdminMenuSearch } from "./ui/admin-menu-search";
import { AdminThemeToggle } from "./ui/admin-theme-toggle";
import { AdminUserMenu } from "./ui/admin-user-menu";
import { DeliveryRangePanel } from "./ui/delivery-range-panel";
import { DishManagementPanel, type DishPanelItem } from "./ui/dish-management-panel";
import { MemberManagementPanel, type MemberPanelItem } from "./ui/member-management-panel";
import { MenuManagementPanel } from "./ui/menu-management-panel";
import { OperationLogsPanel, type OperationLogPanelItem } from "./ui/operation-logs-panel";
import { OnlineSessionManagementPanel } from "./ui/online-session-management-panel";
import { OrderManagementPanel, type OrderPanelItem } from "./ui/order-management-panel";
import { PackageManagementPanel, type PackagePanelItem } from "./ui/package-management-panel";
import {
  PackageTemplateManagementPanel,
  type PackageTemplatePanelItem,
} from "./ui/package-template-management-panel";
import {
  KuaidiPrinterManagementPanel,
  type KuaidiPrinterPanelItem,
} from "./ui/kuaidi-printer-management-panel";
import {
  RoleManagementPanel,
  type RolePanelItem,
  type RolePermissionOption,
} from "./ui/role-management-panel";
import { ShipmentStatsPanel } from "./ui/shipment-stats-panel";
import { SystemManagementPanel, type AdminUserPanelItem } from "./ui/system-management-panel";
import {
  SystemDictionaryPanel,
  type SystemDictionaryItem,
  type SystemDictionaryMeta,
} from "./ui/system-dictionary-panel";
import { SystemSettingsPanel, type SystemSettingsPanelItem } from "./ui/system-settings-panel";
import { TaskManagementPanel, type TaskDishOption, type TaskPanelItem } from "./ui/task-management-panel";

const ADMIN_LIST_PAGE_SIZE = 10;
const ADMIN_LOG_PAGE_SIZE = 10;
const ADMIN_OPTION_LIMIT = 200;
const DEFAULT_DATA_STORE = { id: "seed-store-lotus", name: "涵氧" };

type StoreOption = {
  id: string;
  name: string;
};

type AdminSession = {
  adminUserId: string;
  name: string;
  permissionCodes: string[];
  roles: Array<{ name: string }>;
  storeScope: "ALL" | "ASSIGNED" | string;
  stores: StoreOption[];
};

type ListResult<TItem, TSummary = Record<string, number>> = {
  items: TItem[];
  pagination: ReturnType<typeof emptyPagination>;
  summary: TSummary;
};

type SpringListPayload<TItem, TSummary = Record<string, number>> = {
  items?: TItem[];
  page?: number;
  pageSize?: number;
  pagination?: ReturnType<typeof emptyPagination>;
  summary?: TSummary;
  take?: number;
  total?: number;
  totalPages?: number;
};

type SpringWrappedPayload<T> = T | { settings: T };

type DashboardData = {
  activePackages: number;
  activeStore: StoreOption | null;
  adminUserPagination: ReturnType<typeof emptyPagination>;
  adminUserSummary: any;
  adminUsers: AdminUserPanelItem[];
  dishOptions: TaskDishOption[];
  dishPagination: ReturnType<typeof emptyPagination>;
  dishSummary: any;
  dishCategoryOptions: SystemDictionaryItem[];
  dictionaries: SystemDictionaryMeta[];
  dishes: DishPanelItem[];
  memberOptions: MemberPanelItem[];
  members: number;
  menuTree: ReturnType<typeof buildAdminMenuTree>;
  kuaidiPrinterPagination: ReturnType<typeof emptyPagination>;
  kuaidiPrinterSummary: any;
  kuaidiPrinters: KuaidiPrinterPanelItem[];
  operationLogPagination: ReturnType<typeof emptyPagination>;
  operationLogs: OperationLogPanelItem[];
  orders: number;
  packageTemplateOptions: PackageTemplatePanelItem[];
  packageTemplatePagination: ReturnType<typeof emptyPagination>;
  packageTemplateSummary: any;
  packageTemplates: PackageTemplatePanelItem[];
  permissions: RolePermissionOption[];
  rolePagination: ReturnType<typeof emptyPagination>;
  roleRows: RolePanelItem[];
  roleSummary: any;
  roles: Array<{ code: string; id: string; name: string }>;
  storeAccessScope: string;
  storeMemberPagination: ReturnType<typeof emptyPagination>;
  storeMemberSummary: any;
  storeMembers: MemberPanelItem[];
  storeOrderPagination: ReturnType<typeof emptyPagination>;
  storeOrderSummary: any;
  storeOrders: OrderPanelItem[];
  stores: StoreOption[];
  systemSettings: SystemSettingsPanelItem | null;
  taskPagination: ReturnType<typeof emptyPagination>;
  taskSummary: any;
  tasks: TaskPanelItem[];
  activeOrderTasks: TaskPanelItem[];
  userDisplay: {
    name: string;
    roles: string;
  };
  userPackagePagination: ReturnType<typeof emptyPagination>;
  userPackageSummary: any;
  userPackages: PackagePanelItem[];
};

function emptyPagination(pageSize = ADMIN_LIST_PAGE_SIZE) {
  return {
    page: 1,
    pageSize,
    skip: 0,
    take: pageSize,
    total: 0,
    totalPages: 1,
  };
}

function emptyList<TItem, TSummary extends Record<string, number>>(
  summary: TSummary,
  pageSize = ADMIN_LIST_PAGE_SIZE,
): ListResult<TItem, TSummary> {
  return {
    items: [],
    pagination: emptyPagination(pageSize),
    summary,
  };
}

async function readApi<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);

  const response = await fetch(path, {
    credentials: "same-origin",
    signal: controller.signal,
  }).finally(() => window.clearTimeout(timeout));
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error?.message ?? "请求失败");
  }

  return payload.data as T;
}

function normalizeSummary<TItem, TSummary extends Record<string, number>>(
  items: TItem[],
  fallbackSummary: TSummary,
  total: number,
): TSummary {
  const summary: Record<string, number> = {
    ...fallbackSummary,
    total,
  };
  const statusOf = (item: TItem) =>
    String((item as { status?: unknown }).status ?? "").toUpperCase();
  const countStatus = (...statuses: string[]) =>
    items.filter((item) => statuses.includes(statusOf(item))).length;

  if ("active" in summary) summary.active = countStatus("ACTIVE");
  if ("disabled" in summary) summary.disabled = countStatus("DISABLED");
  if ("draft" in summary) summary.draft = countStatus("DRAFT");
  if ("frozen" in summary) summary.frozen = countStatus("FROZEN");
  if ("expired" in summary) summary.expired = countStatus("EXPIRED");
  if ("onSale" in summary) summary.onSale = countStatus("ON_SALE");
  if ("offSale" in summary) summary.offSale = countStatus("OFF_SALE");
  if ("pendingShipment" in summary) {
    summary.pendingShipment = countStatus("PENDING_SHIPMENT");
  }
  if ("shipped" in summary) summary.shipped = countStatus("SHIPPED");
  if ("signed" in summary) summary.signed = countStatus("SIGNED");
  if ("canceled" in summary) {
    summary.canceled = countStatus("CANCELED", "CANCELLED");
  }
  if ("stock" in summary) {
    summary.stock = items.reduce(
      (sum, item) => sum + Number((item as { stockJin?: unknown }).stockJin ?? 0),
      0,
    );
  }
  if ("lowStock" in summary) {
    summary.lowStock = items.filter(
      (item) => Number((item as { stockJin?: unknown }).stockJin ?? 0) <= 10,
    ).length;
  }

  return summary as TSummary;
}

function normalizeListResult<TItem, TSummary extends Record<string, number>>(
  payload: SpringListPayload<TItem, TSummary>,
  fallbackSummary: TSummary,
  pageSize: number,
): ListResult<TItem, TSummary> {
  const items = payload.items ?? [];
  const total = Number(payload.total ?? payload.pagination?.total ?? items.length);
  const normalizedPageSize = Number(
    payload.pageSize ?? payload.pagination?.pageSize ?? payload.take ?? pageSize,
  );

  return {
    items,
    pagination:
      payload.pagination ??
      {
        page: Number(payload.page ?? 1),
        pageSize: normalizedPageSize,
        skip: Math.max(Number(payload.page ?? 1) - 1, 0) * normalizedPageSize,
        take: normalizedPageSize,
        total,
        totalPages: Number(
          payload.totalPages ?? Math.max(Math.ceil(total / normalizedPageSize), 1),
        ),
      },
    summary:
      payload.summary ??
      normalizeSummary(items, fallbackSummary, total),
  };
}

async function readList<TItem, TSummary extends Record<string, number>>(
  path: string,
  fallbackSummary: TSummary,
  pageSize = ADMIN_LIST_PAGE_SIZE,
): Promise<ListResult<TItem, TSummary>> {
  try {
    const payload = await readApi<SpringListPayload<TItem, TSummary>>(path);
    return normalizeListResult(payload, fallbackSummary, pageSize);
  } catch {
    return emptyList<TItem, TSummary>(fallbackSummary, pageSize);
  }
}

function unwrapSystemSettings(
  payload: SpringWrappedPayload<SystemSettingsPanelItem>,
): SystemSettingsPanelItem {
  return "settings" in payload ? payload.settings : payload;
}

function countFromSummary(summary: Record<string, number>) {
  return Number(summary.total ?? summary.active ?? 0);
}

function metricValue(value: unknown) {
  return Number(value ?? 0);
}

function formatMetric(value: number, unit = "") {
  return `${new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value)}${unit}`;
}

function ratioText(value: number, total: number) {
  if (total <= 0) {
    return "0%";
  }
  return `${Math.round((value / total) * 100)}%`;
}

function ratioNumber(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function ringOffset(percent: number, circumference = 126) {
  return circumference - (Math.max(0, Math.min(100, percent)) / 100) * circumference;
}

type OverviewMetric = {
  badge: string;
  description: string;
  icon: LucideIcon;
  label: string;
  miniItems: Array<{
    label: string;
    tone: "amber" | "green" | "muted";
    value: number;
  }>;
  miniLabel: string;
  tone: "green" | "amber" | "blue" | "slate";
  trend: "down" | "up";
  trendText: string;
  value: string;
};

async function loadDashboardData(
  session: AdminSession,
  selectedStoreId?: string | null,
): Promise<DashboardData> {
  const activeStore =
    session.stores.find((store) => store.id === selectedStoreId) ??
    session.stores[0] ??
    DEFAULT_DATA_STORE;
  const storeId = activeStore?.id ?? "";
  const storeParam = storeId ? `storeId=${encodeURIComponent(storeId)}` : "";
  const withStore = (path: string, take = ADMIN_LIST_PAGE_SIZE) => {
    const params = new URLSearchParams();
    if (storeId) {
      params.set("storeId", storeId);
    }
    params.set("take", String(take));
    params.set("pageSize", String(take));
    return `${path}?${params.toString()}`;
  };

  const canManageSystem = session.permissionCodes.includes("system.manage");

  const [
    adminUsers,
    roles,
    permissions,
    storeOrders,
    storeMembers,
    userPackages,
    memberOptions,
    packageTemplates,
    packageTemplateOptions,
    dishes,
    dishOptions,
    tasks,
    activeOrderTasks,
    operationLogs,
    systemSettings,
    dictionaries,
    dishCategoryOptions,
    kuaidiPrinters,
  ] = await Promise.all([
    canManageSystem
      ? readList<AdminUserPanelItem, Record<string, number>>(
          `/api/admin/admin-users?take=${ADMIN_LIST_PAGE_SIZE}`,
          { active: 0, disabled: 0, total: 0 },
        )
      : Promise.resolve(emptyList<AdminUserPanelItem, Record<string, number>>({ active: 0, disabled: 0, total: 0 })),
    canManageSystem
      ? readList<RolePanelItem, Record<string, number>>(
          `/api/admin/roles?take=${ADMIN_OPTION_LIMIT}`,
          { total: 0 },
          ADMIN_OPTION_LIMIT,
        )
      : Promise.resolve(emptyList<RolePanelItem, Record<string, number>>({ total: 0 }, ADMIN_OPTION_LIMIT)),
    canManageSystem
      ? readApi<{ items: RolePermissionOption[] }>("/api/admin/roles/permissions").catch(() => ({ items: [] }))
      : Promise.resolve({ items: [] as RolePermissionOption[] }),
    activeStore
      ? readList<OrderPanelItem, Record<string, number>>(
          withStore("/api/admin/orders"),
          { canceled: 0, pendingShipment: 0, shipped: 0, signed: 0, total: 0 },
        )
      : Promise.resolve(emptyList<OrderPanelItem, Record<string, number>>({ canceled: 0, pendingShipment: 0, shipped: 0, signed: 0, total: 0 })),
    activeStore
      ? readList<MemberPanelItem, Record<string, number>>(
          `${withStore("/api/admin/members")}&status=ACTIVE`,
          { active: 0, disabled: 0, purchaseOrders: 0, total: 0, userPackages: 0 },
        )
      : Promise.resolve(emptyList<MemberPanelItem, Record<string, number>>({ active: 0, disabled: 0, purchaseOrders: 0, total: 0, userPackages: 0 })),
    activeStore
      ? readList<PackagePanelItem, Record<string, number>>(
          withStore("/api/admin/user-packages"),
          { active: 0, expired: 0, frozen: 0, total: 0 },
        )
      : Promise.resolve(emptyList<PackagePanelItem, Record<string, number>>({ active: 0, expired: 0, frozen: 0, total: 0 })),
    activeStore
      ? readList<MemberPanelItem, Record<string, number>>(
          withStore("/api/admin/members", ADMIN_OPTION_LIMIT),
          { active: 0, disabled: 0, total: 0 },
          ADMIN_OPTION_LIMIT,
        )
      : Promise.resolve(emptyList<MemberPanelItem, Record<string, number>>({ active: 0, disabled: 0, total: 0 }, ADMIN_OPTION_LIMIT)),
    activeStore
      ? readList<PackageTemplatePanelItem, Record<string, number>>(
          withStore("/api/admin/package-templates"),
          { active: 0, disabled: 0, purchaseOrders: 0, total: 0, userPackages: 0 },
        )
      : Promise.resolve(emptyList<PackageTemplatePanelItem, Record<string, number>>({ active: 0, disabled: 0, purchaseOrders: 0, total: 0, userPackages: 0 })),
    activeStore
      ? readList<PackageTemplatePanelItem, Record<string, number>>(
          `${withStore("/api/admin/package-templates", ADMIN_OPTION_LIMIT)}&status=ACTIVE`,
          { active: 0, disabled: 0, purchaseOrders: 0, total: 0, userPackages: 0 },
          ADMIN_OPTION_LIMIT,
        )
      : Promise.resolve(emptyList<PackageTemplatePanelItem, Record<string, number>>({ active: 0, disabled: 0, purchaseOrders: 0, total: 0, userPackages: 0 }, ADMIN_OPTION_LIMIT)),
    activeStore
      ? readList<DishPanelItem, Record<string, number>>(
          withStore("/api/admin/dishes"),
          { lowStock: 0, offSale: 0, onSale: 0, stock: 0, total: 0 },
        )
      : Promise.resolve(emptyList<DishPanelItem, Record<string, number>>({ lowStock: 0, offSale: 0, onSale: 0, stock: 0, total: 0 })),
    activeStore
      ? readList<TaskDishOption, Record<string, number>>(
          withStore("/api/admin/dishes", ADMIN_OPTION_LIMIT),
          { lowStock: 0, offSale: 0, onSale: 0, stock: 0, total: 0 },
          ADMIN_OPTION_LIMIT,
        )
      : Promise.resolve(emptyList<TaskDishOption, Record<string, number>>({ lowStock: 0, offSale: 0, onSale: 0, stock: 0, total: 0 }, ADMIN_OPTION_LIMIT)),
    activeStore
      ? readList<TaskPanelItem, Record<string, number>>(
          withStore("/api/admin/tasks"),
          { active: 0, disabled: 0, draft: 0, total: 0 },
        )
      : Promise.resolve(emptyList<TaskPanelItem, Record<string, number>>({ active: 0, disabled: 0, draft: 0, total: 0 })),
    activeStore
      ? readList<TaskPanelItem, Record<string, number>>(
          `${withStore("/api/admin/tasks", ADMIN_OPTION_LIMIT)}&status=ACTIVE`,
          { active: 0, disabled: 0, draft: 0, total: 0 },
          ADMIN_OPTION_LIMIT,
        )
      : Promise.resolve(emptyList<TaskPanelItem, Record<string, number>>({ active: 0, disabled: 0, draft: 0, total: 0 }, ADMIN_OPTION_LIMIT)),
    canManageSystem
      ? readList<OperationLogPanelItem, Record<string, number>>(
          storeParam
            ? `/api/admin/operation-logs?${storeParam}&take=${ADMIN_LOG_PAGE_SIZE}`
            : `/api/admin/operation-logs?take=${ADMIN_LOG_PAGE_SIZE}`,
          { total: 0 },
          ADMIN_LOG_PAGE_SIZE,
        )
      : Promise.resolve(emptyList<OperationLogPanelItem, Record<string, number>>({ total: 0 }, ADMIN_LOG_PAGE_SIZE)),
    canManageSystem && activeStore
      ? readApi<SpringWrappedPayload<SystemSettingsPanelItem>>(
          `/api/admin/system-settings?${storeParam}`,
        )
          .then(unwrapSystemSettings)
          .catch(() => null)
      : Promise.resolve(null),
    activeStore
      ? readApi<{ dictionaries: SystemDictionaryMeta[] }>(
          `/api/admin/dictionaries?${storeParam}`,
        ).catch(() => ({ dictionaries: [] as SystemDictionaryMeta[] }))
      : Promise.resolve({ dictionaries: [] as SystemDictionaryMeta[] }),
    activeStore
      ? readApi<{ items: SystemDictionaryItem[] }>(
          `/api/admin/dictionaries/DISH_CATEGORY?${storeParam}`,
        ).catch(() => ({ items: [] as SystemDictionaryItem[] }))
      : Promise.resolve({ items: [] as SystemDictionaryItem[] }),
    canManageSystem && activeStore
      ? readList<KuaidiPrinterPanelItem, Record<string, number>>(
          withStore("/api/admin/kuaidi-printers"),
          { active: 0, defaults: 0, disabled: 0, total: 0 },
        )
      : Promise.resolve(emptyList<KuaidiPrinterPanelItem, Record<string, number>>({ active: 0, defaults: 0, disabled: 0, total: 0 })),
  ]);

  const roleRows = roles.items;

  return {
    activePackages: Number(userPackages.summary.active ?? 0),
    activeStore,
    adminUsers: adminUsers.items,
    adminUserPagination: adminUsers.pagination,
    adminUserSummary: adminUsers.summary,
    dictionaries: dictionaries.dictionaries,
    dishes: dishes.items,
    dishCategoryOptions: dishCategoryOptions.items,
    dishOptions: dishOptions.items,
    dishPagination: dishes.pagination,
    dishSummary: dishes.summary,
    operationLogs: operationLogs.items,
    operationLogPagination: operationLogs.pagination,
    members: countFromSummary(storeMembers.summary),
    packageTemplates: packageTemplates.items,
    packageTemplatePagination: packageTemplates.pagination,
    packageTemplateSummary: packageTemplates.summary,
    packageTemplateOptions: packageTemplateOptions.items,
    menuTree: buildAdminMenuTree(),
    kuaidiPrinters: kuaidiPrinters.items,
    kuaidiPrinterPagination: kuaidiPrinters.pagination,
    kuaidiPrinterSummary: kuaidiPrinters.summary,
    permissions: permissions.items,
    rolePagination: roles.pagination,
    roleRows,
    roleSummary: roles.summary,
    roles: roleRows.map((role) => ({
      code: role.code,
      id: role.id,
      name: role.name,
    })),
    storeMembers: storeMembers.items,
    userPackages: userPackages.items,
    userPackagePagination: userPackages.pagination,
    userPackageSummary: userPackages.summary,
    memberOptions: memberOptions.items,
    storeMemberPagination: storeMembers.pagination,
    storeMemberSummary: storeMembers.summary,
    orders: countFromSummary(storeOrders.summary),
    storeOrders: storeOrders.items,
    storeOrderPagination: storeOrders.pagination,
    storeOrderSummary: storeOrders.summary,
    storeAccessScope: session.storeScope,
    stores: session.stores,
    systemSettings,
    tasks: tasks.items,
    activeOrderTasks: activeOrderTasks.items,
    taskPagination: tasks.pagination,
    taskSummary: tasks.summary,
    userDisplay: {
      name: session.name ?? "管理员",
      roles: session.roles.map((role) => role.name).join("、") || "后台用户",
    },
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedStoreId = searchParams.get("storeId");
  const initialListQuery = searchParams.get("query") ?? "";
  const [session, setSession] = useState<AdminSession | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [dataRevision, setDataRevision] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const lastLoadedSectionRef = useRef<AdminSectionId | null>(null);

  const permissionCodes = session?.permissionCodes ?? [];
  const hasPermission = (code: string) => permissionCodes.includes(code);
  const activeSection = resolveAdminSection(
    searchParams.get("section"),
    permissionCodes,
  );
  const navGroups = useMemo(
    () => buildAdminNavGroups(activeSection, permissionCodes),
    [activeSection, permissionCodes],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const nextSession = await readApi<AdminSession>("/api/admin/auth/me");
        const nextData = await loadDashboardData(nextSession, selectedStoreId);
        if (!cancelled) {
          setSession(nextSession);
          setData(nextData);
        }
      } catch (caught) {
        if (!cancelled) {
          const message =
            caught instanceof Error ? caught.message : "加载后台数据失败";
          if (message.includes("请先登录") || message.includes("登录已过期")) {
            router.replace("/login");
            window.location.replace("/login");
            return;
          }
          setError(message.includes("aborted") ? "后台数据请求超时" : message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [router, selectedStoreId]);

  useEffect(() => {
    if (!session || !data) {
      return;
    }

    if (lastLoadedSectionRef.current === null) {
      lastLoadedSectionRef.current = activeSection;
      return;
    }

    if (lastLoadedSectionRef.current === activeSection) {
      return;
    }

    lastLoadedSectionRef.current = activeSection;
    const currentSession = session;
    let cancelled = false;

    async function refreshDashboardData() {
      setError("");
      try {
        const nextData = await loadDashboardData(currentSession, selectedStoreId);
        if (!cancelled) {
          setData(nextData);
          setDataRevision((value) => value + 1);
        }
      } catch (caught) {
        if (!cancelled) {
          const message =
            caught instanceof Error ? caught.message : "刷新后台数据失败";
          if (message.includes("请先登录") || message.includes("登录已过期")) {
            router.replace("/login");
            window.location.replace("/login");
            return;
          }
          setError(message.includes("aborted") ? "后台数据请求超时" : message);
        }
      }
    }

    void refreshDashboardData();

    return () => {
      cancelled = true;
    };
  }, [activeSection, data, router, selectedStoreId, session]);

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f5f8f3] text-[#14231a]">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <div className="text-base font-semibold text-red-700">后台数据加载失败</div>
          <div className="mt-2 text-sm leading-6 text-[#66756d]">{error}</div>
          <button
            className="mt-5 rounded-xl bg-[#1f8f4f] px-4 py-2 text-sm font-semibold text-white"
            onClick={() => window.location.reload()}
            type="button"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  if (loading || !data || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f5f8f3] text-[#14231a]">
        <div className="rounded-2xl border border-[#dbe6dc] bg-white px-6 py-5 text-sm shadow-sm">
          正在加载后台数据
        </div>
      </div>
    );
  }

  const activeStore = data.activeStore;
  const userDisplay = data.userDisplay;
  const scopeLabel = "全部数据";
  const orderTotal = metricValue(data.storeOrderSummary.total ?? data.orders);
  const pendingOrders = metricValue(data.storeOrderSummary.pendingShipment);
  const shippedOrders = metricValue(data.storeOrderSummary.shipped);
  const signedOrders = metricValue(data.storeOrderSummary.signed);
  const activeMembers = metricValue(data.storeMemberSummary.active ?? data.members);
  const disabledMembers = metricValue(data.storeMemberSummary.disabled);
  const activePackages = metricValue(data.userPackageSummary.active ?? data.activePackages);
  const frozenPackages = metricValue(data.userPackageSummary.frozen);
  const packageTotal = metricValue(data.userPackageSummary.total);
  const onSaleDishes = metricValue(data.dishSummary.onSale);
  const offSaleDishes = metricValue(data.dishSummary.offSale);
  const lowStockDishes = metricValue(data.dishSummary.lowStock);
  const dishTotal = metricValue(data.dishSummary.total);
  const dishStock = metricValue(data.dishSummary.stock);
  const activeTasks = metricValue(data.taskSummary.active);
  const draftTasks = metricValue(data.taskSummary.draft);
  const disabledTasks = metricValue(data.taskSummary.disabled);
  const activePrinters = metricValue(data.kuaidiPrinterSummary.active);
  const dictionaryCount = data.dictionaries.length;
  const serviceRate = ratioText(activeMembers, activeMembers + disabledMembers);
  const shipmentRate = ratioText(shippedOrders + signedOrders, orderTotal);
  const onSaleRate = ratioText(onSaleDishes, dishTotal);
  const packageRate = ratioText(activePackages, packageTotal);
  const dashboardMetrics: OverviewMetric[] = [
    {
      badge: `可服务 ${serviceRate}`,
      description: "可服务会员占比",
      icon: Users,
      label: "会员服务",
      miniItems: [
        { label: "可服务", tone: "green", value: activeMembers },
        { label: "停用", tone: "amber", value: disabledMembers },
      ],
      miniLabel: "会员结构",
      tone: "green",
      trend: "up",
      trendText: `停用 ${formatMetric(disabledMembers)} 人`,
      value: formatMetric(data.members, " 人"),
    },
    {
      badge: `可用 ${packageRate}`,
      description: "正在可预订的套餐",
      icon: PackageCheck,
      label: "套餐状态",
      miniItems: [
        { label: "可用", tone: "green", value: activePackages },
        { label: "冻结", tone: "amber", value: frozenPackages },
        { label: "其他", tone: "muted", value: Math.max(0, packageTotal - activePackages - frozenPackages) },
      ],
      miniLabel: "套餐结构",
      tone: "green",
      trend: "up",
      trendText: `冻结 ${formatMetric(frozenPackages)} 个`,
      value: formatMetric(activePackages, " 个"),
    },
    {
      badge: `完成 ${shipmentRate}`,
      description: "订单履约进度",
      icon: Truck,
      label: "订单履约",
      miniItems: [
        { label: "待配送", tone: "amber", value: pendingOrders },
        { label: "已发货", tone: "green", value: shippedOrders },
        { label: "已签收", tone: "muted", value: signedOrders },
      ],
      miniLabel: "履约结构",
      tone: pendingOrders > 0 ? "amber" : "green",
      trend: pendingOrders > 0 ? "down" : "up",
      trendText: `已发 ${formatMetric(shippedOrders)} 单 · 签收 ${formatMetric(signedOrders)} 单`,
      value: formatMetric(pendingOrders, " 单"),
    },
    {
      badge: `上架 ${onSaleRate}`,
      description: "当前菜品总库存",
      icon: Warehouse,
      label: "库存总量",
      miniItems: [
        { label: "上架", tone: "green", value: onSaleDishes },
        { label: "下架", tone: "amber", value: offSaleDishes },
        { label: "低库存", tone: "muted", value: lowStockDishes },
      ],
      miniLabel: "菜品状态",
      tone: "green",
      trend: "up",
      trendText: `低库存 ${formatMetric(lowStockDishes)} 个`,
      value: formatMetric(dishStock, " 斤"),
    },
  ];
  const serviceScore = ratioNumber(activeMembers, activeMembers + disabledMembers);
  const packageScore = ratioNumber(activePackages, packageTotal);
  const shipmentScore = ratioNumber(shippedOrders + signedOrders, orderTotal);
  const onSaleScore = ratioNumber(onSaleDishes, dishTotal);
  const inventoryScore = Math.max(0, 100 - ratioNumber(lowStockDishes, dishTotal));
  const fulfillmentSteps = [
    {
      helper: "等待处理",
      label: "待配送",
      tone: "amber",
      value: pendingOrders,
    },
    {
      helper: "已生成物流",
      label: "已发货",
      tone: "green",
      value: shippedOrders,
    },
    {
      helper: "完成履约",
      label: "已签收",
      tone: "blue",
      value: signedOrders,
    },
  ];
  const packageHealth = [
    {
      detail: `冻结 ${formatMetric(frozenPackages, " 个")}`,
      label: "可预订套餐",
      percent: packageScore,
      value: activePackages,
    },
    {
      detail: `停用 ${formatMetric(disabledMembers, " 人")}`,
      label: "可服务会员",
      percent: serviceScore,
      value: activeMembers,
    },
  ];
  const dishHealth = [
    {
      detail: `下架 ${formatMetric(offSaleDishes, " 个")}`,
      label: "上架菜品",
      percent: onSaleScore,
      tone: "green",
      value: onSaleDishes,
    },
    {
      detail: `总库存 ${formatMetric(dishStock, " 斤")}`,
      label: "库存健康",
      percent: inventoryScore,
      tone: lowStockDishes > 0 ? "amber" : "green",
      value: lowStockDishes,
    },
  ];
  const readinessItems = [
    {
      detail: `草稿 ${formatMetric(draftTasks, " 个")} · 停用 ${formatMetric(disabledTasks, " 个")}`,
      icon: CalendarClock,
      label: "今日任务",
      ready: activeTasks > 0,
      value: formatMetric(activeTasks, " 个启用"),
    },
    {
      detail: "用于电子面单打印",
      icon: Truck,
      label: "面单打印",
      ready: activePrinters > 0,
      value: formatMetric(activePrinters, " 台启用"),
    },
    {
      detail: "菜品类型、状态等基础配置",
      icon: Boxes,
      label: "系统字典",
      ready: dictionaryCount > 0,
      value: formatMetric(dictionaryCount, " 类"),
    },
  ];
  const fulfillmentRingOffset = ringOffset(shipmentScore);

  function renderTopBarActions() {
    return (
      <>
        <AdminMenuSearch groups={navGroups} />
        <AdminThemeToggle />
        <AdminUserMenu
          canOpenOperationLogs={permissionCodes.includes("system.manage")}
          name={userDisplay.name}
          roles={userDisplay.roles}
          scopeLabel={scopeLabel}
        />
      </>
    );
  }

  return (
    <AdminShell
      brand={data.systemSettings?.adminSystemName || "HanYang Fresh"}
      groups={navGroups}
      topBarActions={renderTopBarActions()}
    >
      <main className="admin-shell-main space-y-6 p-7">
        <div key={`${activeSection}-${dataRevision}-${initialListQuery}`} className="contents">
          {activeSection === "overview" ? (
            <div className="space-y-4">
              <section className="grid gap-3 xl:grid-cols-4 md:grid-cols-2">
                {dashboardMetrics.map((metric, index) => {
                  const MetricIcon = metric.icon;
                  const TrendIcon = metric.trend === "up" ? ArrowUpRight : ArrowDownRight;
                  const isAmber = metric.tone === "amber";
                  const miniMax = Math.max(
                    ...metric.miniItems.map((item) => item.value),
                    1,
                  );
                  const miniTitle = `${metric.miniLabel}：${metric.miniItems
                    .map((item) => `${item.label} ${formatMetric(item.value)}`)
                    .join("，")}`;
                  return (
                    <div
                      className={[
                        "admin-overview-card relative min-h-[106px] overflow-hidden rounded-2xl border bg-white/95 p-4 text-[#102017] shadow-[0_10px_24px_rgba(20,45,28,0.06)]",
                        "dark:bg-[#0d1d14] dark:text-white dark:shadow-[0_18px_40px_rgba(0,0,0,0.22)]",
                        isAmber ? "border-[#ecd49d] dark:border-[#5b451a]" : "border-[#dfe8df] dark:border-[#1f3a28]",
                      ].join(" ")}
                      key={metric.label}
                      style={{ "--admin-stat-index": index } as CSSProperties}
                    >
                      <div className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-[#dfe8df] to-transparent dark:via-white/10" />
                      <div className="relative flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs font-semibold text-[#607268] dark:text-white/55">
                            <MetricIcon data-icon="inline-start" />
                            {metric.label}
                          </div>
                          <div className="mt-1.5 truncate text-3xl font-semibold tracking-normal text-[#102017] dark:text-white">
                            {metric.value}
                          </div>
                        </div>
                        <div
                          className={[
                            "flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
                            isAmber
                              ? "border-[#ecd49d] bg-[#fff7df] text-[#9b6508] dark:border-[#5b451a] dark:bg-[#2a2111] dark:text-[#f0b84a]"
                              : "border-[#cfe3d3] bg-[#eff8f1] text-[#1f8f4f] dark:border-white/10 dark:bg-white/10 dark:text-[#86d79f]",
                          ].join(" ")}
                        >
                          <TrendIcon data-icon="inline-start" />
                          {metric.badge}
                        </div>
                      </div>
                      <div className="relative mt-2.5 flex items-end justify-between gap-4">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-[#102017] dark:text-white/85">{metric.trendText}</div>
                          <div className="mt-0.5 truncate text-xs text-[#607268] dark:text-white/45">{metric.description}</div>
                        </div>
                        <div
                          aria-label={miniTitle}
                          className="flex shrink-0 items-end gap-1.5"
                          title={miniTitle}
                        >
                          <span className="mr-1 mb-0.5 hidden text-[10px] font-semibold text-[#8a9a91] 2xl:inline dark:text-white/35">
                            {metric.miniLabel}
                          </span>
                          {metric.miniItems.map((item, itemIndex) => {
                            const height = Math.max(
                              item.value > 0 ? 10 : 6,
                              Math.round((item.value / miniMax) * 30),
                            );
                            return (
                              <span
                                className={[
                                  "admin-overview-bar w-2 rounded-full",
                                  item.tone === "green"
                                    ? "bg-[#1f8f4f]"
                                    : item.tone === "amber"
                                      ? "bg-[#d59a26]"
                                      : "bg-[#dce5dc] dark:bg-white/30",
                                ].join(" ")}
                                key={item.label}
                                style={
                                  {
                                    "--admin-bar-height": `${height}px`,
                                    "--admin-stat-index": index + itemIndex,
                                  } as CSSProperties
                                }
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>

              <section
                className="admin-overview-card rounded-2xl border border-[#dfe8df] bg-white/90 p-4 shadow-[0_14px_34px_rgba(20,45,28,0.07)] dark:border-[#1f3a28] dark:bg-[#0d1d14]"
                style={{ "--admin-stat-index": 4 } as CSSProperties}
              >
                <div className="flex items-center justify-between gap-4 border-b border-[#edf2ed] pb-3 dark:border-white/10">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#1f8f4f] dark:text-[#86d79f]">
                      <CheckCircle2 data-icon="inline-start" />
                      核心运营看板
                    </div>
                    <div className="mt-1 text-xs text-[#607268] dark:text-white/45">
                      履约、套餐、库存、准备状态集中展示
                    </div>
                  </div>
                  <div className="rounded-full border border-[#edf2ed] bg-[#f8fbf7] px-3 py-1 text-xs font-semibold text-[#607268] dark:border-white/10 dark:bg-white/[0.06] dark:text-white/50">
                    范围 · {scopeLabel}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr]">
                  <div className="relative overflow-hidden rounded-xl border border-[#dfe8df] bg-[#fbfdfb] p-4 text-[#102017] dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#1f8f4f] dark:text-[#86d79f]">
                      <Truck data-icon="inline-start" />
                      履约流程
                    </div>
                    <div className="rounded-full border border-[#cfe3d3] bg-[#eff8f1] px-2.5 py-1 text-xs font-semibold text-[#1f8f4f] dark:border-white/10 dark:bg-white/10 dark:text-[#86d79f]">
                      完成 {shipmentRate}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-[100px_1fr] items-center gap-4">
                    <div className="relative grid h-24 w-24 place-items-center">
                      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
                        <circle cx="24" cy="24" fill="none" r="20" stroke="rgba(31,143,79,0.12)" strokeWidth="5" />
                        <circle
                          className="admin-overview-ring"
                          cx="24"
                          cy="24"
                          fill="none"
                          r="20"
                          stroke="#1f8f4f"
                          strokeLinecap="round"
                          strokeDasharray="126"
                          strokeDashoffset={fulfillmentRingOffset}
                          strokeWidth="5"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <div className="text-2xl font-semibold">{formatMetric(orderTotal)}</div>
                        <div className="text-[11px] text-[#607268] dark:text-white/45">今日订单</div>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      {fulfillmentSteps.map((step, index) => (
                        <div className="grid grid-cols-[4rem_1fr_2rem] items-center gap-2" key={step.label}>
                          <div className="text-xs font-semibold text-[#607268] dark:text-white/60">{step.label}</div>
                          <div className="h-2 overflow-hidden rounded-full bg-[#e6eee6] dark:bg-white/10">
                            <div
                              className={[
                                "admin-overview-progress h-full rounded-full",
                                step.tone === "amber" ? "bg-[#d59a26]" : "bg-[#1f8f4f]",
                              ].join(" ")}
                              style={
                                {
                                  "--admin-progress-width": `${Math.max(ratioNumber(step.value, orderTotal), step.value > 0 ? 10 : 0)}%`,
                                  "--admin-stat-index": index + 5,
                                } as CSSProperties
                              }
                            />
                          </div>
                          <div className="text-right text-sm font-semibold">{formatMetric(step.value)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {fulfillmentSteps.map((step, index) => (
                      <div className="rounded-xl border border-[#e4ece4] bg-[#f8fbf7] px-3 py-2 dark:border-white/10 dark:bg-white/[0.06]" key={`${step.label}-tile`}>
                        <div className="text-[11px] text-[#607268] dark:text-white/45">{step.helper}</div>
                        <div className="mt-0.5 flex items-end justify-between gap-2">
                          <span className="text-lg font-semibold">{formatMetric(step.value)}</span>
                          <span className={index === 0 ? "text-xs font-semibold text-[#9b6508] dark:text-[#f0b84a]" : "text-xs font-semibold text-[#1f8f4f] dark:text-[#86d79f]"}>
                            {step.label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  </div>

                  <div className="relative overflow-hidden rounded-xl border border-[#dfe8df] bg-[#fbfdfb] p-4 text-[#102017] dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#1f8f4f] dark:text-[#86d79f]">
                    <PackageCheck data-icon="inline-start" />
                    套餐与会员
                  </div>
                  <div className="mt-3 grid grid-cols-[84px_1fr] items-center gap-4">
                    <div className="relative grid h-20 w-20 place-items-center">
                      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
                        <circle cx="24" cy="24" fill="none" r="19" stroke="rgba(31,143,79,0.12)" strokeWidth="5" />
                        <circle
                          className="admin-overview-ring"
                          cx="24"
                          cy="24"
                          fill="none"
                          r="19"
                          stroke="#1f8f4f"
                          strokeLinecap="round"
                          strokeDasharray="119"
                          strokeDashoffset={ringOffset(packageScore, 119)}
                          strokeWidth="5"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <div className="text-lg font-semibold leading-none">{packageScore}%</div>
                        <div className="mt-1 text-[10px] leading-none text-[#607268] dark:text-white/45">套餐可用</div>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      {packageHealth.map((item) => (
                        <div key={item.label}>
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="text-[#607268] dark:text-white/60">{item.label}</span>
                            <span className="font-semibold">{formatMetric(item.value)} · {item.percent}%</span>
                          </div>
                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#e6eee6] dark:bg-white/10">
                            <div
                              className="admin-overview-progress h-full rounded-full bg-[#1f8f4f]"
                              style={{ "--admin-progress-width": `${item.percent}%` } as CSSProperties}
                            />
                          </div>
                          <div className="mt-0.5 text-[11px] text-[#607268] dark:text-white/40">{item.detail}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  </div>

                  <div className="rounded-xl border border-[#dfe8df] bg-[#fbfdfb] p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#1f8f4f] dark:text-[#86d79f]">
                      <Sprout data-icon="inline-start" />
                      菜品库存
                    </div>
                    <div className="text-xs font-semibold text-[#607268] dark:text-white/55">{formatMetric(dishStock, " 斤")}</div>
                  </div>
                  <div className="mt-3 grid gap-2.5">
                    {dishHealth.map((item, index) => (
                      <div className="grid grid-cols-[4.25rem_1fr_4.5rem] items-center gap-2.5" key={item.label}>
                        <div className="text-xs font-semibold text-[#405248] dark:text-white/70">{item.label}</div>
                        <div className="h-6 overflow-hidden rounded-lg border border-[#dcebdd] bg-[#f4faf5] p-1 dark:border-white/10 dark:bg-white/10">
                          <div
                            className={[
                              "admin-overview-progress h-full rounded-md",
                              item.tone === "amber" ? "bg-[#d59a26]" : "bg-[#1f8f4f]",
                            ].join(" ")}
                            style={
                              {
                                "--admin-progress-width": `${item.percent}%`,
                                "--admin-stat-index": index + 8,
                              } as CSSProperties
                            }
                          />
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-[#102017] dark:text-white">{formatMetric(item.value)}</div>
                          <div className="truncate text-[10px] text-[#607268] dark:text-white/45">{item.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-3 divide-x divide-[#e4ece4] rounded-xl border border-[#edf2ed] bg-[#f8fbf7] text-center text-xs text-[#607268] dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/50">
                    <span className="px-2 py-2">上架 {formatMetric(onSaleDishes)}</span>
                    <span className="px-2 py-2">下架 {formatMetric(offSaleDishes)}</span>
                    <span className="px-2 py-2">低库存 {formatMetric(lowStockDishes)}</span>
                  </div>
                  </div>

                  <div className="rounded-xl border border-[#dfe8df] bg-[#fbfdfb] p-3.5 dark:border-white/10 dark:bg-white/[0.04] xl:col-span-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#1f8f4f] dark:text-[#86d79f]">
                      <CheckCircle2 data-icon="inline-start" />
                      今日运营准备
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {readinessItems.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <div
                          className="grid grid-cols-[2rem_1fr_auto] items-center gap-2.5 rounded-xl border border-[#edf2ed] bg-[#f8fbf7] px-3 py-2 dark:border-white/10 dark:bg-white/[0.06]"
                          key={item.label}
                        >
                          <div className="grid h-8 w-8 place-items-center rounded-lg bg-white text-[#1f8f4f] shadow-sm dark:bg-white/10 dark:text-[#86d79f]">
                            <ItemIcon data-icon="inline-start" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-[#102017] dark:text-white">{item.label}</div>
                            <div className="truncate text-xs text-[#607268] dark:text-white/45">{item.detail}</div>
                          </div>
                          <div
                            className={[
                              "rounded-full border px-2.5 py-1 text-xs font-semibold",
                              item.ready
                                ? "border-[#cfe3d3] bg-[#eff8f1] text-[#1f8f4f] dark:border-white/10 dark:bg-white/10 dark:text-[#86d79f]"
                                : "border-[#ecd49d] bg-[#fff7df] text-[#9b6508] dark:border-[#5b451a] dark:bg-[#2a2111] dark:text-[#f0b84a]",
                            ].join(" ")}
                          >
                            {item.value}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {activeSection === "orders" ? (
            <OrderManagementPanel
              dishOptions={data.dishes.map((dish) => ({
                id: dish.id,
                name: dish.name,
                status: dish.status,
                stepJin: dish.stepJin,
                stockJin: dish.stockJin,
              }))}
              initialItems={data.storeOrders}
              initialPagination={data.storeOrderPagination}
              initialQuery={initialListQuery}
              initialSummary={data.storeOrderSummary}
              memberOptions={data.memberOptions.map((member) => ({
                avatarUrl: member.avatarUrl,
                defaultAddress: member.defaultAddress,
                id: member.id ?? member.userId,
                latestActivePackage: member.latestActivePackage,
                nickname: member.nickname,
                phone: member.phone,
              }))}
              orderTasks={data.activeOrderTasks}
              canWrite={hasPermission("orders.write")}
              store={activeStore}
            />
          ) : null}

          {activeSection === "shipment-stats" ? (
            <ShipmentStatsPanel
              categoryOptions={data.dishCategoryOptions}
              store={activeStore}
            />
          ) : null}

          {activeSection === "members" ? (
            <MemberManagementPanel
              initialItems={data.storeMembers}
              initialPagination={data.storeMemberPagination}
              initialSummary={data.storeMemberSummary}
              canWrite={hasPermission("members.write")}
              store={activeStore}
            />
          ) : null}

          {activeSection === "user-packages" ? (
            <PackageManagementPanel
              initialItems={data.userPackages}
              initialPagination={data.userPackagePagination}
              initialQuery={initialListQuery}
              initialSummary={data.userPackageSummary}
              memberOptions={data.memberOptions.map((member) => ({
                avatarUrl: member.avatarUrl,
                id: member.id ?? member.userId,
                nickname: member.nickname,
                phone: member.phone,
              }))}
              packageTemplateOptions={data.packageTemplateOptions.map((template) => ({
                id: template.id,
                name: template.name,
                totalTimes: template.totalTimes,
                weightLimitJin: template.weightLimitJin,
              }))}
              canWrite={hasPermission("members.write")}
              store={activeStore}
            />
          ) : null}

          {activeSection === "package-templates" ? (
            <PackageTemplateManagementPanel
              initialItems={data.packageTemplates}
              initialPagination={data.packageTemplatePagination}
              initialSummary={data.packageTemplateSummary}
              canWrite={hasPermission("packages.write")}
              store={activeStore}
            />
          ) : null}

          {activeSection === "dishes" ? (
            <DishManagementPanel
              categoryOptions={data.dishCategoryOptions}
              initialItems={data.dishes}
              initialPagination={data.dishPagination}
              initialSummary={data.dishSummary}
              canWrite={hasPermission("dishes.write")}
              store={activeStore}
            />
          ) : null}

          {activeSection === "tasks" ? (
            <TaskManagementPanel
              categoryOptions={data.dishCategoryOptions}
              dishOptions={data.dishOptions}
              initialItems={data.tasks}
              initialPagination={data.taskPagination}
              initialSummary={data.taskSummary}
              canWrite={hasPermission("tasks.write")}
              store={activeStore}
            />
          ) : null}

          {activeSection === "admin-users" ? (
            <SystemManagementPanel
              initialAdminUsers={data.adminUsers}
              initialPagination={data.adminUserPagination}
              initialSummary={data.adminUserSummary}
              roles={data.roles}
              stores={data.stores}
            />
          ) : null}

          {activeSection === "roles" ? (
            <RoleManagementPanel
              initialPagination={data.rolePagination}
              initialRoles={data.roleRows}
              initialSummary={data.roleSummary}
              permissions={data.permissions}
            />
          ) : null}

          {activeSection === "menus" ? (
            <MenuManagementPanel menuTree={data.menuTree} />
          ) : null}

          {activeSection === "dictionaries" ? (
            <SystemDictionaryPanel
              initialDictionaries={data.dictionaries}
              initialItems={data.dishCategoryOptions}
              store={activeStore}
            />
          ) : null}

          {activeSection === "kuaidi-printers" ? (
            <KuaidiPrinterManagementPanel
              initialItems={data.kuaidiPrinters}
              initialPagination={data.kuaidiPrinterPagination}
              initialSummary={data.kuaidiPrinterSummary}
              store={activeStore}
            />
          ) : null}

          {activeSection === "delivery-ranges" ? (
            <DeliveryRangePanel initialSettings={data.systemSettings} store={activeStore} />
          ) : null}

          {activeSection === "online-sessions" ? (
            <OnlineSessionManagementPanel />
          ) : null}

          {activeSection === "operation-logs" ? (
            <OperationLogsPanel
              initialLogs={data.operationLogs}
              initialPagination={data.operationLogPagination}
              logStoreId={activeStore?.id ?? null}
            />
          ) : null}

          {activeSection === "system-settings" ? (
            <SystemSettingsPanel initialSettings={data.systemSettings} store={activeStore} />
          ) : null}
        </div>
      </main>
    </AdminShell>
  );
}
