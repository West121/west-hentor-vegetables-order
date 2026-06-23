import { prisma } from "./client";
import { getBusinessDayRange, isInBusinessDay } from "./business-day";
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

export type MiniappSwitchStoreInput = {
  now?: Date;
  storeId: string;
  userId: string;
};

export type MiniappEditableOrderInput = MiniappStoreUserInput & {
  now?: Date;
  orderId?: string | null;
};

export type MiniappPackagePurchaseInput = MiniappStoreUserInput & {
  templateId: string;
};

export type MiniappWechatPrepayInput = MiniappStoreUserInput & {
  purchaseOrderId: string;
};

export type MiniappCurrentPackageInput = MiniappStoreUserInput & {
  now?: Date;
};

export type MiniappOrderActionInput = MiniappStoreUserInput & {
  orderId: string;
};

export type MiniappCancelOrderInput = MiniappOrderActionInput & {
  reason: string;
};

export type MiniappCancelAccountInput = MiniappStoreUserInput & {
  reason: string;
};

export class MiniappServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "MiniappServiceError";
  }
}

function requireText(value: string, code: string, message: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new MiniappServiceError(code, message);
  }
  return normalized;
}

async function ensureActiveMiniappMember(
  input: MiniappStoreUserInput,
  messages: {
    disabled: string;
    storeRequired: string;
  },
) {
  const binding = await prisma.memberStoreBinding.findFirst({
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

  if (!binding) {
    throw new MiniappServiceError("STORE_REQUIRED", messages.storeRequired);
  }

  if (binding.status !== "ACTIVE" || binding.user.status !== "ACTIVE") {
    const reason = binding.user.disabledReason?.trim();
    throw new MiniappServiceError(
      "MEMBER_DISABLED",
      reason ? `会员已停用：${reason}` : messages.disabled,
    );
  }
}

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) {
    return 0;
  }

  return Number(value);
}

function configText(value: Prisma.JsonValue | undefined) {
  return typeof value === "string" ? value : "";
}

function normalizeAddressSnapshot(value: Prisma.JsonValue) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
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

function addressSummaryView(address: {
  city: string | null;
  detail: string;
  district: string | null;
  id: string;
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
    province: address.province,
    receiverName: address.receiverName,
    receiverPhone: address.receiverPhone,
  };
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
  benefits?: Array<{
    id: string;
    kind: string;
    nameSnapshot: string;
    sortOrder: number;
    totalQuantity: Prisma.Decimal;
    unitSnapshot: string;
    usedQuantity: Prisma.Decimal;
  }>;
  createdAt: Date;
  expiresAt: Date;
  frozenReason: string | null;
  id: string;
  lastUsedAt: Date | null;
  nameSnapshot: string;
  startsAt: Date;
  status: PackageStatus;
  storeId: string;
  totalTimes: number;
  usedTimes: number;
  userId: string;
  weightLimitJin: Prisma.Decimal;
}) {
  return {
    benefits:
      item.benefits?.map((benefit) => ({
        id: benefit.id,
        kind: benefit.kind,
        name: benefit.nameSnapshot,
        remainingQuantity: Math.max(
          toNumber(benefit.totalQuantity) - toNumber(benefit.usedQuantity),
          0,
        ),
        sortOrder: benefit.sortOrder,
        totalQuantity: toNumber(benefit.totalQuantity),
        unit: benefit.unitSnapshot,
        usedQuantity: toNumber(benefit.usedQuantity),
      })) ?? [],
    createdAt: item.createdAt,
    expiresAt: item.expiresAt,
    frozenReason: item.frozenReason,
    id: item.id,
    lastUsedAt: item.lastUsedAt,
    nameSnapshot: item.nameSnapshot,
    remainingTimes: Math.max(item.totalTimes - item.usedTimes, 0),
    startsAt: item.startsAt,
    status: item.status,
    storeId: item.storeId,
    totalTimes: item.totalTimes,
    usedTimes: item.usedTimes,
    userId: item.userId,
    weightLimitJin: toNumber(item.weightLimitJin),
  };
}

