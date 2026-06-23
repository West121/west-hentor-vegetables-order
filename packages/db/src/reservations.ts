import { Prisma } from "./generated/prisma/client";
import { prisma } from "./client";
import { getBusinessClockMinutes, getBusinessDayRange } from "./business-day";
import { getDeliveryRangeFailure } from "./delivery-range";

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
  benefitSelections?: Array<{
    quantity: number;
    userPackageBenefitId: string;
  }>;
  items: Array<{
    dishId: string;
    weightJin: number;
  }>;
  now?: Date;
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

type NormalizedBenefit = {
  id: string;
  kind: string;
  nameSnapshot: string;
  quantity: Prisma.Decimal;
  shipmentGroup: string | null;
  unitSnapshot: string;
};

type PackageBenefitForSelection = {
  id: string;
  kind: string;
  nameSnapshot: string;
  shipmentGroup: string | null;
  totalQuantity: Prisma.Decimal;
  unitSnapshot: string;
  usedQuantity: Prisma.Decimal;
};

type ExistingOrderBenefitForSelection = {
  quantity: Prisma.Decimal;
  userPackageBenefitId: string | null;
};

export type SubmittedReservation = {
  benefits: Array<{
    kind: string;
    nameSnapshot: string;
    quantity: number;
    unitSnapshot: string;
  }>;
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

async function findFirstUsableUserPackage(
  tx: Prisma.TransactionClient,
  input: { storeId: string; userId: string },
) {
  const packages = await tx.userPackage.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      totalTimes: true,
      usedTimes: true,
    },
    where: {
      status: "ACTIVE",
      storeId: input.storeId,
      userId: input.userId,
    },
  });

  return packages.find((item) => item.usedTimes < item.totalTimes) ?? null;
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

function isPastCutoff(cutoffTime: string, now: Date) {
  const matched = cutoffTime.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!matched) {
    return false;
  }

  const hour = Number(matched[1]);
  const minute = Number(matched[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return false;
  }

  return getBusinessClockMinutes(now) >= hour * 60 + minute;
}

function snapshotItems(items: NormalizedItem[]) {
  return items.map((item) => ({
    dishId: item.dishId,
    dishNameSnapshot: item.dishNameSnapshot,
    weightJin: toNumber(item.weightJin),
  }));
}

