import { redirect } from "next/navigation";

import {
  listAccessibleStores,
  listAdminPermissions,
  listAdminOperationLogs,
  listAdminRoles,
  listAdminUsers,
  listDishes,
  getSystemSettings,
  listPackageTemplates,
  listStoreMembers,
  listStoreOrders,
  listTasks,
  listUserPackages,
  prisma,
} from "@hentor/db";

import {
  buildAdminMenuTree,
  buildAdminNavGroups,
  getAdminSectionLabel,
  resolveAdminSection,
} from "@/app/lib/admin-navigation";
import { getAdminPermissionCodes } from "@/app/lib/admin-access";
import { getAdminSession } from "@/app/lib/session";

import { AdminShell } from "./ui/admin-shell";
import { AdminMenuSearch } from "./ui/admin-menu-search";
import { AdminThemeToggle } from "./ui/admin-theme-toggle";
import { AdminUserMenu } from "./ui/admin-user-menu";
import { DishManagementPanel, type DishPanelItem } from "./ui/dish-management-panel";
import {
  OrderManagementPanel,
  type OrderPanelItem,
} from "./ui/order-management-panel";
import { ShipmentStatsPanel } from "./ui/shipment-stats-panel";
import {
  MemberManagementPanel,
  type MemberPanelItem,
} from "./ui/member-management-panel";
import {
  PackageTemplateManagementPanel,
  type PackageTemplatePanelItem,
} from "./ui/package-template-management-panel";
import {
  PackageManagementPanel,
  type PackagePanelItem,
} from "./ui/package-management-panel";
import {
  SystemManagementPanel,
  type AdminUserPanelItem,
} from "./ui/system-management-panel";
import {
  OperationLogsPanel,
  type OperationLogPanelItem,
} from "./ui/operation-logs-panel";
import { MenuManagementPanel } from "./ui/menu-management-panel";
import {
  RoleManagementPanel,
  type RolePanelItem,
  type RolePermissionOption,
} from "./ui/role-management-panel";
import {
  SystemSettingsPanel,
  type SystemSettingsPanelItem,
} from "./ui/system-settings-panel";
import {
  TaskManagementPanel,
  type TaskDishOption,
  type TaskPanelItem,
} from "./ui/task-management-panel";

const ADMIN_LIST_PAGE_SIZE = 10;
const ADMIN_LOG_PAGE_SIZE = 20;
const ADMIN_OPTION_LIMIT = 200;

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

