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

    const dishIds = [...new Set(input.items.map((item) => item.dishId))];
    if (dishIds.length !== input.items.length) {
      throw new ReservationServiceError("DUPLICATE_DISH", "菜品不能重复提交");
    }

    const dishes = await tx.dish.findMany({
      where: {
        id: { in: dishIds },
        storeId: input.storeId,
        status: "ON_SALE",
        deletedAt: null,
      },
    });
    const dishById = new Map(dishes.map((dish) => [dish.id, dish]));

    const normalizedItems: NormalizedItem[] = input.items.map((item) => {
      const dish = dishById.get(item.dishId);
      if (!dish) {
        throw new ReservationServiceError("DISH_NOT_FOUND", "菜品不存在或已下架");
      }

      if (item.weightJin <= 0) {
        throw new ReservationServiceError("INVALID_WEIGHT", "菜品重量必须大于 0");
      }

      if (!assertStep(item.weightJin, toNumber(dish.stepJin))) {
        throw new ReservationServiceError("INVALID_WEIGHT_STEP", "菜品重量不符合起订步进");
      }

      if (item.weightJin > toNumber(dish.stockJin)) {
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

    if (input.orderId) {
      const existingOrder = await tx.order.findFirst({
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
      });

      if (!existingOrder) {
        throw new ReservationServiceError("ORDER_NOT_EDITABLE", "当前订单不可修改");
      }

      const beforeItems = existingOrder.items.map((item) => ({
        dishId: item.dishId,
        dishNameSnapshot: item.dishNameSnapshot,
        weightJin: toNumber(item.weightJin),
      }));

      await tx.orderItem.deleteMany({
        where: { orderId: existingOrder.id },
      });

      const order = await tx.order.update({
        where: { id: existingOrder.id },
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
            existingOrder.addressSnapshot === null
              ? Prisma.JsonNull
              : (existingOrder.addressSnapshot as Prisma.InputJsonValue),
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
