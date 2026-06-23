import { prisma } from "./client";
import {
  Prisma,
  type DishCategory,
  type DishStatus,
} from "./generated/prisma/client";
import {
  buildPaginationMeta,
  normalizePagination,
  type ListPaginationInput,
} from "./pagination";

export class DishServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DishServiceError";
  }
}

export type ListDishesInput = ListPaginationInput & {
  category?: DishCategory;
  query?: string;
  status?: DishStatus;
  storeId: string;
};

export type GetDishInput = {
  dishId: string;
  storeId: string;
};

export type CreateDishInput = {
  category: DishCategory;
  description?: string | null;
  imageKey?: string | null;
  imageUrl?: string | null;
  name: string;
  operatorId: string;
  sortOrder?: number;
  status?: DishStatus;
  stepJin: number;
  stockJin: number;
  storeId: string;
};

export type UpdateDishInput = CreateDishInput & {
  id: string;
  status: DishStatus;
};

export type AdjustDishInventoryInput = {
  changeJin: number;
  dishId: string;
  operatorId: string;
  reason: string;
  storeId: string;
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
    throw new DishServiceError("OPERATOR_NOT_FOUND", "操作员不存在");
  }

  return operator;
}

function requireReason(reason: string) {
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    throw new DishServiceError("REASON_REQUIRED", "请输入操作原因");
  }

  return trimmedReason;
}

function normalizeNullableText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function normalizeDishInput(input: CreateDishInput | UpdateDishInput) {
  const name = input.name.trim();

  if (!name) {
    throw new DishServiceError("NAME_REQUIRED", "请输入菜品名称");
  }

  if (!Number.isFinite(input.stepJin) || input.stepJin <= 0) {
    throw new DishServiceError("STEP_JIN_INVALID", "起订步进不正确");
  }

  if (!Number.isFinite(input.stockJin) || input.stockJin < 0) {
    throw new DishServiceError("STOCK_JIN_INVALID", "库存斤数不正确");
  }

  const sortOrder = input.sortOrder ?? 0;
  if (!Number.isInteger(sortOrder)) {
    throw new DishServiceError("SORT_ORDER_INVALID", "排序值不正确");
  }

  return {
    category: input.category,
    description: normalizeNullableText(input.description),
    imageKey: normalizeNullableText(input.imageKey),
    imageUrl: normalizeNullableText(input.imageUrl),
    name,
    sortOrder,
    status: input.stockJin <= 0 ? "OFF_SALE" : (input.status ?? "ON_SALE"),
    stepJin: new Prisma.Decimal(input.stepJin),
    stockJin: new Prisma.Decimal(input.stockJin),
  };
}

function dishLogValue(dish: {
  category: DishCategory;
  description: string | null;
  imageKey: string | null;
  imageUrl: string | null;
  name: string;
  sortOrder: number;
  status: DishStatus;
  stepJin: Prisma.Decimal;
  stockJin: Prisma.Decimal;
}) {
  return {
    category: dish.category,
    description: dish.description,
    imageKey: dish.imageKey,
    imageUrl: dish.imageUrl,
    name: dish.name,
    sortOrder: dish.sortOrder,
    status: dish.status,
    stepJin: dish.stepJin.toString(),
    stockJin: dish.stockJin.toString(),
  };
}

