import { prisma } from "./client";

export type ShipOrderInput = {
  logisticsNo: string;
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
