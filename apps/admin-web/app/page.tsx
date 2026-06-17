import { redirect } from "next/navigation";

import { listUserPackages, prisma } from "@hentor/db";

import { ADMIN_NAV_GROUPS } from "@/app/lib/admin-navigation";
import { getAdminSession } from "@/app/lib/session";

import { AdminShell } from "./ui/admin-shell";
import { LogoutButton } from "./ui/logout-button";
import { OrderModalPreview } from "./ui/order-modal-preview";
import {
  PackageManagementPanel,
  type PackagePanelItem,
} from "./ui/package-management-panel";

async function getDashboardData() {
  const stores = await prisma.store.findMany({
    orderBy: { createdAt: "asc" },
    include: { franchisee: true },
  });
  const activeStore = stores[0] ?? null;

  const [members, orders, activePackages, latestOrders, userPackages] =
    await Promise.all([
      prisma.memberStoreBinding.count({ where: { status: "ACTIVE" } }),
      prisma.order.count(),
      prisma.userPackage.count({ where: { status: "ACTIVE" } }),
      prisma.order.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: {
          store: true,
          user: true,
          items: true,
        },
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
    latestOrders,
    members,
    orders,
    stores,
    userPackages: userPackages.items.map(serializePackagePanelItem),
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

const ORDER_STATUS_LABELS: Record<string, string> = {
  CANCELED: "已取消",
  PENDING_SHIPMENT: "待配送",
  SHIPPED: "已发货",
  SIGNED: "已签收",
  VOIDED: "已作废",
};

export default async function DashboardPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  const data = await getDashboardData();
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
          <select className="h-11 rounded-xl border border-[#dbe6dc] bg-white px-4 text-sm font-medium outline-none">
            {data.stores.map((store) => (
              <option key={store.id}>{store.name}</option>
            ))}
          </select>
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
          <div className="rounded-2xl border border-[#dbe6dc] bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">订单列表</h2>
                <p className="mt-1 text-sm text-[#66756d]">
                  弹窗支持拖拽、全屏和伸缩，列表保持清晰扫描。
                </p>
              </div>
              <OrderModalPreview />
            </div>
            <div className="overflow-hidden rounded-xl border border-[#dbe6dc]">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-[#f5f8f3] text-[#66756d]">
                  <tr>
                    <th className="px-4 py-3 font-medium">订单号</th>
                    <th className="px-4 py-3 font-medium">会员</th>
                    <th className="px-4 py-3 font-medium">门店</th>
                    <th className="px-4 py-3 font-medium">重量</th>
                    <th className="px-4 py-3 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf2ed]">
                  {data.latestOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-4 font-medium">{order.orderNo}</td>
                      <td className="px-4 py-4">
                        {order.user.nickname ?? order.user.phone}
                      </td>
                      <td className="px-4 py-4">{order.store.name}</td>
                      <td className="px-4 py-4">{Number(order.totalWeightJin)} 斤</td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-[#e8f6ed] px-3 py-1 text-xs font-semibold text-[#1f8f4f]">
                          {ORDER_STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

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