export async function listDishes(input: ListDishesInput) {
  const query = input.query?.trim();
  const where: Prisma.DishWhereInput = {
    deletedAt: null,
    storeId: input.storeId,
    ...(input.category ? { category: input.category } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query } },
            { description: { contains: query } },
          ],
        }
      : {}),
  };

  const paginationInput = normalizePagination(input);

  const [dishes, total, summaryRows, stockSummary, lowStockCount] = await Promise.all([
    prisma.dish.findMany({
      where,
      skip: paginationInput.skip,
      take: paginationInput.take,
      orderBy: [
        { status: "asc" },
        { category: "asc" },
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
      include: {
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
    prisma.dish.count({ where }),
    prisma.dish.groupBy({
      by: ["status"],
      where: {
        deletedAt: null,
        storeId: input.storeId,
      },
      _count: { _all: true },
    }),
    prisma.dish.aggregate({
      where: {
        deletedAt: null,
        storeId: input.storeId,
      },
      _sum: { stockJin: true },
    }),
    prisma.dish.count({
      where: {
        deletedAt: null,
        stockJin: { lte: new Prisma.Decimal(5) },
        storeId: input.storeId,
      },
    }),
  ]);

  const summary = summaryRows.reduce(
    (value, row) => {
      value.total += row._count._all;
      if (row.status === "ON_SALE") {
        value.onSale = row._count._all;
      }
      if (row.status === "OFF_SALE") {
        value.offSale = row._count._all;
      }
      return value;
    },
    {
      lowStock: lowStockCount,
      offSale: 0,
      onSale: 0,
      stock: Number(stockSummary._sum.stockJin?.toString() ?? 0),
      total: 0,
    },
  );

  return {
    items: dishes.map((dish) => ({
      category: dish.category,
      createdAt: dish.createdAt,
      deletedAt: dish.deletedAt,
      description: dish.description,
      id: dish.id,
      imageKey: dish.imageKey,
      imageUrl: dish.imageUrl,
      name: dish.name,
      sortOrder: dish.sortOrder,
      status: dish.status,
      stepJin: toNumber(dish.stepJin),
      stockJin: toNumber(dish.stockJin),
      store: dish.store,
      updatedAt: dish.updatedAt,
    })),
    pagination: buildPaginationMeta(paginationInput, total),
    summary,
  };
}

export async function getDish(input: GetDishInput) {
  const dish = await prisma.dish.findFirst({
    where: {
      deletedAt: null,
      id: input.dishId,
      storeId: input.storeId,
    },
    include: {
      inventoryLogs: {
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

  if (!dish) {
    throw new DishServiceError("DISH_NOT_FOUND", "菜品不存在");
  }

  return {
    category: dish.category,
    createdAt: dish.createdAt,
    deletedAt: dish.deletedAt,
    description: dish.description,
    id: dish.id,
    imageKey: dish.imageKey,
    imageUrl: dish.imageUrl,
    inventoryLogs: dish.inventoryLogs.map((log) => ({
      afterJin: toNumber(log.afterJin),
      beforeJin: toNumber(log.beforeJin),
      changeJin: toNumber(log.changeJin),
      createdAt: log.createdAt,
      id: log.id,
      operator: log.operator,
      reason: log.reason,
    })),
    name: dish.name,
    sortOrder: dish.sortOrder,
    status: dish.status,
    stepJin: toNumber(dish.stepJin),
    stockJin: toNumber(dish.stockJin),
    store: dish.store,
    updatedAt: dish.updatedAt,
  };
}

export async function createDish(input: CreateDishInput) {
  const operator = await getActiveOperator(input.operatorId);
  const data = normalizeDishInput(input);

  return prisma.$transaction(async (tx) => {
    const dish = await tx.dish.create({
      data: {
        ...data,
        storeId: input.storeId,
      },
    });

    await tx.adminOperationLog.create({
      data: {
        action: "DISH_CREATED",
        afterValue: dishLogValue(dish),
        beforeValue: Prisma.JsonNull,
        operatorId: operator.id,
        resource: "dish",
        resourceId: dish.id,
        storeId: input.storeId,
      },
    });

    return dish;
  });
}

export async function updateDish(input: UpdateDishInput) {
  const operator = await getActiveOperator(input.operatorId);
  const data = normalizeDishInput(input);

  return prisma.$transaction(async (tx) => {
    const dish = await tx.dish.findFirst({
      where: {
        deletedAt: null,
        id: input.id,
        storeId: input.storeId,
      },
    });

    if (!dish) {
      throw new DishServiceError("DISH_NOT_FOUND", "菜品不存在");
    }

    const updated = await tx.dish.update({
      where: { id: dish.id },
      data,
    });

    await tx.adminOperationLog.create({
      data: {
        action: "DISH_UPDATED",
        afterValue: dishLogValue(updated),
        beforeValue: dishLogValue(dish),
        operatorId: operator.id,
        resource: "dish",
        resourceId: dish.id,
        storeId: input.storeId,
      },
    });

    return updated;
  });
}

export async function adjustDishInventory(input: AdjustDishInventoryInput) {
  const reason = requireReason(input.reason);
  if (!Number.isFinite(input.changeJin) || input.changeJin === 0) {
    throw new DishServiceError("CHANGE_JIN_INVALID", "库存调整斤数不正确");
  }

  const operator = await getActiveOperator(input.operatorId);

  return prisma.$transaction(async (tx) => {
    const dish = await tx.dish.findFirst({
      where: {
        deletedAt: null,
        id: input.dishId,
        storeId: input.storeId,
      },
    });

    if (!dish) {
      throw new DishServiceError("DISH_NOT_FOUND", "菜品不存在");
    }

    const beforeJin = toNumber(dish.stockJin);
    const afterJin = Math.round((beforeJin + input.changeJin) * 100) / 100;

    if (afterJin < 0) {
      throw new DishServiceError("STOCK_NOT_ENOUGH", "库存不能调整为负数");
    }

    const updated = await tx.dish.update({
      where: { id: dish.id },
      data: {
        status: afterJin <= 0 ? "OFF_SALE" : dish.status,
        stockJin: new Prisma.Decimal(afterJin),
      },
    });

    await tx.inventoryLog.create({
      data: {
        afterJin: updated.stockJin,
        beforeJin: dish.stockJin,
        changeJin: new Prisma.Decimal(input.changeJin),
        dishId: dish.id,
        operatorId: operator.id,
        reason,
        storeId: input.storeId,
      },
    });

    return updated;
  });
}
