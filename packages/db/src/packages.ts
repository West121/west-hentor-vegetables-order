import { prisma } from "./client";
import { Prisma, type PackageStatus } from "./generated/prisma/client";

export class PackageServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PackageServiceError";
  }
}

export type UserPackageOperationInput = {
  operatorId: string;
  reason: string;
  storeId: string;
  userPackageId: string;
};

export type ListUserPackagesInput = {
  query?: string;
  status?: PackageStatus;
  storeId: string;
};

export type AdjustUserPackageInput = UserPackageOperationInput & {
  expiresAt: Date;
  nextOrderDate?: Date | null;
  totalTimes: number;
  usedTimes: number;
  weightLimitJin: number;
};

async function getActiveOperator(operatorId: string) {
  const operator = await prisma.adminUser.findFirst({
    where: {
      id: operatorId,
      status: "ACTIVE",
    },
  });

  if (!operator) {
    throw new PackageServiceError("OPERATOR_NOT_FOUND", "操作员不存在");
  }

  return operator;
}

function requireReason(reason: string) {
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    throw new PackageServiceError("REASON_REQUIRED", "请输入操作原因");
  }

  return trimmedReason;
}

function toNumber(value: Prisma.Decimal) {
  return Number(value.toString());
}

function packageLogValue(userPackage: {
  expiresAt: Date;
  nextOrderDate: Date | null;
  status: PackageStatus;
  totalTimes: number;
  usedTimes: number;
  weightLimitJin: Prisma.Decimal;
}) {
  return {
    expiresAt: userPackage.expiresAt.toISOString(),
    nextOrderDate: userPackage.nextOrderDate?.toISOString() ?? null,
    status: userPackage.status,
    totalTimes: userPackage.totalTimes,
    usedTimes: userPackage.usedTimes,
    weightLimitJin: userPackage.weightLimitJin.toString(),
  };
}

