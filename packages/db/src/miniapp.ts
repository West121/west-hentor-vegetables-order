import { prisma } from "./client";
import {
  type FranchiseeStatus,
  Prisma,
  type OrderStatus,
  type PackageStatus,
  type StoreStatus,
  type StoreType,
} from "./generated/prisma/client";

export type MiniappStoreLookupInput = {
  now?: Date;
  storeCode?: string | null;
  storeId?: string | null;
};

export type MiniappStoreUserInput = {
  storeId: string;
  userId: string;
};

export type MiniappEditableOrderInput = MiniappStoreUserInput & {
  orderId?: string | null;
};

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) {
    return 0;
  }

  return Number(value);
}

function normalizeAddressSnapshot(value: Prisma.JsonValue) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function isFutureOrOpenEnded(value: Date | null, now: Date) {
  return !value || value.getTime() >= now.getTime();
}

function isMiniappStoreAvailable(
  store: {
    franchiseEndsAt: Date | null;
    franchisee: {
      contractEndsAt: Date | null;
      status: FranchiseeStatus;
    } | null;
    status: StoreStatus;
    type: StoreType;
  },
  now: Date,
) {
  if (store.status !== "ACTIVE") {
    return false;
  }

  if (store.type === "DIRECT") {
    return true;
  }

  return (
    !!store.franchisee &&
    store.franchisee.status === "ACTIVE" &&
    isFutureOrOpenEnded(store.franchiseEndsAt, now) &&
    isFutureOrOpenEnded(store.franchisee.contractEndsAt, now)
  );
}

function packageView(item: {
  createdAt: Date;
  expiresAt: Date;
  frozenReason: string | null;
  id: string;
  lastUsedAt: Date | null;
  nameSnapshot: string;
  nextOrderDate: Date | null;
  startsAt: Date;
  status: PackageStatus;
  totalTimes: number;
  usedTimes: number;
  weightLimitJin: Prisma.Decimal;
}) {
  return {
    createdAt: item.createdAt,
    expiresAt: item.expiresAt,
    frozenReason: item.frozenReason,
    id: item.id,
    lastUsedAt: item.lastUsedAt,
    nameSnapshot: item.nameSnapshot,
    nextOrderDate: item.nextOrderDate,
    remainingTimes: Math.max(item.totalTimes - item.usedTimes, 0),
    startsAt: item.startsAt,
    status: item.status,
    totalTimes: item.totalTimes,
    usedTimes: item.usedTimes,
    weightLimitJin: toNumber(item.weightLimitJin),
  };
}

function summarizeOrders(rows: Array<{ status: OrderStatus; _count: { _all: number } }>) {
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

export async function findAvailableMiniappStore(input: MiniappStoreLookupInput = {}) {
  const now = input.now ?? new Date();
  const stores = await prisma.store.findMany({
    where: {
      ...(input.storeCode ? { code: input.storeCode } : {}),
      ...(input.storeId ? { id: input.storeId } : {}),
      status: "ACTIVE",
    },
    orderBy: { createdAt: "asc" },
    include: {
      franchisee: {
        select: {
          contractEndsAt: true,
          id: true,
          name: true,
          status: true,
        },
      },
    },
  });

  return stores.find((store) => isMiniappStoreAvailable(store, now)) ?? null;
}

async function getStoreAndMember(input: MiniappStoreUserInput) {
  return prisma.memberStoreBinding.findFirst({
    where: {
      status: "ACTIVE",
      storeId: input.storeId,
      userId: input.userId,
    },
    include: {
      store: {
        select: {
          code: true,
          cutoffTime: true,
          customerServiceTel: true,
          id: true,
          name: true,
        },
      },
      user: {
        select: {
          avatarUrl: true,
          id: true,
          nickname: true,
          phone: true,
          status: true,
        },
      },
    },
  });
}

export async function listMiniappOrders(input: MiniappStoreUserInput) {
  const [orders, summaryRows] = await Promise.all([
    prisma.order.findMany({
      where: {
        deletedByUserAt: null,
        storeId: input.storeId,
        userId: input.userId,
      },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          orderBy: { id: "asc" },
          select: {
            dishId: true,
            dishNameSnapshot: true,
            id: true,
            weightJin: true,
          },
        },
        userPackage: {
          select: {
            id: true,
            nameSnapshot: true,
          },
        },
      },
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: {
        deletedByUserAt: null,
        storeId: input.storeId,
        userId: input.userId,
      },
      _count: { _all: true },
    }),
  ]);

  const sortedOrders = [...orders].sort((left, right) => {
    if (left.status === "PENDING_SHIPMENT" && right.status !== "PENDING_SHIPMENT") {
      return -1;
    }
    if (left.status !== "PENDING_SHIPMENT" && right.status === "PENDING_SHIPMENT") {
      return 1;
    }
    return right.createdAt.getTime() - left.createdAt.getTime();
  });

  return {
    items: sortedOrders.map((order) => ({
      addressSnapshot: normalizeAddressSnapshot(order.addressSnapshot),
      canEdit: order.status === "PENDING_SHIPMENT",
      canceledAt: order.canceledAt,
      createdAt: order.createdAt,
      id: order.id,
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
      totalWeightJin: toNumber(order.totalWeightJin),
      updatedAt: order.updatedAt,
      userPackage: order.userPackage,
      userVisibleRemark: order.userVisibleRemark,
    })),
    summary: summarizeOrders(summaryRows),
  };
}

