import { prisma } from "./client";
import { Prisma, type PackageStatus } from "./generated/prisma/client";
import {
  buildPaginationMeta,
  normalizePagination,
  type ListPaginationInput,
} from "./pagination";

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

export type ListUserPackagesInput = ListPaginationInput & {
  query?: string;
  status?: PackageStatus;
  storeId: string;
};

export type GetUserPackageInput = {
  storeId: string;
  userPackageId: string;
};

export type CreateUserPackageInput = {
  operatorId: string;
  reason: string;
  status?: PackageStatus | null;
  storeId: string;
  templateId: string;
  totalTimes?: number | null;
  usedTimes?: number | null;
  userId: string;
  weightLimitJin?: number | null;
};

export type AdjustUserPackageInput = UserPackageOperationInput & {
  totalTimes: number;
  usedTimes: number;
  weightLimitJin: number;
};

export type DeleteUserPackageInput = UserPackageOperationInput;

export type ImportUserPackageRow = {
  phone: string;
  remark?: string | null;
  rowNumber?: number;
  status?: PackageStatus | null;
  templateName: string;
  totalTimes?: number | null;
  usedTimes?: number | null;
  weightLimitJin?: number | null;
};

export type ImportUserPackagesInput = {
  operatorId: string;
  rows: ImportUserPackageRow[];
  storeId: string;
};

