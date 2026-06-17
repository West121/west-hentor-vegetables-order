import { prisma } from "./client";

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
