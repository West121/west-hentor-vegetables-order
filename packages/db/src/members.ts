import { prisma } from "./client";
import { type BindingStatus, Prisma } from "./generated/prisma/client";

export type ListStoreMembersInput = {
  query?: string;
  status?: BindingStatus;
  storeId: string;
};

export type UpdateStoreMemberInput = {
  disabledReason?: string | null;
  operatorId: string;
  remark?: string | null;
  status: BindingStatus;
  storeId: string;
  userId: string;
};

export class MemberServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "MemberServiceError";
  }
}

async function getActiveOperator(operatorId: string) {
  const operator = await prisma.adminUser.findFirst({
    where: {
      id: operatorId,
      status: "ACTIVE",
    },
  });

  if (!operator) {
    throw new MemberServiceError("OPERATOR_NOT_FOUND", "操作员不存在");
  }

  return operator;
}

function toNumber(value: Prisma.Decimal) {
  return Number(value.toString());
}

export async function listStoreMembers(input: ListStoreMembersInput) {
  const query = input.query?.trim();
  const where: Prisma.MemberStoreBindingWhereInput = {
    storeId: input.storeId,
    ...(input.status ? { status: input.status } : {}),
    ...(query
      ? {
          OR: [
            { user: { nickname: { contains: query, mode: "insensitive" } } },
            { user: { phone: { contains: query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [bindings, summaryRows] = await Promise.all([
    prisma.memberStoreBinding.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        store: {
          select: {
            code: true,
            id: true,
            name: true,
          },
        },
        user: {
          include: {
            addresses: {
              take: 1,
              where: {
                isDefault: true,
                storeId: input.storeId,
              },
              orderBy: { createdAt: "desc" },
            },
            orders: {
              where: {
                deletedByUserAt: null,
                storeId: input.storeId,
              },
              select: { id: true },
            },
            packages: {
              where: {
                storeId: input.storeId,
              },
              select: {
                id: true,
                status: true,
                totalTimes: true,
                usedTimes: true,
                weightLimitJin: true,
              },
            },
          },
        },
      },
    }),
    prisma.memberStoreBinding.groupBy({
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
      if (row.status === "DISABLED") {
        value.disabled = row._count._all;
      }
      return value;
    },
    { active: 0, disabled: 0, total: 0 },
  );

  return {
    items: bindings.map((binding) => {
      const activePackages = binding.user.packages.filter(
        (userPackage) => userPackage.status === "ACTIVE",
      );
      const latestActivePackage = activePackages[0] ?? null;

      return {
        activePackageCount: activePackages.length,
        avatarUrl: binding.user.avatarUrl,
        bindingId: binding.id,
        bindingStatus: binding.status,
        createdAt: binding.createdAt,
        defaultAddress: binding.user.addresses[0]
          ? {
              detail: binding.user.addresses[0].detail,
              id: binding.user.addresses[0].id,
              receiverName: binding.user.addresses[0].receiverName,
              receiverPhone: binding.user.addresses[0].receiverPhone,
            }
          : null,
        defaultStoreId: binding.user.defaultStoreId,
        disabledReason: binding.user.disabledReason,
        id: binding.user.id,
        isDefaultBinding: binding.isDefault,
        latestActivePackage: latestActivePackage
          ? {
              id: latestActivePackage.id,
              remainingTimes: Math.max(
                latestActivePackage.totalTimes - latestActivePackage.usedTimes,
                0,
              ),
              totalTimes: latestActivePackage.totalTimes,
              usedTimes: latestActivePackage.usedTimes,
              weightLimitJin: toNumber(latestActivePackage.weightLimitJin),
            }
          : null,
        nickname: binding.user.nickname,
        orderCount: binding.user.orders.length,
        phone: binding.user.phone,
        remark: binding.user.remark,
        source: binding.source,
        status: binding.user.status,
        store: binding.store,
        updatedAt: binding.updatedAt,
      };
    }),
    summary,
  };
}

export async function updateStoreMember(input: UpdateStoreMemberInput) {
  const operator = await getActiveOperator(input.operatorId);

  return prisma.$transaction(async (tx) => {
    const binding = await tx.memberStoreBinding.findFirst({
      where: {
        storeId: input.storeId,
        userId: input.userId,
      },
      include: { user: true },
    });

    if (!binding) {
      throw new MemberServiceError("MEMBER_NOT_FOUND", "会员不存在");
    }

    const [updatedBinding, updatedUser] = await Promise.all([
      tx.memberStoreBinding.update({
        where: { id: binding.id },
        data: {
          status: input.status,
        },
      }),
      tx.user.update({
        where: { id: binding.userId },
        data: {
          disabledReason:
            input.status === "DISABLED"
              ? input.disabledReason?.trim() || null
              : null,
          remark: input.remark?.trim() || null,
        },
      }),
    ]);

    await tx.adminOperationLog.create({
      data: {
        action: "MEMBER_STORE_BINDING_UPDATED",
        afterValue: {
          bindingStatus: updatedBinding.status,
          disabledReason: updatedUser.disabledReason,
          remark: updatedUser.remark,
        },
        beforeValue: {
          bindingStatus: binding.status,
          disabledReason: binding.user.disabledReason,
          remark: binding.user.remark,
        },
        operatorId: operator.id,
        resource: "member",
        resourceId: binding.userId,
        storeId: binding.storeId,
      },
    });

    return {
      bindingStatus: updatedBinding.status,
      disabledReason: updatedUser.disabledReason,
      id: updatedUser.id,
      remark: updatedUser.remark,
    };
  });
}