function memberStoreView(
  binding: {
    isDefault: boolean;
    store: {
      code: string;
      customerServiceTel: string | null;
      id: string;
      name: string;
      type: StoreType;
    };
  },
  currentStoreId: string,
) {
  return {
    code: binding.store.code,
    customerServiceTel: binding.store.customerServiceTel,
    id: binding.store.id,
    isCurrent: binding.store.id === currentStoreId,
    isDefault: binding.isDefault,
    name: binding.store.name,
    type: binding.store.type,
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

export async function getMiniappStorePublicSettings(
  input: MiniappStoreLookupInput = {},
) {
  const store = await findAvailableMiniappStore(input);
  if (!store) {
    throw new MiniappServiceError("STORE_NOT_FOUND", "当前门店不可用");
  }

  const configs = await prisma.systemConfig.findMany({
    where: {
      key: {
        in: [
          "about_text",
          "login_image_url",
          "login_subtitle",
          "login_title",
          "login_welcome",
          "privacy_policy_url",
          "user_agreement_url",
        ],
      },
      storeId: store.id,
    },
    select: {
      key: true,
      value: true,
    },
  });
  const configByKey = new Map(
    configs.map((config) => [config.key, config.value]),
  );

  return {
    aboutText: configText(configByKey.get("about_text")),
    customerServiceTel: store.customerServiceTel,
    loginImageUrl: configText(configByKey.get("login_image_url")),
    loginSubtitle: configText(configByKey.get("login_subtitle")),
    loginTitle: configText(configByKey.get("login_title")),
    loginWelcome: configText(configByKey.get("login_welcome")),
    privacyPolicyUrl: configText(configByKey.get("privacy_policy_url")),
    store: {
      code: store.code,
      id: store.id,
      name: store.name,
    },
    userAgreementUrl: configText(configByKey.get("user_agreement_url")),
  };
}

export async function listMiniappMemberStores(input: MiniappStoreUserInput) {
  const now = new Date();
  const bindings = await prisma.memberStoreBinding.findMany({
    where: {
      status: "ACTIVE",
      userId: input.userId,
    },
    include: {
      store: {
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
      },
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  const stores = bindings
    .filter((binding) => isMiniappStoreAvailable(binding.store, now))
    .map((binding) => memberStoreView(binding, input.storeId))
    .sort((left, right) => {
      if (left.isCurrent !== right.isCurrent) {
        return left.isCurrent ? -1 : 1;
      }
      if (left.isDefault !== right.isDefault) {
        return left.isDefault ? -1 : 1;
      }
      return left.name.localeCompare(right.name, "zh-CN");
    });

  return {
    currentStore: stores.find((store) => store.isCurrent) ?? null,
    stores,
  };
}

export async function switchMiniappStore(input: MiniappSwitchStoreInput) {
  const now = input.now ?? new Date();

  return prisma.$transaction(async (tx) => {
    const binding = await tx.memberStoreBinding.findFirst({
      where: {
        storeId: input.storeId,
        userId: input.userId,
      },
      include: {
        store: {
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
        },
      },
    });

    if (!binding || binding.status !== "ACTIVE") {
      throw new MiniappServiceError(
        "STORE_BINDING_NOT_FOUND",
        "当前会员未绑定该门店",
      );
    }

    if (!isMiniappStoreAvailable(binding.store, now)) {
      throw new MiniappServiceError("STORE_NOT_AVAILABLE", "当前门店不可用");
    }

    await Promise.all([
      tx.memberStoreBinding.updateMany({
        where: { userId: input.userId },
        data: { isDefault: false },
      }),
      tx.user.update({
        where: { id: input.userId },
        data: { defaultStoreId: input.storeId },
      }),
    ]);
    const updated = await tx.memberStoreBinding.update({
      where: {
        userId_storeId: {
          storeId: input.storeId,
          userId: input.userId,
        },
      },
      data: { isDefault: true },
      include: {
        store: {
          select: {
            code: true,
            customerServiceTel: true,
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    return memberStoreView(updated, input.storeId);
  });
}

async function getStoreAndMember(input: MiniappStoreUserInput) {
  return prisma.memberStoreBinding.findFirst({
    where: {
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
          disabledReason: true,
          nickname: true,
          phone: true,
          status: true,
        },
      },
    },
  });
}

export async function listMiniappOrders(input: MiniappStoreUserInput) {
  const now = new Date();
  const [orders, summaryRows] = await Promise.all([
    prisma.order.findMany({
      where: {
        deletedByUserAt: null,
        storeId: input.storeId,
        userId: input.userId,
      },
      orderBy: { createdAt: "desc" },
      include: {
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
        userPackage: {
          select: {
            id: true,
            nameSnapshot: true,
          },
        },
        shipments: {
          orderBy: { sortOrder: "asc" },
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
      canEdit:
        order.status === "PENDING_SHIPMENT" &&
        isInBusinessDay(order.createdAt, now),
      canceledAt: order.canceledAt,
      createdAt: order.createdAt,
	      id: order.id,
	      benefits: order.benefitItems.map((benefit) => ({
	        id: benefit.id,
	        kind: benefit.kind,
	        nameSnapshot: benefit.nameSnapshot,
	        quantity: toNumber(benefit.quantity),
	        unitSnapshot: benefit.unitSnapshot,
	      })),
	      items: order.items.map((item) => ({
        dishId: item.dishId,
        dishNameSnapshot: item.dishNameSnapshot,
        id: item.id,
        weightJin: toNumber(item.weightJin),
      })),
	      logisticsNo: order.logisticsNo,
	      shipments: order.shipments.map((shipment) => ({
	        id: shipment.id,
	        logisticsNo: shipment.logisticsNo,
	        packageName: shipment.packageName,
	        packageType: shipment.packageType,
	        shippedAt: shipment.shippedAt,
	        signedAt: shipment.signedAt,
	        status: shipment.status,
	      })),
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
      include: {
        benefits: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    }),
    prisma.packageTemplate.findMany({
      where: {
        status: "ACTIVE",
        storeId: input.storeId,
      },
      include: {
        benefits: {
          orderBy: { sortOrder: "asc" },
        },
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
        benefits: template.benefits.map((benefit) => ({
          id: benefit.id,
          kind: benefit.kind,
          name: benefit.name,
          totalQuantity: toNumber(benefit.totalQuantity),
          unit: benefit.unit,
        })),
        id: template.id,
        name: template.name,
        totalTimes: template.totalTimes,
        validDays: template.validDays,
        weightLimitJin: toNumber(template.weightLimitJin),
      })),
    },
  };
}

export async function getMiniappCurrentPackage(input: MiniappCurrentPackageInput) {
  const items = await prisma.userPackage.findMany({
    where: {
      status: { in: ["ACTIVE", "FROZEN"] },
      storeId: input.storeId,
      userId: input.userId,
    },
    include: {
      benefits: {
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });
  const current =
    items.find(
      (item) => item.status === "ACTIVE" && item.usedTimes < item.totalTimes,
    ) ??
    items.find((item) => item.status === "ACTIVE") ??
    items[0] ??
    null;

  return current ? packageView(current) : null;
}

export async function createMiniappPackagePurchase(
  input: MiniappPackagePurchaseInput,
) {
  await ensureActiveMiniappMember(input, {
    disabled: "会员已停用，暂不能购买套餐",
    storeRequired: "请先绑定当前门店后再购买套餐",
  });

  const template = await prisma.packageTemplate.findFirst({
    where: {
      id: input.templateId,
      status: "ACTIVE",
      storeId: input.storeId,
    },
    select: { id: true },
  });

  if (!template) {
    throw new MiniappServiceError(
      "PACKAGE_TEMPLATE_NOT_FOUND",
      "套餐模板不存在或已停用",
    );
  }

  return prisma.packagePurchaseOrder.create({
    data: {
      amountFen: 0,
      payChannel: "WECHAT",
      status: "PAYMENT_NOT_ENABLED",
      storeId: input.storeId,
      templateId: template.id,
      userId: input.userId,
    },
  });
}

export async function reserveMiniappWechatPrepay(input: MiniappWechatPrepayInput) {
  await ensureActiveMiniappMember(input, {
    disabled: "会员已停用，暂不能支付套餐",
    storeRequired: "请先绑定当前门店后再支付套餐",
  });

  const purchaseOrder = await prisma.packagePurchaseOrder.findFirst({
    where: {
      id: input.purchaseOrderId,
      storeId: input.storeId,
      userId: input.userId,
    },
  });

  if (!purchaseOrder) {
    throw new MiniappServiceError(
      "PACKAGE_PURCHASE_NOT_FOUND",
      "套餐购买意向单不存在",
    );
  }

  return {
    id: purchaseOrder.id,
    status: "PAYMENT_NOT_ENABLED" as const,
  };
}

export async function cancelMiniappOrder(input: MiniappCancelOrderInput) {
  const reason = requireText(input.reason, "CANCEL_REASON_REQUIRED", "请选择取消原因");
  await ensureActiveMiniappMember(input, {
    disabled: "会员已停用，暂不能取消订单",
    storeRequired: "请先绑定当前门店后再取消订单",
  });

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        deletedByUserAt: null,
        id: input.orderId,
        storeId: input.storeId,
        userId: input.userId,
      },
      include: {
        benefitItems: {
          select: {
            quantity: true,
            userPackageBenefitId: true,
          },
        },
        items: {
          select: {
            dishId: true,
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
    });

    if (!order) {
      throw new MiniappServiceError("ORDER_NOT_FOUND", "订单不存在");
    }

    if (order.status !== "PENDING_SHIPMENT") {
      throw new MiniappServiceError(
        "ORDER_NOT_CANCELABLE",
        "当前订单不可取消",
      );
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

    for (const benefit of order.benefitItems) {
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

    return tx.order.update({
      where: { id: order.id },
      data: {
        cancelReason: reason,
        canceledAt: new Date(),
        status: "CANCELED",
      },
    });
  });
}

export async function hideMiniappOrder(input: MiniappOrderActionInput) {
  const order = await prisma.order.findFirst({
    where: {
      deletedByUserAt: null,
      id: input.orderId,
      storeId: input.storeId,
      userId: input.userId,
    },
  });

  if (!order) {
    throw new MiniappServiceError("ORDER_NOT_FOUND", "订单不存在");
  }

  if (order.status !== "CANCELED" && order.status !== "VOIDED") {
    throw new MiniappServiceError("ORDER_NOT_HIDEABLE", "当前订单不可删除");
  }

  return prisma.order.update({
    where: { id: order.id },
    data: {
      deletedByUserAt: new Date(),
    },
  });
}

export async function cancelMiniappAccount(input: MiniappCancelAccountInput) {
  const reason = requireText(
    input.reason,
    "CANCEL_ACCOUNT_REASON_REQUIRED",
    "请填写注销原因",
  );

  return prisma.$transaction(async (tx) => {
    const binding = await tx.memberStoreBinding.findFirst({
      where: {
        storeId: input.storeId,
        userId: input.userId,
      },
      include: {
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!binding) {
      throw new MiniappServiceError(
        "STORE_REQUIRED",
        "请先绑定当前门店后再注销账号",
      );
    }

    const [user, updatedBinding] = await Promise.all([
      tx.user.update({
        where: { id: input.userId },
        data: {
          disabledReason: reason,
          status: "DISABLED",
        },
      }),
      tx.memberStoreBinding.update({
        where: { id: binding.id },
        data: {
          status: "DISABLED",
        },
      }),
    ]);

    return {
      bindingStatus: updatedBinding.status,
      disabledReason: user.disabledReason,
      status: user.status,
      storeId: input.storeId,
      userId: input.userId,
    };
  });
}

export async function getMiniappEditableOrder(input: MiniappEditableOrderInput) {
  const { end, start } = getBusinessDayRange(input.now);
  const order = await prisma.order.findFirst({
    where: {
      createdAt: { gte: start, lt: end },
      deletedByUserAt: null,
      ...(input.orderId ? { id: input.orderId } : {}),
      status: "PENDING_SHIPMENT",
      storeId: input.storeId,
      userId: input.userId,
    },
    orderBy: { createdAt: "desc" },
	    include: {
	      address: true,
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
    },
  });

  if (!order) {
    return null;
  }

  return {
    address: order.address
      ? addressSummaryView(order.address)
      : normalizeAddressSnapshot(order.addressSnapshot),
	    addressId: order.addressId,
	    benefits: order.benefitItems.map((benefit) => ({
	      id: benefit.id,
	      kind: benefit.kind,
	      nameSnapshot: benefit.nameSnapshot,
	      quantity: toNumber(benefit.quantity),
	      unitSnapshot: benefit.unitSnapshot,
	      userPackageBenefitId: benefit.userPackageBenefitId,
	    })),
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
      ? addressSummaryView(defaultAddress)
      : null,
    member: binding
      ? {
          avatarUrl: binding.user.avatarUrl,
          bindingStatus: binding.status,
          disabledReason: binding.user.disabledReason,
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
