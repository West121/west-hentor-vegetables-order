import { redirect } from "next/navigation";

import {
  listDishes,
  listPackageTemplates,
  listStoreMembers,
  listStoreOrders,
  listTasks,
  listUserPackages,
  prisma,
} from "@hentor/db";

import { ADMIN_NAV_GROUPS } from "@/app/lib/admin-navigation";
import { getAdminSession } from "@/app/lib/session";

import { AdminShell } from "./ui/admin-shell";
import { DishManagementPanel, type DishPanelItem } from "./ui/dish-management-panel";
import { LogoutButton } from "./ui/logout-button";
import {
  OrderManagementPanel,
  type OrderPanelItem,
} from "./ui/order-management-panel";
import {
  MemberManagementPanel,
  type MemberPanelItem,
} from "./ui/member-management-panel";
import {
  PackageManagementPanel,
  type PackagePanelItem,
} from "./ui/package-management-panel";
import {
  PackageTemplateManagementPanel,
  type PackageTemplatePanelItem,
} from "./ui/package-template-management-panel";
import { StoreSwitcher } from "./ui/store-switcher";
import {
  TaskManagementPanel,
  type TaskDishOption,
  type TaskPanelItem,
} from "./ui/task-management-panel";

async function getDashboardData(selectedStoreId?: string) {
  const stores = await prisma.store.findMany({
    orderBy: { createdAt: "asc" },
    include: { franchisee: true },
  });
  const activeStore =
    stores.find((store) => store.id === selectedStoreId) ?? stores[0] ?? null;

  const [
    members,
    orders,
    activePackages,
    storeOrders,
    storeMembers,
    packageTemplates,
    dishes,
    tasks,
    userPackages,
  ] = await Promise.all([
      prisma.memberStoreBinding.count({ where: { status: "ACTIVE" } }),
      prisma.order.count(),
      prisma.userPackage.count({ where: { status: "ACTIVE" } }),
      activeStore
        ? listStoreOrders({ storeId: activeStore.id, take: 10 })
        : Promise.resolve({
            items: [],
            summary: {
              canceled: 0,
              pendingShipment: 0,
              shipped: 0,
              signed: 0,
              total: 0,
            },
          }),
      activeStore
        ? listStoreMembers({ storeId: activeStore.id })
        : Promise.resolve({
            items: [],
            summary: { active: 0, disabled: 0, total: 0 },
          }),
      activeStore
        ? listPackageTemplates({ storeId: activeStore.id })
        : Promise.resolve({
            items: [],
            summary: { active: 0, disabled: 0, total: 0 },
          }),
      activeStore
        ? listDishes({ storeId: activeStore.id })
        : Promise.resolve({
            items: [],
            summary: { offSale: 0, onSale: 0, total: 0 },
          }),
      activeStore
        ? listTasks({ storeId: activeStore.id })
        : Promise.resolve({
            items: [],
            summary: { active: 0, disabled: 0, draft: 0, total: 0 },
          }),
      activeStore
        ? listUserPackages({ storeId: activeStore.id })
        : Promise.resolve({
            items: [],
            summary: { active: 0, expired: 0, frozen: 0, total: 0 },
          }),
    ]);

  return {
    activeStore,
    activePackages,
    dishes: dishes.items.map(serializeDishPanelItem),
    dishOptions: dishes.items.map(serializeTaskDishOption),
    members,
    packageTemplates: packageTemplates.items.map(serializePackageTemplatePanelItem),
    storeMembers: storeMembers.items.map(serializeMemberPanelItem),
    orders,
    storeOrders: storeOrders.items.map(serializeOrderPanelItem),
    stores,
    tasks: tasks.items.map(serializeTaskPanelItem),
    userPackages: userPackages.items.map(serializePackagePanelItem),
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
    signedAt: item.signedAt?.toISOString() ?? null,
    updatedAt: item.updatedAt.toISOString(),
  };
}