async function getDashboardData(
  adminUserId: string,
  permissionCodes: readonly string[],
  selectedStoreId?: string,
) {
  const [storeAccess, currentAdmin] = await Promise.all([
    listAccessibleStores(adminUserId),
    prisma.adminUser.findUnique({
      where: { id: adminUserId },
      include: {
        roles: {
          include: { role: true },
        },
      },
    }),
  ]);
  const stores = storeAccess.stores;
  const activeStore =
    stores.find((store) => store.id === selectedStoreId) ?? stores[0] ?? null;
  const accessibleStoreIds = stores.map((store) => store.id);
  const canManageSystem = permissionCodes.includes("system.manage");

  const [
    members,
    orders,
    activePackages,
    adminUsers,
    adminRoles,
    adminPermissions,
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
      prisma.memberStoreBinding.count({
        where: { status: "ACTIVE", storeId: { in: accessibleStoreIds } },
      }),
      prisma.order.count({ where: { storeId: { in: accessibleStoreIds } } }),
      prisma.userPackage.count({
        where: { status: "ACTIVE", storeId: { in: accessibleStoreIds } },
      }),
      canManageSystem
        ? listAdminUsers({
            take: ADMIN_LIST_PAGE_SIZE,
            ...(storeAccess.scope === "ALL"
              ? {}
              : { storeIds: accessibleStoreIds }),
          })
        : Promise.resolve({
            items: [],
            pagination: emptyPagination(),
            summary: { active: 0, disabled: 0, total: 0 },
          }),
      canManageSystem
        ? listAdminRoles({ take: ADMIN_OPTION_LIMIT })
        : Promise.resolve({
            items: [],
            pagination: emptyPagination(ADMIN_OPTION_LIMIT),
            summary: { total: 0 },
          }),
      canManageSystem
        ? listAdminPermissions()
        : Promise.resolve({ items: [], summary: { total: 0 } }),
      activeStore
        ? listStoreOrders({ storeId: activeStore.id, take: ADMIN_LIST_PAGE_SIZE })
        : Promise.resolve({
            items: [],
            pagination: emptyPagination(),
            summary: {
              canceled: 0,
              pendingShipment: 0,
              shipped: 0,
              signed: 0,
              total: 0,
            },
          }),
      activeStore
        ? listStoreMembers({ storeId: activeStore.id, take: ADMIN_LIST_PAGE_SIZE })
        : Promise.resolve({
            items: [],
            pagination: emptyPagination(),
            summary: {
              active: 0,
              disabled: 0,
              purchaseOrders: 0,
              total: 0,
              userPackages: 0,
            },
          }),
      activeStore
        ? listUserPackages({ storeId: activeStore.id, take: ADMIN_LIST_PAGE_SIZE })
        : Promise.resolve({
            items: [],
            pagination: emptyPagination(),
            summary: {
              active: 0,
              expired: 0,
              frozen: 0,
              total: 0,
            },
          }),
      activeStore
        ? listStoreMembers({ storeId: activeStore.id, take: ADMIN_OPTION_LIMIT })
        : Promise.resolve({
            items: [],
            pagination: emptyPagination(ADMIN_OPTION_LIMIT),
            summary: { active: 0, disabled: 0, total: 0 },
          }),
      activeStore
        ? listPackageTemplates({ storeId: activeStore.id, take: ADMIN_LIST_PAGE_SIZE })
        : Promise.resolve({
            items: [],
            pagination: emptyPagination(),
            summary: {
              active: 0,
              disabled: 0,
              purchaseOrders: 0,
              total: 0,
              userPackages: 0,
            },
          }),
      activeStore
        ? listPackageTemplates({
            status: "ACTIVE",
            storeId: activeStore.id,
            take: ADMIN_OPTION_LIMIT,
          })
        : Promise.resolve({
            items: [],
            pagination: emptyPagination(ADMIN_OPTION_LIMIT),
            summary: {
              active: 0,
              disabled: 0,
              purchaseOrders: 0,
              total: 0,
              userPackages: 0,
            },
          }),
      activeStore
        ? listDishes({ storeId: activeStore.id, take: ADMIN_LIST_PAGE_SIZE })
        : Promise.resolve({
            items: [],
            pagination: emptyPagination(),
            summary: { lowStock: 0, offSale: 0, onSale: 0, stock: 0, total: 0 },
          }),
      activeStore
        ? listDishes({ storeId: activeStore.id, take: ADMIN_OPTION_LIMIT })
        : Promise.resolve({
            items: [],
            pagination: emptyPagination(ADMIN_OPTION_LIMIT),
            summary: { lowStock: 0, offSale: 0, onSale: 0, stock: 0, total: 0 },
          }),
      activeStore
        ? listTasks({ storeId: activeStore.id, take: ADMIN_LIST_PAGE_SIZE })
        : Promise.resolve({
            items: [],
            pagination: emptyPagination(),
            summary: { active: 0, disabled: 0, draft: 0, total: 0 },
          }),
      canManageSystem
        ? activeStore
          ? listAdminOperationLogs({
              storeId: activeStore.id,
              take: ADMIN_LOG_PAGE_SIZE,
            })
          : storeAccess.scope === "ALL"
            ? listAdminOperationLogs({
                take: ADMIN_LOG_PAGE_SIZE,
              })
            : Promise.resolve({
                items: [],
                pagination: emptyPagination(ADMIN_LOG_PAGE_SIZE),
                summary: { total: 0 },
              })
        : Promise.resolve({
            items: [],
            pagination: emptyPagination(ADMIN_LOG_PAGE_SIZE),
            summary: { total: 0 },
          }),
      canManageSystem && activeStore
        ? getSystemSettings({ storeId: activeStore.id })
        : null,
    ]);

  return {
    activeStore,
    activePackages,
    adminUsers: adminUsers.items.map(serializeAdminUserPanelItem),
    adminUserPagination: adminUsers.pagination,
    adminUserSummary: adminUsers.summary,
    dishes: dishes.items.map(serializeDishPanelItem),
    dishOptions: dishOptions.items.map(serializeTaskDishOption),
    dishPagination: dishes.pagination,
    dishSummary: dishes.summary,
    operationLogs: operationLogs.items.map(serializeOperationLogPanelItem),
    operationLogPagination: operationLogs.pagination,
    members,
    packageTemplates: packageTemplates.items.map(serializePackageTemplatePanelItem),
    packageTemplatePagination: packageTemplates.pagination,
    packageTemplateSummary: packageTemplates.summary,
    packageTemplateOptions: packageTemplateOptions.items.map(
      serializePackageTemplatePanelItem,
    ),
    menuTree: buildAdminMenuTree(),
    permissions: adminPermissions.items.map(serializeRolePermissionOption),
    rolePagination: adminRoles.pagination,
    roleRows: adminRoles.items.map(serializeRolePanelItem),
    roleSummary: adminRoles.summary,
    roles: adminRoles.items.map((role) => ({
      id: role.id,
      name: role.name,
    })),
    storeMembers: storeMembers.items.map(serializeMemberPanelItem),
    userPackages: userPackages.items.map(serializeUserPackagePanelItem),
    userPackagePagination: userPackages.pagination,
    userPackageSummary: userPackages.summary,
    memberOptions: memberOptions.items.map(serializeMemberPanelItem),
    storeMemberPagination: storeMembers.pagination,
    storeMemberSummary: storeMembers.summary,
    orders,
    storeOrders: storeOrders.items.map(serializeOrderPanelItem),
    storeOrderPagination: storeOrders.pagination,
    storeOrderSummary: storeOrders.summary,
    storeAccessScope: storeAccess.scope,
    stores,
    systemSettings: systemSettings
      ? serializeSystemSettingsPanelItem(systemSettings)
      : null,
    tasks: tasks.items.map(serializeTaskPanelItem),
    taskPagination: tasks.pagination,
    taskSummary: tasks.summary,
    userDisplay: {
      name: currentAdmin?.name ?? "管理员",
      roles:
        currentAdmin?.roles.map(({ role }) => role.name).join("、") ??
        "后台用户",
    },
  };
}