export async function listMiniappPackages(input: MiniappStoreUserInput) {
  const [items, templates] = await Promise.all([
    prisma.userPackage.findMany({
      where: {
        storeId: input.storeId,
        userId: input.userId,
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.packageTemplate.findMany({
      where: {
        status: "ACTIVE",
        storeId: input.storeId,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return {
    items: items.map(packageView),
    purchaseReserve: {
      enabled: false,
      status: "PAYMENT_NOT_ENABLED" as const,
      templates: templates.map((template) => ({
        id: template.id,
        name: template.name,
        totalTimes: template.totalTimes,
        validDays: template.validDays,
        weightLimitJin: toNumber(template.weightLimitJin),
      })),
    },
  };
}

export async function getMiniappEditableOrder(input: MiniappEditableOrderInput) {
  const order = await prisma.order.findFirst({
    where: {
      deletedByUserAt: null,
      ...(input.orderId ? { id: input.orderId } : {}),
      status: "PENDING_SHIPMENT",
      storeId: input.storeId,
      userId: input.userId,
    },
    orderBy: { createdAt: "desc" },
    include: {
      address: true,
      items: {
        orderBy: { id: "asc" },
        select: {
          dishId: true,
          dishNameSnapshot: true,
          id: true,
          weightJin: true,
        },
      },
    },
  });

  if (!order) {
    return null;
  }

  return {
    address: order.address
      ? {
          detail: order.address.detail,
          receiverName: order.address.receiverName,
          receiverPhone: order.address.receiverPhone,
        }
      : normalizeAddressSnapshot(order.addressSnapshot),
    addressId: order.addressId,
    id: order.id,
    items: order.items.map((item) => ({
      dishId: item.dishId,
      id: item.id,
      name: item.dishNameSnapshot,
      weightJin: toNumber(item.weightJin),
    })),
    orderNo: order.orderNo,
    status: order.status,
    totalWeightJin: toNumber(order.totalWeightJin),
  };
}

export async function getMiniappProfile(input: MiniappStoreUserInput) {
  const [binding, packages, orders, defaultAddress] = await Promise.all([
    getStoreAndMember(input),
    listMiniappPackages(input),
    listMiniappOrders(input),
    prisma.address.findFirst({
      where: {
        isDefault: true,
        storeId: input.storeId,
        userId: input.userId,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const currentPackage =
    packages.items.find((item) => item.status === "ACTIVE") ?? packages.items[0] ?? null;

  return {
    currentPackage,
    defaultAddress: defaultAddress
      ? {
          detail: defaultAddress.detail,
          id: defaultAddress.id,
          receiverName: defaultAddress.receiverName,
          receiverPhone: defaultAddress.receiverPhone,
        }
      : null,
    member: binding
      ? {
          avatarUrl: binding.user.avatarUrl,
          id: binding.user.id,
          nickname: binding.user.nickname,
          phone: binding.user.phone,
          status: binding.user.status,
        }
      : null,
    orderSummary: orders.summary,
    recentOrders: orders.items.slice(0, 3),
    store: binding
      ? {
          code: binding.store.code,
          cutoffTime: binding.store.cutoffTime,
          customerServiceTel: binding.store.customerServiceTel,
          id: binding.store.id,
          name: binding.store.name,
        }
      : null,
  };
}
