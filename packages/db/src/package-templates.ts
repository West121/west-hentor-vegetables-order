import { prisma } from "./client";
import { Prisma, type StoreStatus } from "./generated/prisma/client";
import {
  buildPaginationMeta,
  normalizePagination,
  type ListPaginationInput,
} from "./pagination";

export class PackageTemplateServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PackageTemplateServiceError";
  }
}

export type ListPackageTemplatesInput = ListPaginationInput & {
  query?: string;
  status?: StoreStatus;
  storeId: string;
};

export type GetPackageTemplateInput = {
  storeId: string;
  templateId: string;
};

export type PackageTemplateBenefitInput = {
  kind?: string;
  name: string;
  sortOrder?: number;
  totalQuantity: number;
  unit: string;
};

export type CreatePackageTemplateInput = {
  benefits?: PackageTemplateBenefitInput[];
  name: string;
  operatorId: string;
  sortOrder?: number;
  storeId: string;
  totalTimes: number;
  validDays?: number;
  weightLimitJin: number;
};

export type UpdatePackageTemplateInput = CreatePackageTemplateInput & {
  id: string;
  status: StoreStatus;
};

const templateBenefitOrder = { sortOrder: "asc" as const };
const INTERNAL_VALID_DAYS = 36500;

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

  const validDays = input.validDays ?? INTERNAL_VALID_DAYS;
  if (!Number.isInteger(validDays) || validDays < 1) {
    throw new PackageTemplateServiceError("VALID_DAYS_INVALID", "套餐参数不正确");
  }

  const sortOrder = input.sortOrder ?? 0;
  if (!Number.isInteger(sortOrder)) {
    throw new PackageTemplateServiceError("SORT_ORDER_INVALID", "排序值不正确");
  }

  return {
    name,
    sortOrder,
    totalTimes: input.totalTimes,
    validDays,
    weightLimitJin: new Prisma.Decimal(input.weightLimitJin),
  };
}

function normalizeTemplateBenefits(benefits: PackageTemplateBenefitInput[] = []) {
  return benefits
    .map((benefit, index) => {
      const kind = benefit.kind?.trim() || "EXTRA";
      const name = benefit.name.trim();
      const unit = benefit.unit.trim();
      const sortOrder = benefit.sortOrder ?? index;

      if (!name && !unit && !benefit.totalQuantity) {
        return null;
      }

      if (!name) {
        throw new PackageTemplateServiceError(
          "BENEFIT_NAME_REQUIRED",
          "请输入附加权益名称",
        );
      }

      if (!unit) {
        throw new PackageTemplateServiceError(
          "BENEFIT_UNIT_REQUIRED",
          "请输入附加权益单位",
        );
      }

      if (!Number.isFinite(benefit.totalQuantity) || benefit.totalQuantity <= 0) {
        throw new PackageTemplateServiceError(
          "BENEFIT_QUANTITY_INVALID",
          "附加权益数量不正确",
        );
      }

      if (!Number.isInteger(sortOrder)) {
        throw new PackageTemplateServiceError(
          "BENEFIT_SORT_ORDER_INVALID",
          "附加权益排序值不正确",
        );
      }

      return {
        kind,
        name,
        shipmentGroup: name,
        sortOrder,
        totalQuantity: new Prisma.Decimal(benefit.totalQuantity),
        unit,
      };
    })
    .filter((benefit): benefit is NonNullable<typeof benefit> => Boolean(benefit));
}

function templateBenefitView(benefit: {
  id: string;
  kind: string;
  name: string;
  shipmentGroup: string | null;
  sortOrder: number;
  totalQuantity: Prisma.Decimal;
  unit: string;
}) {
  return {
    id: benefit.id,
    kind: benefit.kind,
    name: benefit.name,
    shipmentGroup: benefit.shipmentGroup,
    sortOrder: benefit.sortOrder,
    totalQuantity: toNumber(benefit.totalQuantity),
    unit: benefit.unit,
  };
}

function templateLogValue(template: {
  benefits?: Array<{
    kind: string;
    name: string;
    shipmentGroup: string | null;
    sortOrder: number;
    totalQuantity: Prisma.Decimal;
    unit: string;
  }>;
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
    benefits:
      template.benefits?.map((benefit) => ({
        kind: benefit.kind,
        name: benefit.name,
        shipmentGroup: benefit.shipmentGroup,
        sortOrder: benefit.sortOrder,
        totalQuantity: benefit.totalQuantity.toString(),
        unit: benefit.unit,
      })) ?? [],
  };
}