function serializeTaskDishOption(
  item: Awaited<ReturnType<typeof listDishes>>["items"][number],
): TaskDishOption {
  return {
    category: item.category,
    id: item.id,
    name: item.name,
    status: item.status,
    stockJin: item.stockJin,
  };
}

function serializeTaskPanelItem(
  item: Awaited<ReturnType<typeof listTasks>>["items"][number],
): TaskPanelItem {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    endsAt: item.endsAt.toISOString(),
    startsAt: item.startsAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function serializeDishPanelItem(
  item: Awaited<ReturnType<typeof listDishes>>["items"][number],
): DishPanelItem {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    deletedAt: item.deletedAt?.toISOString() ?? null,
    updatedAt: item.updatedAt.toISOString(),
  };
}

function serializePackageTemplatePanelItem(
  item: Awaited<ReturnType<typeof listPackageTemplates>>["items"][number],
): PackageTemplatePanelItem {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function serializeMemberPanelItem(
  item: Awaited<ReturnType<typeof listStoreMembers>>["items"][number],
): MemberPanelItem {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function serializeUserPackagePanelItem(
  item: Awaited<ReturnType<typeof listUserPackages>>["items"][number],
): PackagePanelItem {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    expiresAt: item.expiresAt.toISOString(),
    lastUsedAt: item.lastUsedAt?.toISOString() ?? null,
    startsAt: item.startsAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function serializeOrderPanelItem(
  item: Awaited<ReturnType<typeof listStoreOrders>>["items"][number],
): OrderPanelItem {
  return {
    ...item,
    addressSnapshot: item.addressSnapshot,
    canceledAt: item.canceledAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
	    modifiedAt: item.modifiedAt?.toISOString() ?? null,
	    shippedAt: item.shippedAt?.toISOString() ?? null,
	    shipments: item.shipments.map((shipment) => ({
	      ...shipment,
	      shippedAt: shipment.shippedAt?.toISOString() ?? null,
	      signedAt: shipment.signedAt?.toISOString() ?? null,
	    })),
	    signedAt: item.signedAt?.toISOString() ?? null,
    updatedAt: item.updatedAt.toISOString(),
  };
}

function serializeAdminUserPanelItem(
  item: Awaited<ReturnType<typeof listAdminUsers>>["items"][number],
): AdminUserPanelItem {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    lastLoginAt: item.lastLoginAt?.toISOString() ?? null,
    updatedAt: item.updatedAt.toISOString(),
  };
}

function serializeRolePanelItem(
  item: Awaited<ReturnType<typeof listAdminRoles>>["items"][number],
): RolePanelItem {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function serializeRolePermissionOption(
  item: Awaited<ReturnType<typeof listAdminPermissions>>["items"][number],
): RolePermissionOption {
  return {
    code: item.code,
    id: item.id,
    name: item.name,
  };
}

function serializeOperationLogPanelItem(
  item: Awaited<ReturnType<typeof listAdminOperationLogs>>["items"][number],
): OperationLogPanelItem {
  return {
    action: item.action,
    afterValue: item.afterValue,
    beforeValue: item.beforeValue,
    createdAt: item.createdAt.toISOString(),
    durationMs: item.durationMs,
    id: item.id,
    ip: item.ip,
    operator: item.operator,
    requestMethod: item.requestMethod,
    requestParams: item.requestParams,
    requestPath: item.requestPath,
    resource: item.resource,
    resourceId: item.resourceId,
    responseData: item.responseData,
    statusCode: item.statusCode,
    store: item.store
      ? {
          id: item.store.id,
          name: item.store.name,
        }
      : null,
    user: item.user,
    userAgent: item.userAgent,
  };
}

function serializeSystemSettingsPanelItem(
  item: Awaited<ReturnType<typeof getSystemSettings>>,
): SystemSettingsPanelItem {
  return item;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ section?: string; storeId?: string }>;
}) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const permissionCodes = await getAdminPermissionCodes(session.adminUserId);
  const activeSection = resolveAdminSection(params?.section, permissionCodes);
  const data = await getDashboardData(
    session.adminUserId,
    permissionCodes,
    params?.storeId,
  );
  const navGroups = buildAdminNavGroups(activeSection, permissionCodes);
  const activeStore = data.activeStore;
  const activeSectionLabel = getAdminSectionLabel(activeSection);
  const isOrderSection = activeSection === "orders";

  return (
    <AdminShell
      brand="Hentor Fresh"
      groups={navGroups}
    >
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
            scopeLabel={
              data.storeAccessScope === "ALL" ? "全部数据" : "授权数据"
            }
          />
        </div>
      </header>

      <main className="space-y-6 p-7">
        {activeSection === "overview" ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["活跃会员", data.members, "会员与后台用户分开管理"],
                ["有效套餐", data.activePackages, "支持冻结、延期、次数调整"],
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
            store={
              activeStore
                ? {
                    id: activeStore.id,
                    name: activeStore.name,
                  }
                : null
            }
          />
        ) : null}

        {activeSection === "shipment-stats" ? (
          <ShipmentStatsPanel
            store={
              activeStore
                ? {
                    id: activeStore.id,
                    name: activeStore.name,
                  }
                : null
            }
          />
        ) : null}

        {activeSection === "members" ? (
          <MemberManagementPanel
            initialItems={data.storeMembers}
            initialPagination={data.storeMemberPagination}
            initialSummary={data.storeMemberSummary}
            store={
              activeStore
                ? {
                    id: activeStore.id,
                    name: activeStore.name,
                  }
                : null
            }
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
            store={
              activeStore
                ? {
                    id: activeStore.id,
                    name: activeStore.name,
                  }
                : null
            }
          />
        ) : null}

        {activeSection === "package-templates" ? (
          <PackageTemplateManagementPanel
            initialItems={data.packageTemplates}
            initialPagination={data.packageTemplatePagination}
            initialSummary={data.packageTemplateSummary}
            store={
              activeStore
                ? {
                    id: activeStore.id,
                    name: activeStore.name,
                  }
                : null
            }
          />
        ) : null}

        {activeSection === "dishes" ? (
          <DishManagementPanel
            initialItems={data.dishes}
            initialPagination={data.dishPagination}
            initialSummary={data.dishSummary}
            store={
              activeStore
                ? {
                    id: activeStore.id,
                    name: activeStore.name,
                  }
                : null
            }
          />
        ) : null}

        {activeSection === "tasks" ? (
          <TaskManagementPanel
            dishOptions={data.dishOptions}
            initialItems={data.tasks}
            initialPagination={data.taskPagination}
            initialSummary={data.taskSummary}
            store={
              activeStore
                ? {
                    id: activeStore.id,
                    name: activeStore.name,
                  }
                : null
            }
          />
        ) : null}

        {activeSection === "admin-users" ? (
          <SystemManagementPanel
            initialAdminUsers={data.adminUsers}
            initialPagination={data.adminUserPagination}
            initialSummary={data.adminUserSummary}
            roles={data.roles}
            stores={data.stores.map((store) => ({
              id: store.id,
              name: store.name,
            }))}
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
          <SystemSettingsPanel
            initialSettings={data.systemSettings}
            store={
              activeStore
                ? {
                    id: activeStore.id,
                    name: activeStore.name,
                  }
                : null
            }
          />
        ) : null}
      </main>
    </AdminShell>
  );
}