export type ImportUserPackagesResult = {
  createdPackages: number;
  failedRows: number;
  failures: Array<{
    phone: string | null;
    reason: string;
    rowNumber: number;
    templateName: string | null;
  }>;
  importedRows: number;
  totalRows: number;
  updatedPackages: number;
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

function trimText(value: string | null | undefined) {
  const nextValue = value?.trim();
  return nextValue ? nextValue : null;
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

function requireImportInteger(
  value: number | null | undefined,
  rowNumber: number,
  fieldLabel: string,
) {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isInteger(value) || value < 0) {
    return `第 ${rowNumber} 行${fieldLabel}不正确`;
  }

  return null;
}

function farFuturePackageExpiry() {
  return new Date("2099-12-31T15:59:59.000Z");
}

function packageLogValue(userPackage: {
  status: PackageStatus;
  totalTimes: number;
  usedTimes: number;
  weightLimitJin: Prisma.Decimal;
}) {
  return {
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
            { nameSnapshot: { contains: query } },
            { user: { nickname: { contains: query } } },
            { user: { phone: { contains: query } } },
          ],
        }
      : {}),
  };

  const paginationInput = normalizePagination(input);

  const [items, total, summaryRows] = await Promise.all([
    prisma.userPackage.findMany({
      where,
      skip: paginationInput.skip,
      take: paginationInput.take,
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
    prisma.userPackage.count({ where }),
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
    pagination: buildPaginationMeta(paginationInput, total),
    summary,
  };
}

export async function getUserPackage(input: GetUserPackageInput) {
  const userPackage = await prisma.userPackage.findFirst({
    where: {
      id: input.userPackageId,
      storeId: input.storeId,
    },
    include: {
      operationLogs: {
        take: 20,
        orderBy: { createdAt: "desc" },
        include: {
          operator: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      },
      orders: {
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
          id: true,
          orderNo: true,
          status: true,
          totalWeightJin: true,
          updatedAt: true,
        },
      },
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
          totalTimes: true,
          validDays: true,
          weightLimitJin: true,
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

  if (!userPackage) {
    throw new PackageServiceError("USER_PACKAGE_NOT_FOUND", "用户套餐不存在");
  }

  return {
    createdAt: userPackage.createdAt,
    expiresAt: userPackage.expiresAt,
    frozenReason: userPackage.frozenReason,
    id: userPackage.id,
    lastUsedAt: userPackage.lastUsedAt,
    nameSnapshot: userPackage.nameSnapshot,
    operationLogs: userPackage.operationLogs.map((log) => ({
      afterValue: log.afterValue,
      beforeValue: log.beforeValue,
      createdAt: log.createdAt,
      id: log.id,
      operator: log.operator,
      reason: log.reason,
    })),
    recentOrders: userPackage.orders.map((order) => ({
      createdAt: order.createdAt,
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      totalWeightJin: toNumber(order.totalWeightJin),
      updatedAt: order.updatedAt,
    })),
    remainingTimes: Math.max(0, userPackage.totalTimes - userPackage.usedTimes),
    startsAt: userPackage.startsAt,
    status: userPackage.status,
    store: userPackage.store,
    template: {
      id: userPackage.template.id,
      name: userPackage.template.name,
      totalTimes: userPackage.template.totalTimes,
      validDays: userPackage.template.validDays,
      weightLimitJin: toNumber(userPackage.template.weightLimitJin),
    },
    totalTimes: userPackage.totalTimes,
    updatedAt: userPackage.updatedAt,
    usedTimes: userPackage.usedTimes,
    usagePercent:
      userPackage.totalTimes > 0
        ? Math.round((userPackage.usedTimes / userPackage.totalTimes) * 100)
        : 0,
    user: userPackage.user,
    weightLimitJin: toNumber(userPackage.weightLimitJin),
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
}

export async function createUserPackage(input: CreateUserPackageInput) {
  const reason = requireReason(input.reason);
  const operator = await getActiveOperator(input.operatorId);

  return prisma.$transaction(async (tx) => {
    const binding = await tx.memberStoreBinding.findFirst({
      select: { id: true, userId: true },
      where: {
        storeId: input.storeId,
        userId: input.userId,
      },
    });

    if (!binding) {
      throw new PackageServiceError(
        "MEMBER_NOT_FOUND",
        "会员不存在或未绑定当前数据范围",
      );
    }

    const template = await tx.packageTemplate.findFirst({
      include: {
        benefits: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
      where: {
        id: input.templateId,
        status: "ACTIVE",
        OR: [{ storeId: input.storeId }, { storeId: null }],
      },
    });

    if (!template) {
      throw new PackageServiceError(
        "PACKAGE_TEMPLATE_NOT_FOUND",
        "套餐模板不存在或已停用",
      );
    }

    const totalTimes = input.totalTimes ?? template.totalTimes;
    const usedTimes = input.usedTimes ?? 0;
    const weightLimitJin =
      input.weightLimitJin ?? toNumber(template.weightLimitJin);
    requirePackageAdjustment({
      operatorId: input.operatorId,
      reason,
      storeId: input.storeId,
      totalTimes,
      usedTimes,
      userPackageId: "",
      weightLimitJin,
    });

    const status = input.status ?? (usedTimes >= totalTimes ? "USED_UP" : "ACTIVE");
    const created = await tx.userPackage.create({
      data: {
        benefits: template.benefits.length
          ? {
              create: template.benefits.map((benefit) => ({
                kind: benefit.kind,
                nameSnapshot: benefit.name,
                shipmentGroup: benefit.shipmentGroup,
                sortOrder: benefit.sortOrder,
                templateBenefitId: benefit.id,
                totalQuantity: benefit.totalQuantity,
                unitSnapshot: benefit.unit,
              })),
            }
          : undefined,
        expiresAt: farFuturePackageExpiry(),
        frozenReason: status === "FROZEN" ? reason : null,
        nameSnapshot: template.name,
        status,
        storeId: input.storeId,
        templateId: template.id,
        totalTimes,
        usedTimes,
        userId: binding.userId,
        weightLimitJin: new Prisma.Decimal(weightLimitJin),
      },
    });

    await tx.packageOperationLog.create({
      data: {
        afterValue: packageLogValue(created),
        beforeValue: Prisma.JsonNull,
        operatorId: operator.id,
        reason,
        userPackageId: created.id,
      },
    });

    return created;
  });
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

export async function deleteUserPackage(input: DeleteUserPackageInput) {
  const reason = requireReason(input.reason);
  const operator = await getActiveOperator(input.operatorId);

  return prisma.$transaction(async (tx) => {
    const userPackage = await tx.userPackage.findFirst({
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
        user: {
          select: {
            id: true,
            nickname: true,
            phone: true,
          },
        },
      },
      where: {
        id: input.userPackageId,
        storeId: input.storeId,
      },
    });

    if (!userPackage) {
      throw new PackageServiceError("USER_PACKAGE_NOT_FOUND", "用户套餐不存在");
    }

    if (userPackage._count.orders > 0) {
      throw new PackageServiceError(
        "USER_PACKAGE_HAS_ORDERS",
        "已有订单记录的套餐不能删除，请冻结后保留历史",
      );
    }

    await tx.adminOperationLog.create({
      data: {
        action: "USER_PACKAGE_DELETE",
        beforeValue: {
          ...packageLogValue(userPackage),
          id: userPackage.id,
          nameSnapshot: userPackage.nameSnapshot,
          user: userPackage.user,
        },
        operatorId: operator.id,
        requestParams: {
          reason,
          userPackageId: userPackage.id,
        },
        resource: "user_package",
        resourceId: userPackage.id,
        storeId: input.storeId,
      },
    });
    await tx.packageOperationLog.deleteMany({
      where: { userPackageId: userPackage.id },
    });
    await tx.userPackage.delete({
      where: { id: userPackage.id },
    });

    return userPackage;
  });
}

export async function importUserPackages(
  input: ImportUserPackagesInput,
): Promise<ImportUserPackagesResult> {
  const operator = await getActiveOperator(input.operatorId);
  const failures: ImportUserPackagesResult["failures"] = [];
  const seenRows = new Set<string>();
  const validRows: Array<{
    phone: string;
    remark: string | null;
    rowNumber: number;
    status: PackageStatus | null;
    templateName: string;
    totalTimes: number | null;
    usedTimes: number | null;
    weightLimitJin: number | null;
  }> = [];

  input.rows.forEach((row, index) => {
    const rowNumber = row.rowNumber ?? index + 1;
    const phone = normalizeImportedPhone(row.phone);
    const templateName = row.templateName.trim();

    if (!/^1\d{10}$/.test(phone)) {
      failures.push({
        phone: row.phone?.trim() || null,
        reason: "手机号格式不正确",
        rowNumber,
        templateName: templateName || null,
      });
      return;
    }

    if (!templateName) {
      failures.push({
        phone,
        reason: "套餐模板名称不能为空",
        rowNumber,
        templateName: null,
      });
      return;
    }

    const duplicateKey = `${phone}:${templateName.toLowerCase()}`;
    if (seenRows.has(duplicateKey)) {
      failures.push({
        phone,
        reason: "同一批次手机号和套餐重复",
        rowNumber,
        templateName,
      });
      return;
    }

    const totalTimesError = requireImportInteger(
      row.totalTimes,
      rowNumber,
      "总次数",
    );
    if (totalTimesError || row.totalTimes === 0) {
      failures.push({
        phone,
        reason: totalTimesError ?? "套餐总次数必须大于 0",
        rowNumber,
        templateName,
      });
      return;
    }

    const usedTimesError = requireImportInteger(
      row.usedTimes,
      rowNumber,
      "已用次数",
    );
    if (usedTimesError) {
      failures.push({
        phone,
        reason: usedTimesError,
        rowNumber,
        templateName,
      });
      return;
    }

    if (
      row.weightLimitJin !== null &&
      row.weightLimitJin !== undefined &&
      (!Number.isFinite(row.weightLimitJin) || row.weightLimitJin <= 0)
    ) {
      failures.push({
        phone,
        reason: "单次斤数不正确",
        rowNumber,
        templateName,
      });
      return;
    }

    seenRows.add(duplicateKey);
    validRows.push({
      phone,
      remark: trimText(row.remark),
      rowNumber,
      status: row.status ?? null,
      templateName,
      totalTimes: row.totalTimes ?? null,
      usedTimes: row.usedTimes ?? null,
      weightLimitJin: row.weightLimitJin ?? null,
    });
  });

  return prisma.$transaction(async (tx) => {
    const store = await tx.store.findUnique({
      select: { id: true },
      where: { id: input.storeId },
    });

    if (!store) {
      throw new PackageServiceError("STORE_NOT_FOUND", "数据范围不存在");
    }

    const result: ImportUserPackagesResult = {
      createdPackages: 0,
      failedRows: failures.length,
      failures,
      importedRows: 0,
      totalRows: input.rows.length,
      updatedPackages: 0,
    };

    for (const row of validRows) {
      const binding = await tx.memberStoreBinding.findFirst({
        include: {
          user: {
            select: {
              id: true,
              phone: true,
            },
          },
        },
        where: {
          storeId: input.storeId,
          user: { phone: row.phone },
        },
      });

      if (!binding) {
        result.failures.push({
          phone: row.phone,
          reason: "会员不存在或未绑定当前数据范围",
          rowNumber: row.rowNumber,
          templateName: row.templateName,
        });
        continue;
      }

      const exactTemplates = await tx.packageTemplate.findMany({
        include: {
          benefits: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
        take: 2,
        where: {
          name: { equals: row.templateName },
          status: "ACTIVE",
          storeId: input.storeId,
        },
      });
      const containsTemplates =
        exactTemplates.length > 0
          ? []
          : await tx.packageTemplate.findMany({
              include: {
                benefits: {
                  orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                },
              },
              take: 2,
              where: {
                name: { contains: row.templateName },
                status: "ACTIVE",
                storeId: input.storeId,
              },
            });
      const templates = exactTemplates.length > 0 ? exactTemplates : containsTemplates;

      if (templates.length === 0) {
        result.failures.push({
          phone: row.phone,
          reason: "套餐模板不存在或已停用",
          rowNumber: row.rowNumber,
          templateName: row.templateName,
        });
        continue;
      }

      if (templates.length > 1) {
        result.failures.push({
          phone: row.phone,
          reason: "套餐模板名称匹配到多个模板，请填写完整名称",
          rowNumber: row.rowNumber,
          templateName: row.templateName,
        });
        continue;
      }

      const template = templates[0];
      if (!template) {
        result.failures.push({
          phone: row.phone,
          reason: "套餐模板不存在或已停用",
          rowNumber: row.rowNumber,
          templateName: row.templateName,
        });
        continue;
      }

      const totalTimes = row.totalTimes ?? template.totalTimes;
      const usedTimes = row.usedTimes ?? 0;
      const weightLimitJin =
        row.weightLimitJin ??
        toNumber(template.weightLimitJin);

      if (usedTimes > totalTimes) {
        result.failures.push({
          phone: row.phone,
          reason: "已用次数不能超过套餐总次数",
          rowNumber: row.rowNumber,
          templateName: row.templateName,
        });
        continue;
      }

      const status = row.status ?? (usedTimes >= totalTimes ? "USED_UP" : "ACTIVE");
      const reason = row.remark ?? "会员套餐导入";

      const created = await tx.userPackage.create({
        data: {
          benefits: template.benefits.length
            ? {
                create: template.benefits.map((benefit) => ({
                  kind: benefit.kind,
                  nameSnapshot: benefit.name,
                  shipmentGroup: benefit.shipmentGroup,
                  sortOrder: benefit.sortOrder,
                  templateBenefitId: benefit.id,
                  totalQuantity: benefit.totalQuantity,
                  unitSnapshot: benefit.unit,
                })),
              }
            : undefined,
          expiresAt: farFuturePackageExpiry(),
          frozenReason: status === "FROZEN" ? row.remark ?? "导入时冻结" : null,
          nameSnapshot: template.name,
          status,
          storeId: input.storeId,
          templateId: template.id,
          totalTimes,
          usedTimes,
          userId: binding.userId,
          weightLimitJin: new Prisma.Decimal(weightLimitJin),
        },
      });

      await tx.packageOperationLog.create({
        data: {
          afterValue: packageLogValue(created),
          beforeValue: Prisma.JsonNull,
          operatorId: operator.id,
          reason,
          userPackageId: created.id,
        },
      });
      result.createdPackages += 1;

      result.importedRows += 1;
    }

    result.failedRows = result.failures.length;

    await tx.adminOperationLog.create({
      data: {
        action: "USER_PACKAGE_IMPORT",
        afterValue: {
          createdPackages: result.createdPackages,
          failedRows: result.failedRows,
          failureSamples: result.failures.slice(0, 20),
          importedRows: result.importedRows,
          totalRows: result.totalRows,
          updatedPackages: result.updatedPackages,
        },
        operatorId: operator.id,
        requestParams: {
          rowCount: input.rows.length,
        },
        resource: "user_package",
        resourceId: null,
        statusCode: 200,
        storeId: input.storeId,
      },
    });

    return result;
  });
}
