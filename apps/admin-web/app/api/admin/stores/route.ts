import { listAccessibleStores, prisma } from "@hentor/db";

import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const access = await listAccessibleStores(session.adminUserId);
  const stores = await prisma.store.findMany({
    where: {
      id: { in: access.stores.map((store) => store.id) },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      franchisee: true,
      _count: {
        select: {
          orders: true,
          memberBindings: true,
        },
      },
    },
  });

  return ok({
    stores: stores.map((store) => ({
      id: store.id,
      code: store.code,
      name: store.name,
      type: store.type,
      status: store.status,
      franchiseeName: store.franchisee?.name ?? "总部直营",
      contactName: store.contactName,
      contactPhone: store.contactPhone,
      address: [store.province, store.city, store.district, store.address]
        .filter(Boolean)
        .join(" "),
      cutoffTime: store.cutoffTime,
      orderCount: store._count.orders,
      memberCount: store._count.memberBindings,
    })),
  });
}
