import { prisma } from "./client";
import { type BindingStatus, Prisma } from "./generated/prisma/client";
import {
  buildPaginationMeta,
  normalizePagination,
  type ListPaginationInput,
} from "./pagination";

export type ListStoreMembersInput = ListPaginationInput & {
  query?: string;
  status?: BindingStatus;
  storeId: string;
};

export type GetStoreMemberInput = {
  storeId: string;
  userId: string;
};

export type StoreMemberAddressInput = {
  city?: string | null;
  detail?: string | null;
  district?: string | null;
  id?: string | null;
  province?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
};

export type UpdateStoreMemberInput = {
  defaultAddress?: StoreMemberAddressInput | null;
  disabledReason?: string | null;
  operatorId: string;
  remark?: string | null;
  status: BindingStatus;
  storeId: string;
  userId: string;
};

export type ImportStoreMemberRow = {
  disabledReason?: string | null;
  nickname?: string | null;
  phone: string;
  remark?: string | null;
  rowNumber?: number;
  status?: BindingStatus | null;
};

export type ImportStoreMembersInput = {
  operatorId: string;
  rows: ImportStoreMemberRow[];
  storeId: string;
};

export type ImportStoreMembersResult = {
  createdBindings: number;
  createdUsers: number;
  failedRows: number;
  failures: Array<{
    phone: string | null;
    reason: string;
    rowNumber: number;
  }>;
  importedRows: number;
  totalRows: number;
  updatedBindings: number;
  updatedUsers: number;
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

function trimText(value: string | null | undefined) {
  const nextValue = value?.trim();
  return nextValue ? nextValue : null;
}

function addressSnapshot(address: {
  city: string | null;
  detail: string;
  district: string | null;
  id: string;
  province: string | null;
  receiverName: string;
  receiverPhone: string;
} | null) {
  return address
    ? {
        city: address.city,
        detail: address.detail,
        district: address.district,
        id: address.id,
        province: address.province,
        receiverName: address.receiverName,
        receiverPhone: address.receiverPhone,
      }
    : null;
}

function normalizeMemberAddressInput(
  input: StoreMemberAddressInput | null | undefined,
  fallback: {
    nickname: string | null;
    phone: string | null;
  },
) {
  if (!input) {
    return null;
  }

  const detail = input.detail?.trim() ?? "";
  const receiverName = input.receiverName?.trim() || fallback.nickname || "";
  const receiverPhone = input.receiverPhone?.trim() || fallback.phone || "";
  const hasAddressInput = [
    detail,
    input.province,
    input.city,
    input.district,
    input.receiverName,
    input.receiverPhone,
  ].some((value) => Boolean(value?.trim()));

  if (!hasAddressInput) {
    return null;
  }

  if (!detail) {
    throw new MemberServiceError("ADDRESS_DETAIL_REQUIRED", "请输入详细地址");
  }

  if (!receiverName) {
    throw new MemberServiceError("RECEIVER_NAME_REQUIRED", "请输入收货人");
  }

  if (!receiverPhone) {
    throw new MemberServiceError("RECEIVER_PHONE_REQUIRED", "请输入联系电话");
  }

  return {
    city: trimText(input.city),
    detail,
    district: trimText(input.district),
    province: trimText(input.province),
    receiverName,
    receiverPhone,
  };
}

function normalizeImportedPhone(value: string) {
  let phone = value.trim().replace(/[\s-]/g, "");
  if (phone.startsWith("+86")) {
    phone = phone.slice(3);
  }
  if (phone.startsWith("86") && phone.length === 13) {
    phone = phone.slice(2);
  }

  return phone;
}

function importedOpenidForPhone(phone: string) {
  return `imported-phone:${phone}`;
}

export async function listStoreMembers(input: ListStoreMembersInput) {
  const query = input.query?.trim();
  const where: Prisma.MemberStoreBindingWhereInput = {
    storeId: input.storeId,
    ...(input.status ? { status: input.status } : {}),
    ...(query
      ? {
          OR: [
            { user: { nickname: { contains: query } } },
            { user: { phone: { contains: query } } },
          ],
        }
      : {}),
  };

  const paginationInput = normalizePagination(input);

  const [bindings, total, summaryRows] = await Promise.all([
    prisma.memberStoreBinding.findMany({
      where,
      skip: paginationInput.skip,
      take: paginationInput.take,
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
    prisma.memberStoreBinding.count({ where }),
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
              city: binding.user.addresses[0].city,
              detail: binding.user.addresses[0].detail,
              district: binding.user.addresses[0].district,
              id: binding.user.addresses[0].id,
              province: binding.user.addresses[0].province,
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
    pagination: buildPaginationMeta(paginationInput, total),
    summary,
  };
}

export async function getStoreMember(input: GetStoreMemberInput) {
  const binding = await prisma.memberStoreBinding.findFirst({
    where: {
      storeId: input.storeId,
      userId: input.userId,
    },
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
            where: {
              storeId: input.storeId,
            },
            orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
          },
          orders: {
            take: 10,
            where: {
              deletedByUserAt: null,
              storeId: input.storeId,
            },
            orderBy: { createdAt: "desc" },
            select: {
              createdAt: true,
              id: true,
              items: {
                select: {
                  dishNameSnapshot: true,
                  weightJin: true,
                },
              },
              orderNo: true,
              status: true,
              totalWeightJin: true,
              updatedAt: true,
              userPackageId: true,
            },
          },
          packages: {
            where: {
              storeId: input.storeId,
            },
            orderBy: { updatedAt: "desc" },
            include: {
              template: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!binding) {
    throw new MemberServiceError("MEMBER_NOT_FOUND", "会员不存在");
  }

  const activePackages = binding.user.packages.filter(
    (userPackage) => userPackage.status === "ACTIVE",
  );
  const latestActivePackage = activePackages[0] ?? null;
  const defaultAddress =
    binding.user.addresses.find((address) => address.isDefault) ??
    binding.user.addresses[0] ??
    null;

  return {
    activePackageCount: activePackages.length,
    addresses: binding.user.addresses.map((address) => ({
      city: address.city,
      createdAt: address.createdAt,
      detail: address.detail,
      district: address.district,
      id: address.id,
      isDefault: address.isDefault,
      province: address.province,
      receiverName: address.receiverName,
      receiverPhone: address.receiverPhone,
      updatedAt: address.updatedAt,
    })),
    avatarUrl: binding.user.avatarUrl,
    bindingId: binding.id,
    bindingStatus: binding.status,
    createdAt: binding.createdAt,
    defaultAddress: defaultAddress
      ? {
          city: defaultAddress.city,
          detail: defaultAddress.detail,
          district: defaultAddress.district,
          id: defaultAddress.id,
          province: defaultAddress.province,
          receiverName: defaultAddress.receiverName,
          receiverPhone: defaultAddress.receiverPhone,
        }
      : null,
    defaultStoreId: binding.user.defaultStoreId,
    disabledReason: binding.user.disabledReason,
    id: binding.user.id,
    isDefaultBinding: binding.isDefault,
    latestActivePackage: latestActivePackage
      ? {
          expiresAt: latestActivePackage.expiresAt,
          id: latestActivePackage.id,
          nameSnapshot: latestActivePackage.nameSnapshot,
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
    packages: binding.user.packages.map((userPackage) => ({
      createdAt: userPackage.createdAt,
      expiresAt: userPackage.expiresAt,
      frozenReason: userPackage.frozenReason,
      id: userPackage.id,
      lastUsedAt: userPackage.lastUsedAt,
      nameSnapshot: userPackage.nameSnapshot,
      remainingTimes: Math.max(
        userPackage.totalTimes - userPackage.usedTimes,
        0,
      ),
      startsAt: userPackage.startsAt,
      status: userPackage.status,
      template: userPackage.template
        ? {
            id: userPackage.template.id,
            name: userPackage.template.name,
          }
        : null,
      totalTimes: userPackage.totalTimes,
      updatedAt: userPackage.updatedAt,
      usedTimes: userPackage.usedTimes,
      weightLimitJin: toNumber(userPackage.weightLimitJin),
    })),
    phone: binding.user.phone,
    recentOrders: binding.user.orders.map((order) => ({
      createdAt: order.createdAt,
      id: order.id,
      items: order.items.map((item) => ({
        dishNameSnapshot: item.dishNameSnapshot,
        weightJin: toNumber(item.weightJin),
      })),
      orderNo: order.orderNo,
      status: order.status,
      totalWeightJin: toNumber(order.totalWeightJin),
      updatedAt: order.updatedAt,
      userPackageId: order.userPackageId,
    })),
    remark: binding.user.remark,
    source: binding.source,
    status: binding.user.status,
    store: binding.store,
    updatedAt: binding.updatedAt,
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
      include: {
        user: {
          include: {
            addresses: {
              where: {
                storeId: input.storeId,
              },
              orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
            },
          },
        },
      },
    });

    if (!binding) {
      throw new MemberServiceError("MEMBER_NOT_FOUND", "会员不存在");
    }

    const defaultAddress =
      binding.user.addresses.find((address) => address.isDefault) ??
      binding.user.addresses[0] ??
      null;
    const normalizedAddress = normalizeMemberAddressInput(
      input.defaultAddress,
      binding.user,
    );

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
    let updatedDefaultAddress = defaultAddress;

    if (normalizedAddress) {
      await tx.address.updateMany({
        where: {
          storeId: input.storeId,
          userId: input.userId,
          ...(defaultAddress ? { id: { not: defaultAddress.id } } : {}),
        },
        data: {
          isDefault: false,
        },
      });

      updatedDefaultAddress = defaultAddress
        ? await tx.address.update({
            where: { id: defaultAddress.id },
            data: {
              ...normalizedAddress,
              isDefault: true,
            },
          })
        : await tx.address.create({
            data: {
              ...normalizedAddress,
              isDefault: true,
              storeId: input.storeId,
              userId: input.userId,
            },
          });
    }

    await tx.adminOperationLog.create({
      data: {
        action: "MEMBER_STORE_BINDING_UPDATED",
        afterValue: {
          bindingStatus: updatedBinding.status,
          defaultAddress: addressSnapshot(updatedDefaultAddress),
          disabledReason: updatedUser.disabledReason,
          remark: updatedUser.remark,
        },
        beforeValue: {
          bindingStatus: binding.status,
          defaultAddress: addressSnapshot(defaultAddress),
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
      defaultAddress: addressSnapshot(updatedDefaultAddress),
      disabledReason: updatedUser.disabledReason,
      id: updatedUser.id,
      remark: updatedUser.remark,
    };
  });
}

export async function importStoreMembers(
  input: ImportStoreMembersInput,
): Promise<ImportStoreMembersResult> {
  const operator = await getActiveOperator(input.operatorId);
  const failures: ImportStoreMembersResult["failures"] = [];
  const seenPhones = new Set<string>();
  const validRows: Array<{
    disabledReason: string | null;
    nickname: string | null;
    phone: string;
    remark: string | null;
    rowNumber: number;
    status: BindingStatus;
  }> = [];

  input.rows.forEach((row, index) => {
    const rowNumber = row.rowNumber ?? index + 1;
    const phone = normalizeImportedPhone(row.phone);

    if (!/^1\d{10}$/.test(phone)) {
      failures.push({
        phone: row.phone?.trim() || null,
        reason: "手机号格式不正确",
        rowNumber,
      });
      return;
    }

    if (seenPhones.has(phone)) {
      failures.push({
        phone,
        reason: "同一批次手机号重复",
        rowNumber,
      });
      return;
    }

    seenPhones.add(phone);
    validRows.push({
      disabledReason: trimText(row.disabledReason),
      nickname: trimText(row.nickname),
      phone,
      remark: trimText(row.remark),
      rowNumber,
      status: row.status ?? "ACTIVE",
    });
  });

  return prisma.$transaction(async (tx) => {
    const store = await tx.store.findUnique({
      select: { id: true },
      where: { id: input.storeId },
    });

    if (!store) {
      throw new MemberServiceError("STORE_NOT_FOUND", "门店不存在");
    }

    const result: ImportStoreMembersResult = {
      createdBindings: 0,
      createdUsers: 0,
      failedRows: failures.length,
      failures,
      importedRows: 0,
      totalRows: input.rows.length,
      updatedBindings: 0,
      updatedUsers: 0,
    };

    for (const row of validRows) {
      const candidates = await tx.user.findMany({
        include: {
          storeBindings: {
            where: { storeId: input.storeId },
          },
        },
        orderBy: { createdAt: "asc" },
        take: 10,
        where: { phone: row.phone },
      });
      const existingUser =
        candidates.find((candidate) => candidate.storeBindings.length > 0) ??
        candidates[0] ??
        null;

      const shouldUseStoreAsDefault =
        !existingUser?.defaultStoreId || existingUser.defaultStoreId === input.storeId;
      const userUpdateData: Prisma.UserUpdateInput = {
        ...(row.nickname ? { nickname: row.nickname } : {}),
        ...(row.remark ? { remark: row.remark } : {}),
        ...(!existingUser?.defaultStoreId
          ? { defaultStore: { connect: { id: input.storeId } } }
          : {}),
        ...(row.status === "DISABLED"
          ? { disabledReason: row.disabledReason ?? "导入时标记停用" }
          : {}),
      };
      const hasUserUpdates = Object.keys(userUpdateData).length > 0;

      const user = existingUser
        ? hasUserUpdates
          ? await tx.user.update({
              data: userUpdateData,
              where: { id: existingUser.id },
            })
          : existingUser
        : await tx.user.create({
            data: {
              defaultStoreId: input.storeId,
              disabledReason:
                row.status === "DISABLED"
                  ? row.disabledReason ?? "导入时标记停用"
                  : null,
              nickname: row.nickname,
              openid: importedOpenidForPhone(row.phone),
              phone: row.phone,
              remark: row.remark,
            },
          });

      if (existingUser) {
        if (hasUserUpdates) {
          result.updatedUsers += 1;
        }
      } else {
        result.createdUsers += 1;
      }

      const existingBinding = await tx.memberStoreBinding.findUnique({
        where: {
          userId_storeId: {
            storeId: input.storeId,
            userId: user.id,
          },
        },
      });

      if (existingBinding) {
        await tx.memberStoreBinding.update({
          data: {
            isDefault: shouldUseStoreAsDefault,
            status: row.status,
          },
          where: { id: existingBinding.id },
        });
        result.updatedBindings += 1;
      } else {
        await tx.memberStoreBinding.create({
          data: {
            isDefault: shouldUseStoreAsDefault,
            source: "member_import",
            status: row.status,
            storeId: input.storeId,
            userId: user.id,
          },
        });
        result.createdBindings += 1;
      }

      result.importedRows += 1;
    }

    await tx.adminOperationLog.create({
      data: {
        action: "MEMBER_IMPORT",
        afterValue: {
          createdBindings: result.createdBindings,
          createdUsers: result.createdUsers,
          failedRows: result.failedRows,
          failureSamples: result.failures.slice(0, 20),
          importedRows: result.importedRows,
          totalRows: result.totalRows,
          updatedBindings: result.updatedBindings,
          updatedUsers: result.updatedUsers,
        },
        operatorId: operator.id,
        requestParams: {
          rowCount: input.rows.length,
        },
        resource: "member",
        resourceId: null,
        statusCode: 200,
        storeId: input.storeId,
      },
    });

    return result;
  });
}
