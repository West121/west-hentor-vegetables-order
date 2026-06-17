import {
  findAvailableMiniappStore,
  getActiveTaskForStore,
  getMiniappEditableOrder,
  prisma,
  Prisma,
} from "@hentor/db";
import { calculateReservationSummary, storeCodeSchema } from "@hentor/shared";

import { fail, ok } from "@/app/lib/api";
import { requireMiniSession } from "@/app/lib/mini-auth";

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) {
    return 0;
  }

  return Number(value);
}

export async function GET(request: Request) {
  const auth = requireMiniSession(request);
  if (!auth.session) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const storeCode = searchParams.get("storeCode") ?? "lotus-garden";
  const orderId = searchParams.get("orderId");
  const parsedStoreCode = storeCodeSchema.safeParse(storeCode);

  if (!parsedStoreCode.success) {
    return fail("INVALID_STORE_CODE", "门店编码不正确");
  }

  const store = await findAvailableMiniappStore({
    storeCode: parsedStoreCode.data,
    storeId: auth.session.storeId,
  });

  if (!store) {
    return fail("STORE_NOT_FOUND", "门店不存在或已停用", 404);
  }

  const [userPackage, activeTask, fallbackDishes, order] = await Promise.all([
    prisma.userPackage.findFirst({
      where: {
        userId: auth.session.userId,
        storeId: store.id,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
      include: { user: true },
    }),
    getActiveTaskForStore({ storeId: store.id }),
    prisma.dish.findMany({
      where: {
        storeId: store.id,
        status: "ON_SALE",
        deletedAt: null,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    getMiniappEditableOrder({
      orderId,
      storeId: store.id,
      userId: auth.session.userId,
    }),
  ]);
  const dishes = activeTask?.dishes ?? fallbackDishes;
  const defaultAddress = userPackage
    ? await prisma.address.findFirst({
        where: {
          userId: userPackage.userId,
          storeId: store.id,
          isDefault: true,
        },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const selectedItems = order?.items ?? [];
  const summary = calculateReservationSummary(
    selectedItems,
    toNumber(userPackage?.weightLimitJin),
  );

  return ok({
    store: {
      id: store.id,
      code: store.code,
      name: store.name,
      cutoffTime: activeTask?.cutoffTime ?? store.cutoffTime,
      customerServiceTel: store.customerServiceTel,
    },
    task: activeTask
      ? {
          cutoffTime: activeTask.cutoffTime,
          endsAt: activeTask.endsAt.toISOString(),
          id: activeTask.id,
          name: activeTask.name,
          startsAt: activeTask.startsAt.toISOString(),
          tag: activeTask.tag,
        }
      : null,
    package: userPackage
      ? {
          id: userPackage.id,
          storeId: userPackage.storeId,
          userId: userPackage.userId,
          name: userPackage.nameSnapshot,
          totalTimes: userPackage.totalTimes,
          usedTimes: userPackage.usedTimes,
          remainingTimes: Math.max(
            userPackage.totalTimes - userPackage.usedTimes,
            0,
          ),
          weightLimitJin: toNumber(userPackage.weightLimitJin),
          expiresAt: userPackage.expiresAt.toISOString(),
        }
      : null,
    member: userPackage
      ? {
          id: userPackage.user.id,
          nickname: userPackage.user.nickname,
          phone: userPackage.user.phone,
        }
      : null,
    defaultAddress: defaultAddress
      ? {
          id: defaultAddress.id,
          receiverName: defaultAddress.receiverName,
          receiverPhone: defaultAddress.receiverPhone,
          detail: defaultAddress.detail,
        }
      : null,
    dishes: dishes.map((dish) => ({
      id: dish.id,
      name: dish.name,
      category: dish.category,
      stepJin: toNumber(dish.stepJin),
      stockJin: toNumber(dish.stockJin),
      imageUrl: dish.imageUrl,
      description: dish.description,
    })),
    currentOrder: order
      ? {
          id: order.id,
          orderNo: order.orderNo,
          addressId: order.addressId,
          status: order.status,
          totalWeightJin: order.totalWeightJin,
          address: order.address,
          items: selectedItems,
          summary,
        }
      : null,
  });
}
