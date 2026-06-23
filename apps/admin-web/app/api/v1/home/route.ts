import {
  findAvailableMiniappStore,
  getActiveTaskForStore,
  getMiniappCurrentPackage,
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

function formatFullAddress(address: {
  city?: string | null;
  detail?: string | null;
  district?: string | null;
  fullAddress?: string | null;
  province?: string | null;
}) {
  const explicit = address.fullAddress?.trim();
  if (explicit) {
    return explicit;
  }

  return [address.province, address.city, address.district, address.detail]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ");
}

function addressView(address: {
  city: string | null;
  detail: string;
  district: string | null;
  id: string;
  isDefault?: boolean;
  province: string | null;
  receiverName: string;
  receiverPhone: string;
}) {
  return {
    city: address.city,
    detail: address.detail,
    district: address.district,
    fullAddress: formatFullAddress(address),
    id: address.id,
    isDefault: address.isDefault,
    province: address.province,
    receiverName: address.receiverName,
    receiverPhone: address.receiverPhone,
  };
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

  const [userPackage, activeTask, fallbackDishes, order, memberBinding, defaultAddress] =
    await Promise.all([
      getMiniappCurrentPackage({
        storeId: store.id,
        userId: auth.session.userId,
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
      prisma.memberStoreBinding.findFirst({
        where: {
          storeId: store.id,
          userId: auth.session.userId,
        },
        include: {
          user: {
            select: {
              disabledReason: true,
              id: true,
              nickname: true,
              phone: true,
              status: true,
            },
          },
        },
      }),
      prisma.address.findFirst({
        where: {
          userId: auth.session.userId,
          storeId: store.id,
          isDefault: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);
  const dishes = activeTask?.dishes ?? fallbackDishes;

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
          status: userPackage.status,
	          frozenReason: userPackage.frozenReason,
	          benefits: userPackage.benefits,
	          weightLimitJin: toNumber(userPackage.weightLimitJin),
	        }
      : null,
    member: memberBinding
      ? {
          bindingStatus: memberBinding.status,
          disabledReason: memberBinding.user.disabledReason,
          id: memberBinding.user.id,
          nickname: memberBinding.user.nickname,
          phone: memberBinding.user.phone,
          status: memberBinding.user.status,
        }
      : null,
    defaultAddress: defaultAddress
      ? addressView(defaultAddress)
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
	          benefits: order.benefits,
	          items: selectedItems,
	          summary,
	        }
      : null,
  });
}
