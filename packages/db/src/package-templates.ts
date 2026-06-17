import { prisma } from "./client";
import { Prisma, type StoreStatus } from "./generated/prisma/client";

export class PackageTemplateServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PackageTemplateServiceError";
  }
}

export type ListPackageTemplatesInput = {
  query?: string;
  status?: StoreStatus;
  storeId: string;
};

export type CreatePackageTemplateInput = {
  name: string;
  operatorId: string;
  sortOrder?: number;
  storeId: string;
  totalTimes: number;
  validDays: number;
  weightLimitJin: number;
};

export type UpdatePackageTemplateInput = CreatePackageTemplateInput & {
  id: string;
  status: StoreStatus;
};

function toNumber(value: Prisma.Decimal) {
  return Number(value.toString());
}

async function getActiveOperator(operatorId: string) {
  const operator = await prisma.adminUser.findFirst({
    where: {
      id: operatorId,
      status: "ACTIVE",
    },
  });

  if (!operator) {
    throw new PackageTemplateServiceError("OPERATOR_NOT_FOUND", "操作员不存在");
  }

  return operator;
}

function normalizeTemplateInput(
  input: CreatePackageTemplateInput | UpdatePackageTemplateInput,
) {
  const name = input.name.trim();

  if (!name) {
    throw new PackageTemplateServiceError("NAME_REQUIRED", "请输入套餐名称");
  }

  if (!Number.isInteger(input.totalTimes) || input.totalTimes < 1) {
    throw new PackageTemplateServiceError("TOTAL_TIMES_INVALID", "套餐次数不正确");
  }

  if (!Number.isFinite(input.weightLimitJin) || input.weightLimitJin <= 0) {
    throw new PackageTemplateServiceError("WEIGHT_LIMIT_INVALID", "套餐斤数不正确");
  }

  if (!Number.isInteger(input.validDays) || input.validDays < 1) {
    throw new PackageTemplateServiceError("VALID_DAYS_INVALID", "有效天数不正确");
  }

  const sortOrder = input.sortOrder ?? 0;
  if (!Number.isInteger(sortOrder)) {
    throw new PackageTemplateServiceError("SORT_ORDER_INVALID", "排序值不正确");
  }

  return {
    name,
    sortOrder,
    totalTimes: input.totalTimes,
    validDays: input.validDays,
    weightLimitJin: new Prisma.Decimal(input.weightLimitJin),
  };
}

function templateLogValue(template: {
  name: string;
  sortOrder: number;
  status: StoreStatus;
  totalTimes: number;
  validDays: number;
  weightLimitJin: Prisma.Decimal;
}) {
  return {
    name: template.name,
    sortOrder: template.sortOrder,
    status: template.status,
    totalTimes: template.totalTimes,
    validDays: template.validDays,
    weightLimitJin: template.weightLimitJin.toString(),
  };
}

export async function listPackageTemplates(input: ListPackageTemplatesInput) {
  const query = input.query?.trim();
  const where: Prisma.PackageTemplateWhereInput = {
    storeId: input.storeId,
    ...(input.status ? { status: input.status } : {}),
    ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
  };

  const [templates, summaryRows] = await Promise.all([
    prisma.packageTemplate.findMany({
      where,
      orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        _count: {
          select: {
            purchaseOrders: true,
            userPackages: true,
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
      },
    }),
    prisma.packageTemplate.groupBy({
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
    items: templates.map((template) => ({
      createdAt: template.createdAt,
      id: template.id,
      name: template.name,
      purchaseOrderCount: template._count.purchaseOrders,
      sortOrder: template.sortOrder,
      status: template.status,
      store: template.store,
      totalTimes: template.totalTimes,
      updatedAt: template.updatedAt,
      userPackageCount: template._count.userPackages,
      validDays: template.validDays,
      weightLimitJin: toNumber(template.weightLimitJin),
    })),
    summary,
  };
}

export async function createPackageTemplate(input: CreatePackageTemplateInput) {
  const operator = await getActiveOperator(input.operatorId);
  const data = normalizeTemplateInput(input);

  return prisma.$transaction(async (tx) => {
    const template = await tx.packageTemplate.create({
      data: {
        ...data,
        status: "ACTIVE",
        storeId: input.storeId,
      },
    });

    await tx.adminOperationLog.create({
      data: {
        action: "PACKAGE_TEMPLATE_CREATED",
        afterValue: templateLogValue(template),
        beforeValue: Prisma.JsonNull,
        operatorId: operator.id,
        resource: "package_template",
        resourceId: template.id,
        storeId: input.storeId,
      },
    });

    return template;
  });
}

export async function updatePackageTemplate(input: UpdatePackageTemplateInput) {
  const operator = await getActiveOperator(input.operatorId);
  const data = normalizeTemplateInput(input);

  return prisma.$transaction(async (tx) => {
    const template = await tx.packageTemplate.findFirst({
      where: {
        id: input.id,
        storeId: input.storeId,
      },
    });

    if (!template) {
      throw new PackageTemplateServiceError(
        "PACKAGE_TEMPLATE_NOT_FOUND",
        "套餐模板不存在",
      );
    }

    const updated = await tx.packageTemplate.update({
      where: { id: template.id },
      data: {
        ...data,
        status: input.status,
      },
    });

    await tx.adminOperationLog.create({
      data: {
        action: "PACKAGE_TEMPLATE_UPDATED",
        afterValue: templateLogValue(updated),
        beforeValue: templateLogValue(template),
        operatorId: operator.id,
        resource: "package_template",
        resourceId: template.id,
        storeId: input.storeId,
      },
    });

    return updated;
  });
}
