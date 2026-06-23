"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  buildAdminMenuTree,
  buildAdminNavGroups,
  getAdminSectionLabel,
  resolveAdminSection,
  type AdminSectionId,
} from "@/app/lib/admin-navigation";

import { AdminShell } from "./ui/admin-shell";
import { AdminMenuSearch } from "./ui/admin-menu-search";
import { AdminThemeToggle } from "./ui/admin-theme-toggle";
import { AdminUserMenu } from "./ui/admin-user-menu";
import { DishManagementPanel, type DishPanelItem } from "./ui/dish-management-panel";
import { MemberManagementPanel, type MemberPanelItem } from "./ui/member-management-panel";
import { MenuManagementPanel } from "./ui/menu-management-panel";
import { OperationLogsPanel, type OperationLogPanelItem } from "./ui/operation-logs-panel";
import { OrderManagementPanel, type OrderPanelItem } from "./ui/order-management-panel";
import { PackageManagementPanel, type PackagePanelItem } from "./ui/package-management-panel";
import {
  PackageTemplateManagementPanel,
  type PackageTemplatePanelItem,
} from "./ui/package-template-management-panel";
import {
  RoleManagementPanel,
  type RolePanelItem,
  type RolePermissionOption,
} from "./ui/role-management-panel";
import { ShipmentStatsPanel } from "./ui/shipment-stats-panel";
import { SystemManagementPanel, type AdminUserPanelItem } from "./ui/system-management-panel";
import { SystemSettingsPanel, type SystemSettingsPanelItem } from "./ui/system-settings-panel";
import { TaskManagementPanel, type TaskDishOption, type TaskPanelItem } from "./ui/task-management-panel";

const ADMIN_LIST_PAGE_SIZE = 10;
const ADMIN_LOG_PAGE_SIZE = 20;
const ADMIN_OPTION_LIMIT = 200;

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