function serializePackagePanelItem(
  item: Awaited<ReturnType<typeof listUserPackages>>["items"][number],
): PackagePanelItem {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    expiresAt: item.expiresAt.toISOString(),
    lastUsedAt: item.lastUsedAt?.toISOString() ?? null,
    nextOrderDate: item.nextOrderDate?.toISOString() ?? null,
    startsAt: item.startsAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ storeId?: string }>;
}) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const data = await getDashboardData(params?.storeId);
  const activeStore = data.activeStore;

  return (
    <AdminShell brand="Hentor Fresh" groups={ADMIN_NAV_GROUPS}>
      <header className="flex min-h-20 items-center justify-between border-b border-[#dbe6dc] bg-white px-7">
        <div>
          <div className="text-sm font-medium text-[#66756d]">运营工作台</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal">
            {activeStore?.name ?? "全部门店"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <StoreSwitcher
            activeStoreId={activeStore?.id ?? null}
            stores={data.stores.map((store) => ({
              id: store.id,
              name: store.name,
            }))}
          />
          <div className="flex items-center gap-3 rounded-2xl border border-[#dbe6dc] bg-[#f8fbf7] px-4 py-2">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#1f8f4f] text-sm font-semibold text-white">
              {session.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{session.name}</div>
              <div className="text-xs text-[#66756d]">超级管理员 · 全部门店</div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="space-y-6 p-7">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["加盟门店", data.stores.length, "总部可看全部，门店按授权过滤"],
            ["活跃会员", data.members, "会员与门店绑定，不混同后台用户"],
            ["有效套餐", data.activePackages, "支持冻结、延期、次数调整"],
            ["累计订单", data.orders, "详情/编辑/新建统一弹窗打开"],
          ].map(([label, value, desc]) => (
            <div
              className="rounded-2xl border border-[#dbe6dc] bg-white p-5 shadow-sm"
              key={label}
            >
              <div className="text-sm font-medium text-[#66756d]">{label}</div>
              <div className="mt-3 text-3xl font-semibold">{value}</div>
              <div className="mt-3 text-sm leading-6 text-[#66756d]">{desc}</div>
            </div>
          ))}
        </section>

        <OrderManagementPanel
          initialItems={data.storeOrders}
          store={
            activeStore
              ? {
                  id: activeStore.id,
                  name: activeStore.name,
                }
              : null
          }
        />

        <MemberManagementPanel
          initialItems={data.storeMembers}
          store={
            activeStore
              ? {
                  id: activeStore.id,
                  name: activeStore.name,
                }
              : null
          }
        />

        <PackageTemplateManagementPanel
          initialItems={data.packageTemplates}
          store={
            activeStore
              ? {
                  id: activeStore.id,
                  name: activeStore.name,
                }
              : null
          }
        />

        <DishManagementPanel
          initialItems={data.dishes}
          store={
            activeStore
              ? {
                  id: activeStore.id,
                  name: activeStore.name,
                }
              : null
          }
        />

        <TaskManagementPanel
          dishOptions={data.dishOptions}
          initialItems={data.tasks}
          store={
            activeStore
              ? {
                  id: activeStore.id,
                  name: activeStore.name,
                }
              : null
          }
        />

        <PackageManagementPanel
          initialItems={data.userPackages}
          store={
            activeStore
              ? {
                  id: activeStore.id,
                  name: activeStore.name,
                }
              : null
          }
        />

        <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <aside className="space-y-5">
            <div className="rounded-2xl border border-[#dbe6dc] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">门店加盟模型</h2>
              <div className="mt-4 space-y-4">
                {data.stores.map((store) => (
                  <div className="rounded-xl border border-[#edf2ed] p-4" key={store.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{store.name}</div>
                        <div className="mt-1 truncate text-xs text-[#66756d]">
                          {store.franchisee?.name ?? "总部直营"}
                        </div>
                      </div>
                      <span className="rounded-full bg-[#f3f7f1] px-2.5 py-1 text-xs">
                        {store.type === "FRANCHISE" ? "加盟" : "直营"}
                      </span>
                    </div>
                    <div className="mt-3 text-sm text-[#66756d]">
                      截单 {store.cutoffTime} · {store.contactName}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#dbe6dc] bg-[#f9fff9] p-5 shadow-sm">
              <h2 className="text-lg font-semibold">支付预留</h2>
              <p className="mt-3 text-sm leading-6 text-[#66756d]">
                套餐购买已预留 purchase order、payment order 和微信支付字段，当前状态为未启用支付。
              </p>
            </div>
          </aside>
        </section>
      </main>
    </AdminShell>
  );
}