function isSameDecimal(left: Prisma.Decimal, right: Prisma.Decimal) {
  return left.equals(right);
}

export async function listPackageTemplates(input: ListPackageTemplatesInput) {
  const query = input.query?.trim();
  const where: Prisma.PackageTemplateWhereInput = {
    storeId: input.storeId,
    ...(input.status ? { status: input.status } : {}),
    ...(query ? { name: { contains: query } } : {}),
  };

  const paginationInput = normalizePagination(input);

  const [templates, total, summaryRows, purchaseOrderCount, userPackageCount] =
    await Promise.all([
    prisma.packageTemplate.findMany({
      where,
      skip: paginationInput.skip,
      take: paginationInput.take,
      orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        benefits: {
          orderBy: templateBenefitOrder,
        },
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
    prisma.packageTemplate.count({ where }),
    prisma.packageTemplate.groupBy({
      by: ["status"],
      where: { storeId: input.storeId },
      _count: { _all: true },
    }),
    prisma.packagePurchaseOrder.count({
      where: { storeId: input.storeId },
    }),
    prisma.userPackage.count({
      where: { storeId: input.storeId },
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
    {
      active: 0,
      disabled: 0,
      purchaseOrders: purchaseOrderCount,
      total: 0,
      userPackages: userPackageCount,
    },
  );

  return {
    items: templates.map((template) => ({
      createdAt: template.createdAt,
      id: template.id,
      benefits: template.benefits.map(templateBenefitView),
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
    pagination: buildPaginationMeta(paginationInput, total),
    summary,
  };
}

export async function getPackageTemplate(input: GetPackageTemplateInput) {
  const template = await prisma.packageTemplate.findFirst({
    where: {
      id: input.templateId,
      storeId: input.storeId,
    },
      include: {
      benefits: {
        orderBy: templateBenefitOrder,
      },
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
  });

  if (!template) {
    throw new PackageTemplateServiceError(
      "PACKAGE_TEMPLATE_NOT_FOUND",
      "套餐模板不存在",
    );
  }

  return {
    createdAt: template.createdAt,
    id: template.id,
    benefits: template.benefits.map(templateBenefitView),
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
  };
}

export async function createPackageTemplate(input: CreatePackageTemplateInput) {
  const operator = await getActiveOperator(input.operatorId);
  const data = normalizeTemplateInput(input);
  const benefits = normalizeTemplateBenefits(input.benefits);

  return prisma.$transaction(async (tx) => {
    const template = await tx.packageTemplate.create({
      data: {
        ...data,
        benefits: benefits.length
          ? {
              create: benefits,
            }
          : undefined,
        status: "ACTIVE",
        storeId: input.storeId,
      },
      include: {
        benefits: {
          orderBy: templateBenefitOrder,
        },
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
  const benefits = normalizeTemplateBenefits(input.benefits);

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

    const changesBoundPackageCore =
      template.totalTimes !== data.totalTimes ||
      !isSameDecimal(template.weightLimitJin, data.weightLimitJin);
    if (changesBoundPackageCore) {
      const userPackageCount = await tx.userPackage.count({
        where: { templateId: template.id },
      });

      if (userPackageCount > 0) {
        throw new PackageTemplateServiceError(
          "PACKAGE_TEMPLATE_IN_USE",
          "已有用户套餐使用该模板，不能修改总次数或单次重量",
        );
      }
    }

    const beforeBenefits = await tx.packageTemplateBenefit.findMany({
      where: { templateId: template.id },
      orderBy: templateBenefitOrder,
    });

    await tx.packageTemplateBenefit.deleteMany({
      where: { templateId: template.id },
    });

    const updated = await tx.packageTemplate.update({
      where: { id: template.id },
      data: {
        ...data,
        benefits: benefits.length
          ? {
              create: benefits,
            }
          : undefined,
        status: input.status,
      },
      include: {
        benefits: {
          orderBy: templateBenefitOrder,
        },
      },
    });

    await tx.adminOperationLog.create({
      data: {
        action: "PACKAGE_TEMPLATE_UPDATED",
        afterValue: templateLogValue(updated),
        beforeValue: templateLogValue({ ...template, benefits: beforeBenefits }),
        operatorId: operator.id,
        resource: "package_template",
        resourceId: template.id,
        storeId: input.storeId,
      },
    });

    return updated;
  });
}
