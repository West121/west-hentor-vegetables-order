import { prisma } from "./client";
import {
  Prisma,
  type DishCategory,
  type OrderStatus,
} from "./generated/prisma/client";
import {
  buildPaginationMeta,
  normalizePagination,
  type ListPaginationInput,
} from "./pagination";
import { ReservationServiceError, submitReservation } from "./reservations";

export type ShipOrderInput = {
  logisticsNo?: string;
  operatorId: string;
  orderId: string;
  shipments?: Array<{
    logisticsNo: string;
    packageName: string;
    packageType?: string;
  }>;
  storeId: string;
};

export type SignOrderInput = {
  operatorId: string;
  orderId: string;
  storeId: string;
};

export type BatchShipOrdersInput = {
  operatorId: string;
  shipments: Array<{
    logisticsNo: string;
    orderId: string;
  }>;
  storeId: string;
};

export type BuildOrderPrintLabelsInput = {
  orderIds: string[];
  storeId: string;
};

export type BuildKuaidi100PrintTasksInput = {
  includePrinted?: boolean;
  orderIds: string[];
  storeId: string;
};

export type Kuaidi100PrintTask = {
  cargo: string;
  count: string;
  orderId: string;
  orderNo: string;
  packageName: string;
  packageType: string;
  receiverAddress: string;
  receiverMobile: string;
  receiverName: string;
  remark: string;
  senderAddress: string;
  senderMobile: string;
  senderName: string;
  shipmentId: string;
  weightKg: string;
};

