import { prisma, Prisma } from "@hentor/db";
import { calculateReservationSummary, storeCodeSchema } from "@hentor/shared";

import { fail, ok } from "@/app/lib/api";

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) {
    return 0;
  }

  return Number(value);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeCode = searchParams.get("storeCode") ?? "lotus-garden";
  const parsedStoreCode = storeCodeSchema.safeParse(storeCode);

  if (!parsedStoreCode.success) {
    return fail("INVALID_STORE_CODE", "门店编码不正确");
  }

  const store = await prisma.store.findUnique({
    where: { code: parsedStoreCode.data },
  });

  if (!store || store.status !== "ACTIVE") {
    return fail("STORE_NOT_FOUND", "门店不存在或已停用", 404);
  }

  const [userPackage, dishes, order] = await Promise.all([
    prisma.userPackage.findFirst({
      where: {
        storeId: store.id,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
      include: { user: true },
    }),
    prisma.dish.findMany({
      where: {
        storeId: store.id,
        status: "ON_SALE",
        deletedAt: null,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.order.findFirst({
      where: {
        storeId: store.id,
        status: "PENDING_SHIPMENT",
        deletedByUserAt: null,
      },
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        address: true,
      },
    }),
  ]);
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

  const selectedItems =
    order?.items.map((item) => ({
      dishId: item.dishId,
      name: item.dishNameSnapshot,
      weightJin: toNumber(item.weightJin),
    })) ?? [];
  const summary = calculateReservationSummary(
    selectedItems,
    toNumber(userPackage?.weightLimitJin),
  );

  return ok({
    store: {
      id: store.id,
      code: store.code,
      name: store.name,
      cutoffTime: store.cutoffTime,
      customerServiceTel: store.customerServiceTel,
    },
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
          totalWeightJin: toNumber(order.totalWeightJin),
          address: order.address
            ? {
                receiverName: order.address.receiverName,
                receiverPhone: order.address.receiverPhone,
                detail: order.address.detail,
              }
            : order.addressSnapshot,
          items: selectedItems,
          summary,
        }
      : null,
  });
}
