import { Prisma } from "./generated/prisma/client";
import { prisma } from "./client";

export class ReservationServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ReservationServiceError";
  }
}

export type SubmitReservationInput = {
  addressId: string;
  items: Array<{
    dishId: string;
    weightJin: number;
  }>;
  orderId?: string;
  storeId: string;
  userId: string;
  userPackageId: string;
  userVisibleRemark?: string;
};

type NormalizedItem = {
  dishId: string;
  dishNameSnapshot: string;
  stepJinSnapshot: Prisma.Decimal;
  weightJin: Prisma.Decimal;
};

export type SubmittedReservation = {
  id: string;
  orderNo: string;
  status: string;
  totalWeightJin: number;
  items: Array<{
    dishId: string;
    dishNameSnapshot: string;
    weightJin: number;
  }>;
};

function toNumber(value: Prisma.Decimal | number) {
  return Number(value);
}

function formatDatePart(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function createOrderNo(now = new Date()) {
  const timePart = String(now.getTime()).slice(-8);
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `OD${formatDatePart(now)}${timePart}${randomPart}`;
}

function assertStep(weight: number, step: number) {
  const ratio = weight / step;
  return Math.abs(ratio - Math.round(ratio)) < 0.000001;
}

function snapshotItems(items: NormalizedItem[]) {
  return items.map((item) => ({
    dishId: item.dishId,
    dishNameSnapshot: item.dishNameSnapshot,
    weightJin: toNumber(item.weightJin),
  }));
}

function formatOrder(order: {
  id: string;
  orderNo: string;
  status: string;
  totalWeightJin: Prisma.Decimal;
  items: Array<{
    dishId: string;
    dishNameSnapshot: string;
    weightJin: Prisma.Decimal;
  }>;
}): SubmittedReservation {
  return {
    id: order.id,
    orderNo: order.orderNo,
    status: order.status,
    totalWeightJin: toNumber(order.totalWeightJin),
    items: order.items.map((item) => ({
      dishId: item.dishId,
      dishNameSnapshot: item.dishNameSnapshot,
      weightJin: toNumber(item.weightJin),
    })),
  };
}

function sumWeightsByDishId(
  items: Array<{
    dishId: string;
    weightJin: Prisma.Decimal;
  }>,
) {
  const result = new Map<string, Prisma.Decimal>();

  for (const item of items) {
    result.set(
      item.dishId,
      (result.get(item.dishId) ?? new Prisma.Decimal("0")).plus(item.weightJin),
    );
  }

  return result;
}

async function applyInventoryDelta(
  tx: Prisma.TransactionClient,
  input: {
    currentStockByDishId: Map<string, Prisma.Decimal>;
    newWeightsByDishId: Map<string, Prisma.Decimal>;
    oldWeightsByDishId: Map<string, Prisma.Decimal>;
  },
) {
  const dishIds = new Set([
    ...input.oldWeightsByDishId.keys(),
    ...input.newWeightsByDishId.keys(),
  ]);

  for (const dishId of dishIds) {
    const oldWeight =
      input.oldWeightsByDishId.get(dishId) ?? new Prisma.Decimal("0");
    const newWeight =
      input.newWeightsByDishId.get(dishId) ?? new Prisma.Decimal("0");
    const delta = oldWeight.minus(newWeight);

    if (delta.equals(0)) {
      continue;
    }

    const currentStock =
      input.currentStockByDishId.get(dishId) ?? new Prisma.Decimal("0");
    const nextStock = currentStock.plus(delta);

    await tx.dish.update({
      where: { id: dishId },
      data: {
        stockJin: nextStock,
        ...(nextStock.equals(0) ? { status: "OFF_SALE" } : {}),
      },
    });
  }
}

export async function submitReservation(input: SubmitReservationInput) {
  if (!input.items.length) {
    throw new ReservationServiceError("EMPTY_ITEMS", "请选择菜品");
  }

  return prisma.$transaction(async (tx) => {
    const userPackage = await tx.userPackage.findFirst({
      where: {
        id: input.userPackageId,
        storeId: input.storeId,
        userId: input.userId,
      },
    });

    if (!userPackage) {
      throw new ReservationServiceError("PACKAGE_NOT_FOUND", "套餐不存在");
    }

    if (userPackage.status === "FROZEN") {
      throw new ReservationServiceError(
        "PACKAGE_UNAVAILABLE",
        "套餐已冻结，暂不能预订",
      );
    }

    if (userPackage.status !== "ACTIVE" || userPackage.expiresAt < new Date()) {
      throw new ReservationServiceError("PACKAGE_UNAVAILABLE", "套餐不可用");
    }

    const address = await tx.address.findFirst({
      where: {
        id: input.addressId,
        storeId: input.storeId,
        userId: input.userId,
      },
    });

    if (!address) {
      throw new ReservationServiceError("ADDRESS_NOT_FOUND", "配送地址不存在");
    }

    const newDishIds = [...new Set(input.items.map((item) => item.dishId))];
    if (newDishIds.length !== input.items.length) {
      throw new ReservationServiceError("DUPLICATE_DISH", "菜品不能重复提交");
    }

    const existingOrder = input.orderId
      ? await tx.order.findFirst({
          where: {
            id: input.orderId,
            storeId: input.storeId,
            userId: input.userId,
            userPackageId: input.userPackageId,
            status: "PENDING_SHIPMENT",
            deletedByUserAt: null,
          },
          include: {
            items: true,
          },
        })
      : null;

    if (input.orderId && !existingOrder) {
      throw new ReservationServiceError("ORDER_NOT_EDITABLE", "当前订单不可修改");
    }

    const oldWeightsByDishId = sumWeightsByDishId(existingOrder?.items ?? []);
    const dishIds = [...new Set([...newDishIds, ...oldWeightsByDishId.keys()])];
    const dishes = await tx.dish.findMany({
      where: {
        id: { in: dishIds },
        storeId: input.storeId,
        deletedAt: null,
      },
    });
    const dishById = new Map(dishes.map((dish) => [dish.id, dish]));
    const currentStockByDishId = new Map(
      dishes.map((dish) => [dish.id, dish.stockJin]),
    );

    const normalizedItems: NormalizedItem[] = input.items.map((item) => {
      const dish = dishById.get(item.dishId);
      if (!dish) {
        throw new ReservationServiceError("DISH_NOT_FOUND", "菜品不存在或已下架");
      }

      if (dish.status !== "ON_SALE") {
        throw new ReservationServiceError("DISH_NOT_FOUND", "菜品不存在或已下架");
      }

      if (item.weightJin <= 0) {
        throw new ReservationServiceError("INVALID_WEIGHT", "菜品重量必须大于 0");
      }

      if (!assertStep(item.weightJin, toNumber(dish.stepJin))) {
        throw new ReservationServiceError("INVALID_WEIGHT_STEP", "菜品重量不符合起订步进");
      }

      const reservedWeight =
        oldWeightsByDishId.get(item.dishId) ?? new Prisma.Decimal("0");
      const availableStock = dish.stockJin.plus(reservedWeight);
      if (item.weightJin > toNumber(availableStock)) {
        throw new ReservationServiceError("DISH_STOCK_NOT_ENOUGH", "菜品库存不足");
      }

      return {
        dishId: dish.id,
        dishNameSnapshot: dish.name,
        stepJinSnapshot: dish.stepJin,
        weightJin: new Prisma.Decimal(item.weightJin.toFixed(2)),
      };
    });

    const totalWeightJin = normalizedItems.reduce(
      (sum, item) => sum.plus(item.weightJin),
      new Prisma.Decimal("0"),
    );

    if (totalWeightJin.gt(userPackage.weightLimitJin)) {
      throw new ReservationServiceError(
        "WEIGHT_LIMIT_EXCEEDED",
        "已超过套餐本次可预订重量",
      );
    }

    const addressSnapshot = {
      receiverName: address.receiverName,
      receiverPhone: address.receiverPhone,
      province: address.province,
      city: address.city,
      district: address.district,
      detail: address.detail,
    };
    const newWeightsByDishId = sumWeightsByDishId(normalizedItems);

    if (input.orderId) {
      const editableOrder = existingOrder!;
      const beforeItems = editableOrder.items.map((item) => ({
        dishId: item.dishId,
        dishNameSnapshot: item.dishNameSnapshot,
        weightJin: toNumber(item.weightJin),
      }));

      await tx.orderItem.deleteMany({
        where: { orderId: editableOrder.id },
      });

      await applyInventoryDelta(tx, {
        currentStockByDishId,
        newWeightsByDishId,
        oldWeightsByDishId,
      });

      const order = await tx.order.update({
        where: { id: editableOrder.id },
        data: {
          addressId: address.id,
          addressSnapshot,
          modifiedAt: new Date(),
          totalWeightJin,
          userVisibleRemark: input.userVisibleRemark,
          items: {
            create: normalizedItems.map((item) => ({
              dishId: item.dishId,
              dishNameSnapshot: item.dishNameSnapshot,
              stepJinSnapshot: item.stepJinSnapshot,
              weightJin: item.weightJin,
            })),
          },
        },
        include: { items: true },
      });

      await tx.orderChangeLog.create({
        data: {
          orderId: order.id,
          beforeAddress:
            editableOrder.addressSnapshot === null
              ? Prisma.JsonNull
              : (editableOrder.addressSnapshot as Prisma.InputJsonValue),
          afterAddress: addressSnapshot,
          beforeItems,
          afterItems: snapshotItems(normalizedItems),
          source: "MINIAPP",
        },
      });

      return formatOrder(order);
    }

    if (userPackage.usedTimes >= userPackage.totalTimes) {
      throw new ReservationServiceError("PACKAGE_USED_UP", "套餐次数已用完");
    }

    await applyInventoryDelta(tx, {
      currentStockByDishId,
      newWeightsByDishId,
      oldWeightsByDishId,
    });

    const order = await tx.order.create({
      data: {
        addressId: address.id,
        addressSnapshot,
        orderNo: createOrderNo(),
        storeId: input.storeId,
        totalWeightJin,
        userId: input.userId,
        userPackageId: input.userPackageId,
        userVisibleRemark: input.userVisibleRemark,
        items: {
          create: normalizedItems.map((item) => ({
            dishId: item.dishId,
            dishNameSnapshot: item.dishNameSnapshot,
            stepJinSnapshot: item.stepJinSnapshot,
            weightJin: item.weightJin,
          })),
        },
      },
      include: { items: true },
    });

    await tx.userPackage.update({
      where: { id: userPackage.id },
      data: {
        usedTimes: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

    return formatOrder(order);
  });
}