type DashboardData = {
  activePackages: number;
  activeStore: StoreOption | null;
  adminUserPagination: ReturnType<typeof emptyPagination>;
  adminUserSummary: any;
  adminUsers: AdminUserPanelItem[];
  dishOptions: TaskDishOption[];
  dishPagination: ReturnType<typeof emptyPagination>;
  dishSummary: any;
  dishes: DishPanelItem[];
  memberOptions: MemberPanelItem[];
  members: number;
  menuTree: ReturnType<typeof buildAdminMenuTree>;
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
  roles: Array<{ id: string; name: string }>;
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

async function readList<TItem, TSummary extends Record<string, number>>(
  path: string,
  fallbackSummary: TSummary,
  pageSize = ADMIN_LIST_PAGE_SIZE,
): Promise<ListResult<TItem, TSummary>> {
  try {
    return await readApi<ListResult<TItem, TSummary>>(path);
  } catch {
    return emptyList<TItem, TSummary>(fallbackSummary, pageSize);
  }
}

function countFromSummary(summary: Record<string, number>) {
  return Number(summary.total ?? summary.active ?? 0);
}

async function loadDashboardData(
  session: AdminSession,
  selectedStoreId?: string | null,
): Promise<DashboardData> {
  const activeStore =
    session.stores.find((store) => store.id === selectedStoreId) ??
    session.stores[0] ??
    null;
  const storeId = activeStore?.id ?? "";
  const storeParam = storeId ? `storeId=${encodeURIComponent(storeId)}` : "";
  const withStore = (path: string, take = ADMIN_LIST_PAGE_SIZE) => {
    const params = new URLSearchParams();
    if (storeId) {
      params.set("storeId", storeId);
    }
    params.set("take", String(take));
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
    operationLogs,
    systemSettings,
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
          withStore("/api/admin/members"),
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
      ? readApi<SystemSettingsPanelItem>(`/api/admin/system-settings?${storeParam}`).catch(() => null)
      : Promise.resolve(null),
  ]);

  const roleRows = roles.items;

  return {
    activePackages: Number(userPackages.summary.active ?? 0),
    activeStore,
    adminUsers: adminUsers.items,
    adminUserPagination: adminUsers.pagination,
    adminUserSummary: adminUsers.summary,
    dishes: dishes.items,
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
    permissions: permissions.items,
    rolePagination: roles.pagination,
    roleRows,
    roleSummary: roles.summary,
    roles: roleRows.map((role) => ({
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
  const [session, setSession] = useState<AdminSession | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const permissionCodes = session?.permissionCodes ?? [];
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
  const activeSectionLabel = getAdminSectionLabel(activeSection);
  const isOrderSection = activeSection === "orders";

  return (
    <AdminShell brand="Hentor Fresh" groups={navGroups}>
      <header className="flex min-h-20 items-center justify-between border-b border-[#dbe6dc] bg-white px-7">
        <div>
          {isOrderSection ? (
            <>
              <h1 className="text-2xl font-semibold tracking-normal">订单管理</h1>
              <div className="mt-1 text-sm font-medium text-[#66756d]">
                高频运营入口：筛选、批量发货、弹窗处理
              </div>
            </>
          ) : (
            <>
              <div className="text-sm font-medium text-[#66756d]">
                蔬菜预订运营台
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal">
                {activeSectionLabel}
              </h1>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <AdminMenuSearch groups={navGroups} />
          <AdminThemeToggle />
          <AdminUserMenu
            canOpenOperationLogs={permissionCodes.includes("system.manage")}
            name={data.userDisplay.name}
            roles={data.userDisplay.roles}
            scopeLabel={data.storeAccessScope === "ALL" ? "全部数据" : "授权数据"}
          />
        </div>
      </header>

      <main className="space-y-6 p-7">
        {activeSection === "overview" ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["活跃会员", data.members, "会员与后台用户分开管理"],
                ["有效套餐", data.activePackages, "支持冻结、次数调整"],
                [
                  "待发货订单",
                  data.storeOrderSummary.pendingShipment,
                  "按今日待处理订单推进配送",
                ],
                ["累计订单", data.orders, "详情/编辑/新建统一弹窗打开"],
              ].map(([label, value, desc]) => (
                <div
                  className="rounded-2xl border border-[#dbe6dc] bg-white p-5 shadow-sm"
                  key={label}
                >
                  <div className="text-sm font-medium text-[#66756d]">{label}</div>
                  <div className="mt-3 text-3xl font-semibold">{value}</div>
                  <div className="mt-3 text-sm leading-6 text-[#66756d]">
                    {desc}
                  </div>
                </div>
              ))}
            </section>

            <section className="rounded-2xl border border-[#dbe6dc] bg-[#f9fff9] p-5 shadow-sm">
              <h2 className="text-lg font-semibold">支付预留</h2>
              <p className="mt-3 text-sm leading-6 text-[#66756d]">
                套餐购买已预留 purchase order、payment order 和微信支付字段，当前状态为未启用支付。
              </p>
            </section>
          </>
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
            initialSummary={data.storeOrderSummary}
            memberOptions={data.memberOptions.map((member) => ({
              defaultAddress: member.defaultAddress,
              id: member.id,
              latestActivePackage: member.latestActivePackage,
              nickname: member.nickname,
              phone: member.phone,
            }))}
            store={activeStore}
          />
        ) : null}

        {activeSection === "shipment-stats" ? (
          <ShipmentStatsPanel store={activeStore} />
        ) : null}

        {activeSection === "members" ? (
          <MemberManagementPanel
            initialItems={data.storeMembers}
            initialPagination={data.storeMemberPagination}
            initialSummary={data.storeMemberSummary}
            store={activeStore}
          />
        ) : null}

        {activeSection === "user-packages" ? (
          <PackageManagementPanel
            initialItems={data.userPackages}
            initialPagination={data.userPackagePagination}
            initialSummary={data.userPackageSummary}
            memberOptions={data.memberOptions.map((member) => ({
              id: member.id,
              nickname: member.nickname,
              phone: member.phone,
            }))}
            packageTemplateOptions={data.packageTemplateOptions.map((template) => ({
              id: template.id,
              name: template.name,
              totalTimes: template.totalTimes,
              weightLimitJin: template.weightLimitJin,
            }))}
            store={activeStore}
          />
        ) : null}

        {activeSection === "package-templates" ? (
          <PackageTemplateManagementPanel
            initialItems={data.packageTemplates}
            initialPagination={data.packageTemplatePagination}
            initialSummary={data.packageTemplateSummary}
            store={activeStore}
          />
        ) : null}

        {activeSection === "dishes" ? (
          <DishManagementPanel
            initialItems={data.dishes}
            initialPagination={data.dishPagination}
            initialSummary={data.dishSummary}
            store={activeStore}
          />
        ) : null}

        {activeSection === "tasks" ? (
          <TaskManagementPanel
            dishOptions={data.dishOptions}
            initialItems={data.tasks}
            initialPagination={data.taskPagination}
            initialSummary={data.taskSummary}
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
      </main>
    </AdminShell>
  );
}