function formatOrder(order: {
  benefitItems?: Array<{
    kind: string;
    nameSnapshot: string;
    quantity: Prisma.Decimal;
    unitSnapshot: string;
  }>;
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
    benefits:
      order.benefitItems?.map((benefit) => ({
        kind: benefit.kind,
        nameSnapshot: benefit.nameSnapshot,
        quantity: toNumber(benefit.quantity),
        unitSnapshot: benefit.unitSnapshot,
      })) ?? [],
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

function remainingBenefitQuantity(benefit: {
  totalQuantity: Prisma.Decimal;
  usedQuantity: Prisma.Decimal;
}) {
  const remaining = benefit.totalQuantity.minus(benefit.usedQuantity);
  return remaining.gt(0) ? remaining : new Prisma.Decimal("0");
}

function sumExistingBenefitQuantitiesById(
  benefits: ExistingOrderBenefitForSelection[] = [],
) {
  const result = new Map<string, Prisma.Decimal>();

  for (const benefit of benefits) {
    if (!benefit.userPackageBenefitId) {
      continue;
    }

    result.set(
      benefit.userPackageBenefitId,
      (result.get(benefit.userPackageBenefitId) ?? new Prisma.Decimal("0")).plus(
        benefit.quantity,
      ),
    );
  }

  return result;
}

function restoreEditableBenefitAllowance<T extends PackageBenefitForSelection>(
  benefits: T[],
  existingBenefits: ExistingOrderBenefitForSelection[] = [],
): T[] {
  const existingQuantityById = sumExistingBenefitQuantitiesById(existingBenefits);

  return benefits.map((benefit) => {
    const existingQuantity =
      existingQuantityById.get(benefit.id) ?? new Prisma.Decimal("0");
    const usedQuantity = benefit.usedQuantity.minus(existingQuantity);

    return {
      ...benefit,
      usedQuantity: usedQuantity.gt(0) ? usedQuantity : new Prisma.Decimal("0"),
    };
  });
}

function normalizeSelectedBenefits(
  benefits: Array<{
    id: string;
    kind: string;
    nameSnapshot: string;
    shipmentGroup: string | null;
    totalQuantity: Prisma.Decimal;
    unitSnapshot: string;
    usedQuantity: Prisma.Decimal;
  }>,
  selections: SubmitReservationInput["benefitSelections"] = [],
): NormalizedBenefit[] {
  const benefitById = new Map(benefits.map((benefit) => [benefit.id, benefit]));
  const seen = new Set<string>();

  return selections.map((selection) => {
    if (seen.has(selection.userPackageBenefitId)) {
      throw new ReservationServiceError(
        "DUPLICATE_BENEFIT",
        "附加权益不能重复选择",
      );
    }
    seen.add(selection.userPackageBenefitId);

    const benefit = benefitById.get(selection.userPackageBenefitId);
    if (!benefit) {
      throw new ReservationServiceError(
        "BENEFIT_NOT_AVAILABLE",
        "附加权益不可用",
      );
    }

    const quantity = new Prisma.Decimal(selection.quantity.toFixed(2));
    if (quantity.lte(0)) {
      throw new ReservationServiceError(
        "INVALID_BENEFIT_QUANTITY",
        "附加权益数量必须大于 0",
      );
    }

    const remaining = remainingBenefitQuantity(benefit);
    if (quantity.gt(remaining)) {
      throw new ReservationServiceError(
        "BENEFIT_QUANTITY_EXCEEDED",
        "附加权益剩余数量不足",
      );
    }

    return {
      id: benefit.id,
      kind: benefit.kind,
      nameSnapshot: benefit.nameSnapshot,
      quantity,
      shipmentGroup: benefit.shipmentGroup,
      unitSnapshot: benefit.unitSnapshot,
    };
  });
}

function buildShipmentCreates(
  benefits: Array<{
    kind: string;
    nameSnapshot: string;
    shipmentGroup: string | null;
  }>,
) {
  const shipments = [
    {
      packageName: "蔬菜包裹",
      packageType: "VEGETABLE",
      sortOrder: 0,
    },
  ];
  const seen = new Set(["VEGETABLE:蔬菜包裹"]);

  for (const benefit of benefits) {
    const packageName = benefit.shipmentGroup?.trim() || `${benefit.nameSnapshot}包裹`;
    const packageType = benefit.kind || "EXTRA";
    const key = `${packageType}:${packageName}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    shipments.push({
      packageName,
      packageType,
      sortOrder: shipments.length,
    });
  }

  return shipments;
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
    const now = input.now ?? new Date();
    const store = await tx.store.findUnique({
      where: { id: input.storeId },
      select: {
        cutoffTime: true,
        deliveryCities: true,
        deliveryProvinces: true,
      },
    });

    if (!store) {
      throw new ReservationServiceError("STORE_NOT_FOUND", "门店不存在");
    }

    const activeTask = await tx.task.findFirst({
      where: {
        endsAt: { gte: now },
        startsAt: { lte: now },
        status: "ACTIVE",
        storeId: input.storeId,
      },
      orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
      select: {
        cutoffTime: true,
        dishes: {
          select: {
            dishId: true,
          },
        },
      },
    });

    if (isPastCutoff(activeTask?.cutoffTime ?? store.cutoffTime, now)) {
      throw new ReservationServiceError(
        "ORDER_CUTOFF_PASSED",
        "今日已截单，不能提交预订",
      );
    }

    const memberBinding = await tx.memberStoreBinding.findFirst({
      where: {
        storeId: input.storeId,
        userId: input.userId,
      },
      include: {
        user: {
          select: {
            disabledReason: true,
            status: true,
          },
        },
      },
    });

    if (!memberBinding) {
      throw new ReservationServiceError(
        "STORE_REQUIRED",
        "请先绑定当前门店后再预订",
      );
    }

    if (
      memberBinding.status !== "ACTIVE" ||
      memberBinding.user.status !== "ACTIVE"
    ) {
      const reason = memberBinding.user.disabledReason?.trim();
      throw new ReservationServiceError(
        "MEMBER_DISABLED",
        reason ? `会员已停用：${reason}` : "会员已停用，暂不能预订",
      );
    }

    const userPackage = await tx.userPackage.findFirst({
      where: {
        id: input.userPackageId,
        storeId: input.storeId,
        userId: input.userId,
      },
      include: {
        benefits: {
          orderBy: { sortOrder: "asc" },
        },
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

    if (userPackage.status !== "ACTIVE") {
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

    const deliveryRangeFailure = getDeliveryRangeFailure(address, store);
    if (deliveryRangeFailure) {
      throw new ReservationServiceError(
        deliveryRangeFailure.code,
        deliveryRangeFailure.message,
      );
    }

    const newDishIds = [...new Set(input.items.map((item) => item.dishId))];
    if (newDishIds.length !== input.items.length) {
      throw new ReservationServiceError("DUPLICATE_DISH", "菜品不能重复提交");
    }

    if (activeTask) {
      const taskDishIds = new Set(
        activeTask.dishes.map((taskDish) => taskDish.dishId),
      );
      if (newDishIds.some((dishId) => !taskDishIds.has(dishId))) {
        throw new ReservationServiceError(
          "DISH_NOT_IN_ACTIVE_TASK",
          "菜品不在今日可预订任务中",
        );
      }
    }

    const { end: todayEnd, start: todayStart } = getBusinessDayRange(now);
    const existingOrder = input.orderId
      ? await tx.order.findFirst({
          where: {
            createdAt: { gte: todayStart, lt: todayEnd },
            id: input.orderId,
            storeId: input.storeId,
            userId: input.userId,
            userPackageId: input.userPackageId,
            status: "PENDING_SHIPMENT",
            deletedByUserAt: null,
          },
          include: {
            benefitItems: true,
            items: true,
          },
        })
      : null;

    if (input.orderId && !existingOrder) {
      throw new ReservationServiceError("ORDER_NOT_EDITABLE", "当前订单不可修改");
    }

    if (!input.orderId) {
      const firstUsablePackage = await findFirstUsableUserPackage(tx, {
        storeId: input.storeId,
        userId: input.userId,
      });

      if (
        firstUsablePackage &&
        firstUsablePackage.id !== input.userPackageId
      ) {
        throw new ReservationServiceError(
          "PACKAGE_NOT_CURRENT",
          "请刷新后使用最早可用套餐预订",
        );
      }

      const existingTodayOrder = await tx.order.findFirst({
        where: {
          createdAt: { gte: todayStart, lt: todayEnd },
          deletedByUserAt: null,
          status: { notIn: ["CANCELED", "VOIDED"] },
          storeId: input.storeId,
          userId: input.userId,
        },
        select: { id: true },
      });

      if (existingTodayOrder) {
        throw new ReservationServiceError(
          "ORDER_ALREADY_EXISTS",
          "今日已提交预订，请修改今日预订",
        );
      }
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
      const benefitSelections =
        input.benefitSelections ??
        editableOrder.benefitItems
          .filter((benefit) => benefit.userPackageBenefitId)
          .map((benefit) => ({
            quantity: toNumber(benefit.quantity),
            userPackageBenefitId: benefit.userPackageBenefitId!,
          }));
      const selectedBenefits = normalizeSelectedBenefits(
        restoreEditableBenefitAllowance(
          userPackage.benefits,
          editableOrder.benefitItems,
        ),
        benefitSelections,
      );

      await tx.orderItem.deleteMany({
        where: { orderId: editableOrder.id },
      });
      await tx.orderBenefitItem.deleteMany({
        where: { orderId: editableOrder.id },
      });
      await tx.orderShipment.deleteMany({
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
          modifiedAt: now,
          totalWeightJin,
          userVisibleRemark: input.userVisibleRemark,
          benefitItems: selectedBenefits.length
            ? {
                create: selectedBenefits.map((benefit) => ({
                  kind: benefit.kind,
                  nameSnapshot: benefit.nameSnapshot,
                  quantity: benefit.quantity,
                  shipmentGroup: benefit.shipmentGroup,
                  unitSnapshot: benefit.unitSnapshot,
                  userPackageBenefitId: benefit.id,
                })),
              }
            : undefined,
          items: {
            create: normalizedItems.map((item) => ({
              dishId: item.dishId,
              dishNameSnapshot: item.dishNameSnapshot,
              stepJinSnapshot: item.stepJinSnapshot,
              weightJin: item.weightJin,
            })),
          },
          shipments: {
            create: buildShipmentCreates(selectedBenefits),
          },
        },
        include: { benefitItems: true, items: true },
      });

      for (const benefit of editableOrder.benefitItems) {
        if (!benefit.userPackageBenefitId) {
          continue;
        }

        await tx.userPackageBenefit.update({
          where: { id: benefit.userPackageBenefitId },
          data: {
            usedQuantity: { decrement: benefit.quantity },
          },
        });
      }

      for (const benefit of selectedBenefits) {
        await tx.userPackageBenefit.update({
          where: { id: benefit.id },
          data: {
            usedQuantity: { increment: benefit.quantity },
          },
        });
      }

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

    const selectedBenefits = normalizeSelectedBenefits(
      userPackage.benefits,
      input.benefitSelections,
    );

    const order = await tx.order.create({
      data: {
        addressId: address.id,
        addressSnapshot,
        createdAt: now,
        orderNo: createOrderNo(now),
        storeId: input.storeId,
        totalWeightJin,
        userId: input.userId,
        userPackageId: input.userPackageId,
        userVisibleRemark: input.userVisibleRemark,
        benefitItems: selectedBenefits.length
          ? {
              create: selectedBenefits.map((benefit) => ({
                kind: benefit.kind,
                nameSnapshot: benefit.nameSnapshot,
                quantity: benefit.quantity,
                shipmentGroup: benefit.shipmentGroup,
                unitSnapshot: benefit.unitSnapshot,
                userPackageBenefitId: benefit.id,
              })),
            }
          : undefined,
        items: {
          create: normalizedItems.map((item) => ({
            dishId: item.dishId,
            dishNameSnapshot: item.dishNameSnapshot,
            stepJinSnapshot: item.stepJinSnapshot,
            weightJin: item.weightJin,
          })),
        },
        shipments: {
          create: buildShipmentCreates(selectedBenefits),
        },
      },
      include: { benefitItems: true, items: true },
    });

    await tx.userPackage.update({
      where: { id: userPackage.id },
      data: {
        usedTimes: { increment: 1 },
        lastUsedAt: now,
      },
    });

    for (const benefit of selectedBenefits) {
      await tx.userPackageBenefit.update({
        where: { id: benefit.id },
        data: {
          usedQuantity: { increment: benefit.quantity },
        },
      });
    }

    return formatOrder(order);
  });
}