export type RecordKuaidi100PrintResultsInput = {
  operatorId: string;
  results: Array<{
    kuaidinum: string;
    rawResponse?: Prisma.InputJsonValue;
    shipmentId: string;
    taskId?: string;
  }>;
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

export type ListStoreOrdersInput = ListPaginationInput & {
  dateFrom?: Date;
  dateTo?: Date;
  query?: string;
  status?: OrderStatus;
  storeId: string;
};

export type ExportStoreOrdersInput = Omit<ListStoreOrdersInput, "take">;

export type GetStoreOrderInput = {
  orderId: string;
  storeId: string;
};

export type ShipmentStatsInput = {
  addressKeyword?: string;
  dateFrom?: Date;
  dateTo?: Date;
  dishCategory?: DishCategory;
  status?: OrderStatus;
  storeId: string;
};

export type UpdateOrderInternalRemarkInput = {
  internalRemark: string;
  operatorId: string;
  orderId: string;
  storeId: string;
};

export type VoidOrderInput = {
  operatorId: string;
  orderId: string;
  reason: string;
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

function dedupeShipments(input: BatchShipOrdersInput["shipments"]) {
  const seen = new Set<string>();
  return input.filter((shipment) => {
    if (seen.has(shipment.orderId)) {
      return false;
    }
    seen.add(shipment.orderId);
    return true;
  });
}

function normalizeOrderShipments(input: ShipOrderInput) {
  const source =
    input.shipments && input.shipments.length > 0
      ? input.shipments
      : [
          {
            logisticsNo: input.logisticsNo ?? "",
            packageName: "蔬菜包裹",
            packageType: "VEGETABLE",
          },
        ];

  const shipments = source.map((shipment, index) => ({
    logisticsNo: shipment.logisticsNo.trim(),
    packageName: shipment.packageName.trim() || `包裹${index + 1}`,
    packageType: shipment.packageType?.trim() || "EXTRA",
    sortOrder: index,
  }));

  if (shipments.some((shipment) => !shipment.logisticsNo)) {
    throw new OrderServiceError("LOGISTICS_NO_REQUIRED", "请输入运单号");
  }

  return shipments;
}

function toNumber(value: Prisma.Decimal) {
  return Number(value.toString());
}

function formatWeight(value: number) {
  return Number(value.toFixed(2)).toString();
}

function csvCell(value: string | number) {
  const rawText = String(value);
  const text = /^[=+\-@]/.test(rawText.trimStart()) ? `'${rawText}` : rawText;
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeAddressSnapshot(value: Prisma.JsonValue) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function textFromSnapshot(
  snapshot: Record<string, unknown>,
  key: string,
  fallback = "",
) {
  const value = snapshot[key];
  return typeof value === "string" ? value : fallback;
}

function shipmentAddressText(snapshot: Record<string, unknown>) {
  return (
    [
      textFromSnapshot(snapshot, "province"),
      textFromSnapshot(snapshot, "city"),
      textFromSnapshot(snapshot, "district"),
      textFromSnapshot(snapshot, "detail"),
    ]
      .filter(Boolean)
      .join(" ") ||
    textFromSnapshot(snapshot, "detail") ||
    "未记录地址"
  );
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

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  CANCELED: "已取消",
  PENDING_SHIPMENT: "待配送",
  SHIPPED: "已发货",
  SIGNED: "已签收",
  VOIDED: "已作废",
};

function buildStoreOrderWhere(input: ListStoreOrdersInput) {
  const query = input.query?.trim();
  return {
    deletedByUserAt: null,
    storeId: input.storeId,
    ...(input.status ? { status: input.status } : {}),
    ...(input.dateFrom || input.dateTo
      ? {
          createdAt: {
            ...(input.dateFrom ? { gte: input.dateFrom } : {}),
            ...(input.dateTo ? { lte: input.dateTo } : {}),
          },
        }
      : {}),
    ...(query
      ? {
          OR: [
            { orderNo: { contains: query } },
            { user: { nickname: { contains: query } } },
            { user: { phone: { contains: query } } },
            {
              items: {
                some: {
                  dishNameSnapshot: { contains: query },
                },
              },
            },
          ],
        }
      : {}),
  } satisfies Prisma.OrderWhereInput;
}

function benefitText(
  benefits: Array<{
    nameSnapshot: string;
    quantity: number;
    unitSnapshot: string;
  }>,
) {
  return benefits
    .map(
      (benefit) =>
        `${benefit.nameSnapshot} ${formatWeight(benefit.quantity)}${benefit.unitSnapshot}`,
    )
    .join(" / ");
}

function logisticsText(order: {
  logisticsNo: string | null;
  shipments: Array<{ logisticsNo: string | null }>;
}) {
  const shipmentNos = order.shipments
    .map((shipment) => shipment.logisticsNo?.trim())
    .filter(Boolean);
  return shipmentNos.length > 0 ? shipmentNos.join(" / ") : (order.logisticsNo ?? "");
}

function packageContentForShipment(
  shipment: {
    packageName: string;
    packageType: string;
  },
  order: ReturnType<typeof orderView>,
) {
  const vegetableItems = order.items.map(
    (item) => `${item.dishNameSnapshot} ${formatWeight(item.weightJin)}斤`,
  );
  const matchedBenefits = order.benefitItems
    .filter(
      (benefit) =>
        benefit.kind === shipment.packageType ||
        shipment.packageName.includes(benefit.nameSnapshot),
    )
    .map(
      (benefit) =>
        `${benefit.nameSnapshot} ${formatWeight(benefit.quantity)}${benefit.unitSnapshot}`,
    );

  if (shipment.packageType === "VEGETABLE") {
    return vegetableItems;
  }

  if (matchedBenefits.length > 0) {
    return matchedBenefits;
  }

  return [...vegetableItems, ...matchedBenefits];
}

const storeOrderInclude = {
  benefitItems: {
    orderBy: { id: "asc" },
  },
  items: {
    orderBy: { id: "asc" },
    select: {
      dishId: true,
      dishNameSnapshot: true,
      id: true,
      weightJin: true,
    },
  },
  shipments: {
    orderBy: { sortOrder: "asc" },
  },
  store: {
    select: {
      address: true,
      city: true,
      code: true,
      contactName: true,
      contactPhone: true,
      district: true,
      id: true,
      name: true,
      province: true,
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
    benefitItems: order.benefitItems.map((benefit) => ({
      id: benefit.id,
      kind: benefit.kind,
      nameSnapshot: benefit.nameSnapshot,
      quantity: toNumber(benefit.quantity),
      unitSnapshot: benefit.unitSnapshot,
    })),
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
    shipments: order.shipments.map((shipment) => ({
      id: shipment.id,
      logisticsNo: shipment.logisticsNo,
      packageName: shipment.packageName,
      packageType: shipment.packageType,
      shippedAt: shipment.shippedAt,
      signedAt: shipment.signedAt,
      status: shipment.status,
    })),
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
  const where = buildStoreOrderWhere(input);
  const paginationInput = normalizePagination(input);

  const [orders, total, summaryRows] = await Promise.all([
    prisma.order.findMany({
      skip: paginationInput.skip,
      take: paginationInput.take,
      where,
      orderBy: { createdAt: "desc" },
      include: storeOrderInclude,
    }),
    prisma.order.count({ where }),
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
    pagination: buildPaginationMeta(paginationInput, total),
    summary: summarizeStatus(summaryRows),
  };
}

export async function getStoreOrder(input: GetStoreOrderInput) {
  const order = await prisma.order.findFirst({
    where: {
      deletedByUserAt: null,
      id: input.orderId,
      storeId: input.storeId,
    },
    include: storeOrderInclude,
  });

  if (!order) {
    throw new OrderServiceError("ORDER_NOT_FOUND", "订单不存在");
  }

  return orderView(order);
}

export async function exportStoreOrders(input: ExportStoreOrdersInput) {
  const orders = await prisma.order.findMany({
    take: 1000,
    where: buildStoreOrderWhere(input),
    orderBy: { createdAt: "desc" },
    include: storeOrderInclude,
  });
  const rows = orders.map(orderView);
  const csvText = [
    [
      "订单号",
      "状态",
      "会员",
      "手机号",
      "套餐",
      "总重量(斤)",
      "菜品明细",
      "配送地址",
      "运单号",
      "会员备注",
      "内部备注",
      "下单时间",
    ].join(","),
    ...rows.map((order) => {
      const address = shipmentAddressText(order.addressSnapshot);
      const dishText = order.items
        .map((item) => `${item.dishNameSnapshot} ${formatWeight(item.weightJin)}斤`)
        .join(" / ");
      const extraText = benefitText(order.benefitItems);

      return [
        csvCell(order.orderNo),
        csvCell(ORDER_STATUS_LABELS[order.status]),
        csvCell(order.user.nickname ?? "未命名会员"),
        csvCell(order.user.phone ?? ""),
        csvCell(order.userPackage.nameSnapshot),
        formatWeight(order.totalWeightJin),
        csvCell([dishText, extraText].filter(Boolean).join(" / ")),
        csvCell(address),
        csvCell(logisticsText(order)),
        csvCell(order.userVisibleRemark ?? ""),
        csvCell(order.internalRemark ?? ""),
        csvCell(order.createdAt.toISOString()),
      ].join(",");
    }),
  ].join("\n");

  return {
    csvText,
    rowCount: rows.length,
  };
}

export async function buildOrderPrintLabels(input: BuildOrderPrintLabelsInput) {
  const orderIds = [...new Set(input.orderIds.map((id) => id.trim()).filter(Boolean))];
  if (!orderIds.length) {
    throw new OrderServiceError("PRINT_ORDERS_REQUIRED", "请选择要打印的订单");
  }

  const orders = await prisma.order.findMany({
    where: {
      deletedByUserAt: null,
      id: { in: orderIds },
      storeId: input.storeId,
    },
    orderBy: { createdAt: "desc" },
    include: storeOrderInclude,
  });
  const labels = orders.map((order) => {
    const view = orderView(order);
    const addressSnapshot = view.addressSnapshot;
	    return {
	      address: shipmentAddressText(addressSnapshot),
	      benefits: view.benefitItems.map((benefit) => ({
	        name: benefit.nameSnapshot,
	        quantity: benefit.quantity,
	        unit: benefit.unitSnapshot,
	      })),
	      items: view.items.map((item) => ({
	        dishName: item.dishNameSnapshot,
	        weightJin: item.weightJin,
	      })),
	      logisticsNo: logisticsText(view),
	      orderNo: view.orderNo,
      receiverName: textFromSnapshot(addressSnapshot, "receiverName"),
      receiverPhone: textFromSnapshot(addressSnapshot, "receiverPhone"),
      remark: view.userVisibleRemark ?? "",
      storeName: view.store.name,
      totalWeightJin: view.totalWeightJin,
    };
  });
  const labelHtml = labels
    .map(
      (label) => `
        <section class="label">
          <header>
            <strong>${escapeHtml(label.storeName)}</strong>
            <span>${escapeHtml(label.orderNo)}</span>
          </header>
          <div class="receiver">${escapeHtml(label.receiverName)} ${escapeHtml(label.receiverPhone)}</div>
          <div class="address">${escapeHtml(label.address)}</div>
	          <div class="items">${label.items
	            .map(
	              (item) =>
	                `<span>${escapeHtml(item.dishName)} ${escapeHtml(formatWeight(item.weightJin))}斤</span>`,
	            )
	            .concat(
	              label.benefits.map(
	                (benefit) =>
	                  `<span>${escapeHtml(benefit.name)} ${escapeHtml(formatWeight(benefit.quantity))}${escapeHtml(benefit.unit)}</span>`,
	              ),
	            )
	            .join("")}</div>
          <footer>
            <span>合计 ${escapeHtml(formatWeight(label.totalWeightJin))}斤</span>
            <span>${escapeHtml(label.logisticsNo ?? "未发货")}</span>
          </footer>
          ${
            label.remark
              ? `<div class="remark">备注：${escapeHtml(label.remark)}</div>`
              : ""
          }
        </section>
      `,
    )
    .join("");
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>配送标签</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 16px; color: #12351f; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .toolbar { margin-bottom: 16px; }
    .toolbar button { border: 0; border-radius: 10px; background: #1f8f4f; color: white; font-weight: 700; padding: 10px 18px; }
    .label { break-inside: avoid; border: 1px solid #12351f; border-radius: 8px; margin-bottom: 12px; min-height: 210px; padding: 14px; width: 360px; }
    header, footer { align-items: center; display: flex; justify-content: space-between; gap: 12px; }
    header strong { font-size: 18px; }
    header span, footer span { font-size: 12px; }
    .receiver { font-size: 20px; font-weight: 800; margin-top: 14px; }
    .address { font-size: 15px; line-height: 1.5; margin-top: 8px; }
    .items { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
    .items span { border: 1px solid #dbe6dc; border-radius: 999px; padding: 4px 8px; }
    footer { border-top: 1px solid #dbe6dc; font-weight: 700; margin-top: 14px; padding-top: 10px; }
    .remark { background: #f8fbf7; border-radius: 8px; font-size: 13px; line-height: 1.5; margin-top: 10px; padding: 8px; }
    @media print {
      body { padding: 0; }
      .toolbar { display: none; }
      .label { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="toolbar"><button onclick="window.print()">打印配送标签</button></div>
  ${labelHtml}
  <script>window.print();</script>
</body>
</html>`;

  return {
    html,
    labels,
  };
}

export async function buildKuaidi100PrintTasks(
  input: BuildKuaidi100PrintTasksInput,
) {
  const orderIds = [...new Set(input.orderIds.map((id) => id.trim()).filter(Boolean))];
  if (!orderIds.length) {
    throw new OrderServiceError("PRINT_ORDERS_REQUIRED", "请选择要打印的订单");
  }

  const orders = await prisma.order.findMany({
    where: {
      deletedByUserAt: null,
      id: { in: orderIds },
      storeId: input.storeId,
    },
    orderBy: { createdAt: "asc" },
    include: storeOrderInclude,
  });

  if (!orders.length) {
    throw new OrderServiceError("ORDER_NOT_FOUND", "订单不存在");
  }

  const tasks: Kuaidi100PrintTask[] = [];

  for (const order of orders) {
    const view = orderView(order);
    const receiverName = textFromSnapshot(view.addressSnapshot, "receiverName");
    const receiverMobile = textFromSnapshot(view.addressSnapshot, "receiverPhone");
    const receiverAddress = shipmentAddressText(view.addressSnapshot);
    const senderAddress = [
      view.store.province,
      view.store.city,
      view.store.district,
      view.store.address,
    ]
      .filter(Boolean)
      .join("");
    const senderName = view.store.contactName || view.store.name;
    const senderMobile = view.store.contactPhone;
    const shipments =
      view.shipments.length > 0
        ? view.shipments
        : [
            {
              id: `${view.id}-vegetable`,
              logisticsNo: view.logisticsNo,
              packageName: "蔬菜包裹",
              packageType: "VEGETABLE",
            },
          ];

    if (!receiverName || !receiverMobile || !receiverAddress) {
      throw new OrderServiceError(
        "PRINT_RECEIVER_REQUIRED",
        `${view.orderNo} 收件信息不完整`,
      );
    }

    if (!senderName || !senderMobile || !senderAddress) {
      throw new OrderServiceError(
        "PRINT_SENDER_REQUIRED",
        `${view.orderNo} 寄件信息不完整`,
      );
    }

    for (const shipment of shipments) {
      if (!input.includePrinted && shipment.logisticsNo?.trim()) {
        continue;
      }

      const content = packageContentForShipment(shipment, view);
      tasks.push({
        cargo: content.join("；") || shipment.packageName,
        count: "1",
        orderId: view.id,
        orderNo: view.orderNo,
        packageName: shipment.packageName,
        packageType: shipment.packageType,
        receiverAddress,
        receiverMobile,
        receiverName,
        remark: [shipment.packageName, view.userVisibleRemark]
          .filter(Boolean)
          .join("；"),
        senderAddress,
        senderMobile,
        senderName,
        shipmentId: shipment.id ?? `${view.id}-${shipment.packageType}`,
        weightKg:
          shipment.packageType === "VEGETABLE"
            ? Math.max(0.1, view.totalWeightJin * 0.5).toFixed(2)
            : "1",
      });
    }
  }

  if (!tasks.length) {
    throw new OrderServiceError("PRINT_TASKS_EMPTY", "所选订单没有待打印包裹");
  }

  return { tasks };
}

export async function recordKuaidi100PrintResults(
  input: RecordKuaidi100PrintResultsInput,
) {
  const normalizedResults = input.results
    .map((result) => ({
      kuaidinum: result.kuaidinum.trim(),
      rawResponse: result.rawResponse,
      shipmentId: result.shipmentId.trim(),
      taskId: result.taskId?.trim() || null,
    }))
    .filter((result) => result.shipmentId && result.kuaidinum);

  if (!normalizedResults.length) {
    throw new OrderServiceError("PRINT_RESULTS_REQUIRED", "没有可回写的打印结果");
  }

  return prisma.$transaction(async (tx) => {
    const [operator, shipments] = await Promise.all([
      tx.adminUser.findFirst({
        where: {
          id: input.operatorId,
          status: "ACTIVE",
        },
      }),
      tx.orderShipment.findMany({
        where: {
          id: { in: normalizedResults.map((result) => result.shipmentId) },
          order: {
            storeId: input.storeId,
          },
        },
        include: {
          order: {
            select: {
              id: true,
              logisticsNo: true,
              status: true,
              storeId: true,
            },
          },
        },
      }),
    ]);

    if (!operator) {
      throw new OrderServiceError("OPERATOR_NOT_FOUND", "操作员不存在");
    }

    const shipmentById = new Map(shipments.map((shipment) => [shipment.id, shipment]));
    const now = new Date();
    const updated: Array<{
      kuaidinum: string;
      orderId: string;
      shipmentId: string;
      taskId: string | null;
    }> = [];

    for (const result of normalizedResults) {
      const shipment = shipmentById.get(result.shipmentId);
      if (!shipment) {
        continue;
      }

      await tx.orderShipment.update({
        where: { id: shipment.id },
        data: {
          logisticsNo: result.kuaidinum,
          remark: result.taskId ? `快递100任务：${result.taskId}` : shipment.remark,
          shippedAt: now,
          status: "SHIPPED",
        },
      });

      updated.push({
        kuaidinum: result.kuaidinum,
        orderId: shipment.orderId,
        shipmentId: shipment.id,
        taskId: result.taskId,
      });
    }

    const orderIds = [...new Set(updated.map((item) => item.orderId))];
    for (const orderId of orderIds) {
      const firstShipment = await tx.orderShipment.findFirst({
        where: {
          logisticsNo: { not: null },
          orderId,
        },
        orderBy: { sortOrder: "asc" },
        select: { logisticsNo: true },
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          logisticsNo: firstShipment?.logisticsNo ?? undefined,
          shippedAt: now,
          status: "SHIPPED",
        },
      });
    }

    if (updated.length > 0) {
      await tx.adminOperationLog.create({
        data: {
          action: "ORDER_KUAIDI100_PRINTED",
          afterValue: {
            printedCount: updated.length,
            results: updated,
          },
          operatorId: operator.id,
          resource: "order",
          resourceId: orderIds.join(","),
          storeId: input.storeId,
        },
      });
    }

    return { updated };
  });
}

export async function getShipmentStats(input: ShipmentStatsInput) {
  const where: Prisma.OrderWhereInput = {
    deletedByUserAt: null,
    storeId: input.storeId,
    ...(input.status ? { status: input.status } : {}),
    ...(input.dateFrom || input.dateTo
      ? {
          createdAt: {
            ...(input.dateFrom ? { gte: input.dateFrom } : {}),
            ...(input.dateTo ? { lte: input.dateTo } : {}),
          },
        }
      : {}),
  };
  const addressKeyword = input.addressKeyword?.trim();

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        orderBy: { id: "asc" },
        include: {
          dish: {
            select: {
              category: true,
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  const dishTotals = new Map<
    string,
    {
      category: DishCategory;
      dishId: string;
      dishName: string;
      orderIds: Set<string>;
      totalWeightJin: number;
    }
  >();
  const addressTotals = new Map<
    string,
    {
      address: string;
      orderIds: Set<string>;
      totalWeightJin: number;
    }
  >();
  const matchedOrderIds = new Set<string>();
  let totalWeightJin = 0;

  for (const order of orders) {
    const addressSnapshot = normalizeAddressSnapshot(order.addressSnapshot);
    const address = shipmentAddressText(addressSnapshot);
    if (addressKeyword && !address.includes(addressKeyword)) {
      continue;
    }

    const matchedItems = order.items.filter(
      (item) => !input.dishCategory || item.dish.category === input.dishCategory,
    );
    if (!matchedItems.length) {
      continue;
    }

    matchedOrderIds.add(order.id);

    for (const item of matchedItems) {
      const weightJin = toNumber(item.weightJin);
      totalWeightJin += weightJin;

      const dishTotal = dishTotals.get(item.dishId) ?? {
        category: item.dish.category,
        dishId: item.dishId,
        dishName: item.dishNameSnapshot || item.dish.name,
        orderIds: new Set<string>(),
        totalWeightJin: 0,
      };
      dishTotal.orderIds.add(order.id);
      dishTotal.totalWeightJin += weightJin;
      dishTotals.set(item.dishId, dishTotal);

      const addressTotal = addressTotals.get(address) ?? {
        address,
        orderIds: new Set<string>(),
        totalWeightJin: 0,
      };
      addressTotal.orderIds.add(order.id);
      addressTotal.totalWeightJin += weightJin;
      addressTotals.set(address, addressTotal);
    }
  }

  const dishes = [...dishTotals.values()]
    .map((item) => ({
      category: item.category,
      dishId: item.dishId,
      dishName: item.dishName,
      orderCount: item.orderIds.size,
      totalWeightJin: Number(item.totalWeightJin.toFixed(2)),
    }))
    .sort((left, right) => right.totalWeightJin - left.totalWeightJin);
  const addresses = [...addressTotals.values()]
    .map((item) => ({
      address: item.address,
      orderCount: item.orderIds.size,
      totalWeightJin: Number(item.totalWeightJin.toFixed(2)),
    }))
    .sort((left, right) => right.totalWeightJin - left.totalWeightJin);
  const summary = {
    orderCount: matchedOrderIds.size,
    totalWeightJin: Number(totalWeightJin.toFixed(2)),
  };
  const copyText = [
    `发货统计：${summary.orderCount} 单，${formatWeight(summary.totalWeightJin)} 斤`,
    "菜品明细：",
    ...dishes.map(
      (dish) =>
        `- ${dish.dishName} ${formatWeight(dish.totalWeightJin)}斤（${dish.orderCount}单）`,
    ),
  ].join("\n");
  const csvText = [
    ["类型", "名称", "订单数", "重量(斤)"].join(","),
    ...dishes.map((dish) =>
      [
        "菜品",
        csvCell(dish.dishName),
        dish.orderCount,
        formatWeight(dish.totalWeightJin),
      ].join(","),
    ),
  ].join("\n");

  return {
    addresses,
    copyText,
    csvText,
    dishes,
    summary,
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
  const shipments = normalizeOrderShipments(input);
  const logisticsNo = shipments[0]?.logisticsNo ?? "";

  return prisma.$transaction(async (tx) => {
    const [order, operator] = await Promise.all([
      tx.order.findFirst({
        where: {
          id: input.orderId,
          storeId: input.storeId,
          deletedByUserAt: null,
        },
        include: {
          shipments: {
            orderBy: { sortOrder: "asc" },
          },
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
    await tx.orderShipment.deleteMany({
      where: { orderId: order.id },
    });
    await tx.orderShipment.createMany({
      data: shipments.map((shipment) => ({
        logisticsNo: shipment.logisticsNo,
        orderId: order.id,
        packageName: shipment.packageName,
        packageType: shipment.packageType,
        shippedAt,
        sortOrder: shipment.sortOrder,
        status: "SHIPPED",
      })),
    });

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
          shipments,
          status: updated.status,
        },
        beforeValue: {
          logisticsNo: order.logisticsNo,
          shippedAt: order.shippedAt?.toISOString(),
          shipments: order.shipments.map((shipment) => ({
            logisticsNo: shipment.logisticsNo,
            packageName: shipment.packageName,
            packageType: shipment.packageType,
            status: shipment.status,
          })),
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

export async function signOrder(input: SignOrderInput) {
  return prisma.$transaction(async (tx) => {
    const [order, operator] = await Promise.all([
      tx.order.findFirst({
        where: {
          deletedByUserAt: null,
          id: input.orderId,
          storeId: input.storeId,
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

    if (order.status !== "SHIPPED") {
      throw new OrderServiceError("ORDER_NOT_SIGNABLE", "当前订单不可签收");
    }

    const signedAt = new Date();
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        signedAt,
        status: "SIGNED",
      },
    });

    await tx.adminOperationLog.create({
      data: {
        action: "ORDER_SIGNED",
        afterValue: {
          signedAt: updated.signedAt?.toISOString(),
          status: updated.status,
        },
        beforeValue: {
          signedAt: order.signedAt?.toISOString(),
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

export async function batchShipOrders(input: BatchShipOrdersInput) {
  const shipments = dedupeShipments(
    input.shipments.map((shipment) => ({
      logisticsNo: shipment.logisticsNo.trim(),
      orderId: shipment.orderId.trim(),
    })),
  );

  if (!shipments.length) {
    throw new OrderServiceError("BATCH_SHIPMENTS_REQUIRED", "请选择要发货的订单");
  }

  const result: {
    failureCount: number;
    failures: Array<{
      code: string;
      logisticsNo: string;
      message: string;
      orderId: string;
    }>;
    successCount: number;
    successes: Array<{
      logisticsNo: string;
      orderId: string;
      shippedAt: Date | null;
      status: OrderStatus;
    }>;
  } = {
    failureCount: 0,
    failures: [],
    successCount: 0,
    successes: [],
  };

  for (const shipment of shipments) {
    try {
      const shipped = await shipOrder({
        logisticsNo: shipment.logisticsNo,
        operatorId: input.operatorId,
        orderId: shipment.orderId,
        storeId: input.storeId,
      });

      result.successes.push({
        logisticsNo: shipped.logisticsNo ?? shipment.logisticsNo,
        orderId: shipped.id,
        shippedAt: shipped.shippedAt,
        status: shipped.status,
      });
    } catch (error) {
      if (error instanceof OrderServiceError) {
        result.failures.push({
          code: error.code,
          logisticsNo: shipment.logisticsNo,
          message: error.message,
          orderId: shipment.orderId,
        });
        continue;
      }

      throw error;
    }
  }

  result.successCount = result.successes.length;
  result.failureCount = result.failures.length;
  return result;
}

export async function voidOrder(input: VoidOrderInput) {
  const reason = input.reason.trim();
  if (!reason) {
    throw new OrderServiceError("VOID_REASON_REQUIRED", "请输入作废原因");
  }

  return prisma.$transaction(async (tx) => {
    const [order, operator] = await Promise.all([
      tx.order.findFirst({
        where: {
          deletedByUserAt: null,
          id: input.orderId,
          storeId: input.storeId,
        },
        include: {
          items: {
            select: {
              dishId: true,
              dishNameSnapshot: true,
              weightJin: true,
            },
          },
          userPackage: {
            select: {
              id: true,
              usedTimes: true,
            },
          },
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
      throw new OrderServiceError("ORDER_NOT_VOIDABLE", "当前订单不可作废");
    }

    for (const item of order.items) {
      await tx.dish.update({
        where: { id: item.dishId },
        data: {
          stockJin: { increment: item.weightJin },
        },
      });
    }

    if (order.userPackage.usedTimes > 0) {
      await tx.userPackage.update({
        where: { id: order.userPackage.id },
        data: {
          usedTimes: { decrement: 1 },
        },
      });
    }

    const canceledAt = new Date();
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        canceledAt,
        cancelReason: reason,
        status: "VOIDED",
      },
    });

    await tx.adminOperationLog.create({
      data: {
        action: "ORDER_VOIDED",
        afterValue: {
          canceledAt: updated.canceledAt?.toISOString(),
          cancelReason: updated.cancelReason,
          restoredItems: order.items.map((item) => ({
            dishId: item.dishId,
            dishNameSnapshot: item.dishNameSnapshot,
            weightJin: toNumber(item.weightJin),
          })),
          status: updated.status,
        },
        beforeValue: {
          status: order.status,
          usedTimes: order.userPackage.usedTimes,
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
