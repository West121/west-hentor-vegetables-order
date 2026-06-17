import { prisma } from "./client";
import { Prisma, type OrderStatus } from "./generated/prisma/client";
import { ReservationServiceError, submitReservation } from "./reservations";

export type ShipOrderInput = {
  logisticsNo: string;
  operatorId: string;
  orderId: string;
  storeId: string;
};

export type CreateStoreOrderInput = {
  addressId: string;
  internalRemark?: string;
  items: Array<{
    dishId: string;
    weightJin: number;
  }>;
  operatorId: string;
  storeId: string;
  userId: string;
  userPackageId: string;
  userVisibleRemark?: string;
};

export type ListStoreOrdersInput = {
  query?: string;
  status?: OrderStatus;
  storeId: string;
  take?: number;
};

export type UpdateOrderInternalRemarkInput = {
  internalRemark: string;
  operatorId: string;
  orderId: string;
  storeId: string;
};

export class OrderServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "OrderServiceError";
  }
}

function toNumber(value: Prisma.Decimal) {
  return Number(value.toString());
}

function normalizeAddressSnapshot(value: Prisma.JsonValue) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function summarizeStatus(
  rows: Array<{ status: OrderStatus; _count: { _all: number } }>,
) {
  return rows.reduce(
    (summary, row) => {
      summary.total += row._count._all;
      if (row.status === "PENDING_SHIPMENT") {
        summary.pendingShipment = row._count._all;
      }
      if (row.status === "SHIPPED") {
        summary.shipped = row._count._all;
      }
      if (row.status === "SIGNED") {
        summary.signed = row._count._all;
      }
      if (row.status === "CANCELED" || row.status === "VOIDED") {
        summary.canceled += row._count._all;
      }
      return summary;
    },
    { canceled: 0, pendingShipment: 0, shipped: 0, signed: 0, total: 0 },
  );
}

const storeOrderInclude = {
  items: {
    orderBy: { id: "asc" },
    select: {
      dishId: true,
      dishNameSnapshot: true,
      id: true,
      weightJin: true,
    },
  },
  store: {
    select: {
      code: true,
      id: true,
      name: true,
    },
  },
  user: {
    select: {
      id: true,
      nickname: true,
      phone: true,
      status: true,
    },
  },
  userPackage: {
    select: {
      id: true,
      nameSnapshot: true,
    },
  },
} satisfies Prisma.OrderInclude;

type StoreOrderWithRelations = Prisma.OrderGetPayload<{
  include: typeof storeOrderInclude;
}>;

function orderView(order: StoreOrderWithRelations) {
  return {
    addressSnapshot: normalizeAddressSnapshot(order.addressSnapshot),
    canceledAt: order.canceledAt,
    cancelReason: order.cancelReason,
    createdAt: order.createdAt,
    id: order.id,
    internalRemark: order.internalRemark,
    items: order.items.map((item) => ({
      dishId: item.dishId,
      dishNameSnapshot: item.dishNameSnapshot,
      id: item.id,
      weightJin: toNumber(item.weightJin),
    })),
    logisticsNo: order.logisticsNo,
    modifiedAt: order.modifiedAt,
    orderNo: order.orderNo,
    shippedAt: order.shippedAt,
    signedAt: order.signedAt,
    status: order.status,
    store: order.store,
    totalWeightJin: toNumber(order.totalWeightJin),
    updatedAt: order.updatedAt,
    user: order.user,
    userPackage: order.userPackage,
    userVisibleRemark: order.userVisibleRemark,
  };
}

async function getActiveOperator(operatorId: string) {
  const operator = await prisma.adminUser.findFirst({
    where: {
      id: operatorId,
      status: "ACTIVE",
    },
  });

  if (!operator) {
    throw new OrderServiceError("OPERATOR_NOT_FOUND", "操作员不存在");
  }

  return operator;
}