export async function listUserPackages(input: ListUserPackagesInput) {
  const query = input.query?.trim();
  const where: Prisma.UserPackageWhereInput = {
    storeId: input.storeId,
    ...(input.status ? { status: input.status } : {}),
    ...(query
      ? {
          OR: [
            { nameSnapshot: { contains: query, mode: "insensitive" } },
            { user: { nickname: { contains: query, mode: "insensitive" } } },
            { user: { phone: { contains: query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [items, summaryRows] = await Promise.all([
    prisma.userPackage.findMany({
      where,
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      include: {
        store: {
          select: {
            code: true,
            id: true,
            name: true,
            type: true,
          },
        },
        template: {
          select: {
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
      },
    }),
    prisma.userPackage.groupBy({
      by: ["status"],
      where: { storeId: input.storeId },
      _count: { _all: true },
    }),
  ]);

  const summary = summaryRows.reduce(
    (value, row) => {
      value.total += row._count._all;
      if (row.status === "ACTIVE") {
        value.active = row._count._all;
      }
      if (row.status === "FROZEN") {
        value.frozen = row._count._all;
      }
      if (row.status === "EXPIRED") {
        value.expired = row._count._all;
      }
      return value;
    },
    { active: 0, expired: 0, frozen: 0, total: 0 },
  );

  return {
    items: items.map((item) => ({
      createdAt: item.createdAt,
      expiresAt: item.expiresAt,
      frozenReason: item.frozenReason,
      id: item.id,
      lastUsedAt: item.lastUsedAt,
      nameSnapshot: item.nameSnapshot,
      nextOrderDate: item.nextOrderDate,
      remainingTimes: Math.max(0, item.totalTimes - item.usedTimes),
      startsAt: item.startsAt,
      status: item.status,
      store: item.store,
      template: item.template,
      totalTimes: item.totalTimes,
      updatedAt: item.updatedAt,
      usedTimes: item.usedTimes,
      usagePercent:
        item.totalTimes > 0 ? Math.round((item.usedTimes / item.totalTimes) * 100) : 0,
      user: item.user,
      weightLimitJin: toNumber(item.weightLimitJin),
    })),
    summary,
  };
}

function requirePackageAdjustment(input: AdjustUserPackageInput) {
  if (!Number.isInteger(input.totalTimes) || input.totalTimes < 1) {
    throw new PackageServiceError("TOTAL_TIMES_INVALID", "套餐总次数不正确");
  }

  if (!Number.isInteger(input.usedTimes) || input.usedTimes < 0) {
    throw new PackageServiceError("USED_TIMES_INVALID", "已用次数不正确");
  }

  if (input.usedTimes > input.totalTimes) {
    throw new PackageServiceError(
      "PACKAGE_USAGE_INVALID",
      "已用次数不能超过套餐总次数",
    );
  }

  if (!Number.isFinite(input.weightLimitJin) || input.weightLimitJin <= 0) {
    throw new PackageServiceError("WEIGHT_LIMIT_INVALID", "套餐重量额度不正确");
  }

  if (Number.isNaN(input.expiresAt.getTime())) {
    throw new PackageServiceError("EXPIRES_AT_INVALID", "套餐有效期不正确");
  }
}

export async function adjustUserPackage(input: AdjustUserPackageInput) {
  const reason = requireReason(input.reason);
  requirePackageAdjustment(input);
  const operator = await getActiveOperator(input.operatorId);

  return prisma.$transaction(async (tx) => {
    const userPackage = await tx.userPackage.findFirst({
      where: {
        id: input.userPackageId,
        storeId: input.storeId,
      },
    });

    if (!userPackage) {
      throw new PackageServiceError("USER_PACKAGE_NOT_FOUND", "用户套餐不存在");
    }

    const updated = await tx.userPackage.update({
      where: { id: userPackage.id },
      data: {
        expiresAt: input.expiresAt,
        nextOrderDate: input.nextOrderDate ?? null,
        totalTimes: input.totalTimes,
        usedTimes: input.usedTimes,
        weightLimitJin: new Prisma.Decimal(input.weightLimitJin),
      },
    });

    await tx.packageOperationLog.create({
      data: {
        afterValue: packageLogValue(updated),
        beforeValue: packageLogValue(userPackage),
        operatorId: operator.id,
        reason,
        userPackageId: userPackage.id,
      },
    });

    return updated;
  });
}

export async function freezeUserPackage(input: UserPackageOperationInput) {
  const reason = requireReason(input.reason);
  const operator = await getActiveOperator(input.operatorId);

  return prisma.$transaction(async (tx) => {
    const userPackage = await tx.userPackage.findFirst({
      where: {
        id: input.userPackageId,
        storeId: input.storeId,
      },
    });

    if (!userPackage) {
      throw new PackageServiceError("USER_PACKAGE_NOT_FOUND", "用户套餐不存在");
    }

    const updated = await tx.userPackage.update({
      where: { id: userPackage.id },
      data: {
        frozenReason: reason,
        status: "FROZEN",
      },
    });

    await tx.packageOperationLog.create({
      data: {
        afterValue: {
          frozenReason: updated.frozenReason,
          status: updated.status,
        },
        beforeValue: {
          frozenReason: userPackage.frozenReason,
          status: userPackage.status,
        },
        operatorId: operator.id,
        reason,
        userPackageId: userPackage.id,
      },
    });

    return updated;
  });
}

export async function unfreezeUserPackage(input: UserPackageOperationInput) {
  const reason = requireReason(input.reason);
  const operator = await getActiveOperator(input.operatorId);

  return prisma.$transaction(async (tx) => {
    const userPackage = await tx.userPackage.findFirst({
      where: {
        id: input.userPackageId,
        storeId: input.storeId,
      },
    });

    if (!userPackage) {
      throw new PackageServiceError("USER_PACKAGE_NOT_FOUND", "用户套餐不存在");
    }

    const updated = await tx.userPackage.update({
      where: { id: userPackage.id },
      data: {
        frozenReason: null,
        status: "ACTIVE",
      },
    });

    await tx.packageOperationLog.create({
      data: {
        afterValue: {
          frozenReason: updated.frozenReason,
          status: updated.status,
        },
        beforeValue: {
          frozenReason: userPackage.frozenReason,
          status: userPackage.status,
        },
        operatorId: operator.id,
        reason,
        userPackageId: userPackage.id,
      },
    });

    return updated;
  });
}