export async function listStoreOrders(input: ListStoreOrdersInput) {
  const query = input.query?.trim();
  const where: Prisma.OrderWhereInput = {
    deletedByUserAt: null,
    storeId: input.storeId,
    ...(input.status ? { status: input.status } : {}),
    ...(query
      ? {
          OR: [
            { orderNo: { contains: query, mode: "insensitive" } },
            { user: { nickname: { contains: query, mode: "insensitive" } } },
            { user: { phone: { contains: query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [orders, summaryRows] = await Promise.all([
    prisma.order.findMany({
      take: input.take ?? 20,
      where,
      orderBy: { createdAt: "desc" },
      include: storeOrderInclude,
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: {
        deletedByUserAt: null,
        storeId: input.storeId,
      },
      _count: { _all: true },
    }),
  ]);

  return {
    items: orders.map(orderView),
    summary: summarizeStatus(summaryRows),
  };
}

export async function createStoreOrder(input: CreateStoreOrderInput) {
  const operator = await getActiveOperator(input.operatorId);
  const internalRemark = input.internalRemark?.trim() || null;
  let submitted: Awaited<ReturnType<typeof submitReservation>>;

  try {
    submitted = await submitReservation({
      addressId: input.addressId,
      items: input.items,
      storeId: input.storeId,
      userId: input.userId,
      userPackageId: input.userPackageId,
      userVisibleRemark: input.userVisibleRemark,
    });
  } catch (error) {
    if (error instanceof ReservationServiceError) {
      throw new OrderServiceError(error.code, error.message);
    }

    throw error;
  }

  await prisma.$transaction(async (tx) => {
    if (internalRemark) {
      await tx.order.update({
        where: { id: submitted.id },
        data: { internalRemark },
      });
    }

    await tx.adminOperationLog.create({
      data: {
        action: "ORDER_CREATED",
        afterValue: {
          internalRemark,
          itemCount: submitted.items.length,
          orderNo: submitted.orderNo,
          source: "ADMIN",
          totalWeightJin: submitted.totalWeightJin,
        },
        beforeValue: Prisma.JsonNull,
        operatorId: operator.id,
        resource: "order",
        resourceId: submitted.id,
        storeId: input.storeId,
      },
    });
  });

  const order = await prisma.order.findFirst({
    where: {
      id: submitted.id,
      storeId: input.storeId,
    },
    include: storeOrderInclude,
  });

  if (!order) {
    throw new OrderServiceError("ORDER_NOT_FOUND", "订单不存在");
  }

  return orderView(order);
}

export async function updateOrderInternalRemark(
  input: UpdateOrderInternalRemarkInput,
) {
  const internalRemark = input.internalRemark.trim();
  const operator = await getActiveOperator(input.operatorId);

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        deletedByUserAt: null,
        id: input.orderId,
        storeId: input.storeId,
      },
    });

    if (!order) {
      throw new OrderServiceError("ORDER_NOT_FOUND", "订单不存在");
    }

    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        internalRemark: internalRemark || null,
      },
    });

    await tx.adminOperationLog.create({
      data: {
        action: "ORDER_INTERNAL_REMARK_UPDATED",
        afterValue: {
          internalRemark: updated.internalRemark,
        },
        beforeValue: {
          internalRemark: order.internalRemark,
        },
        operatorId: operator.id,
        resource: "order",
        resourceId: order.id,
        storeId: order.storeId,
      },
    });

    return updated;
  });
}

export async function shipOrder(input: ShipOrderInput) {
  const logisticsNo = input.logisticsNo.trim();
  if (!logisticsNo) {
    throw new OrderServiceError("LOGISTICS_NO_REQUIRED", "请输入运单号");
  }

  return prisma.$transaction(async (tx) => {
    const [order, operator] = await Promise.all([
      tx.order.findFirst({
        where: {
          id: input.orderId,
          storeId: input.storeId,
          deletedByUserAt: null,
        },
      }),
      tx.adminUser.findFirst({
        where: {
          id: input.operatorId,
          status: "ACTIVE",
        },
      }),
    ]);

    if (!operator) {
      throw new OrderServiceError("OPERATOR_NOT_FOUND", "操作员不存在");
    }

    if (!order) {
      throw new OrderServiceError("ORDER_NOT_FOUND", "订单不存在");
    }

    if (order.status !== "PENDING_SHIPMENT") {
      throw new OrderServiceError("ORDER_NOT_SHIPPABLE", "当前订单不可发货");
    }

    const shippedAt = new Date();
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        logisticsNo,
        shippedAt,
        status: "SHIPPED",
      },
    });

    await tx.adminOperationLog.create({
      data: {
        action: "ORDER_SHIPPED",
        afterValue: {
          logisticsNo: updated.logisticsNo,
          shippedAt: updated.shippedAt?.toISOString(),
          status: updated.status,
        },
        beforeValue: {
          logisticsNo: order.logisticsNo,
          shippedAt: order.shippedAt?.toISOString(),
          status: order.status,
        },
        operatorId: operator.id,
        resource: "order",
        resourceId: order.id,
        storeId: order.storeId,
      },
    });

    return updated;
  });
}
