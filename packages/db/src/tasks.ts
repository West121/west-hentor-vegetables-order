import { prisma } from "./client";
import { Prisma, type TaskStatus } from "./generated/prisma/client";

export class TaskServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "TaskServiceError";
  }
}

export type ListTasksInput = {
  query?: string;
  status?: TaskStatus;
  storeId: string;
};

export type TaskMutationInput = {
  cutoffTime: string;
  dishIds: string[];
  endsAt: Date;
  name: string;
  operatorId: string;
  startsAt: Date;
  status: TaskStatus;
  storeId: string;
  tag?: string | null;
};

export type CreateTaskInput = TaskMutationInput;

export type UpdateTaskInput = TaskMutationInput & {
  id: string;
};

export type CopyTaskInput = {
  id: string;
  name: string;
  operatorId: string;
  storeId: string;
};

export type GetActiveTaskForStoreInput = {
  at?: Date;
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
    throw new TaskServiceError("OPERATOR_NOT_FOUND", "操作员不存在");
  }

  return operator;
}

function normalizeTaskInput(input: TaskMutationInput) {
  const name = input.name.trim();
  const cutoffTime = input.cutoffTime.trim();
  const tag = input.tag?.trim() || null;

  if (!name) {
    throw new TaskServiceError("NAME_REQUIRED", "请输入任务名称");
  }

  if (!/^\d{2}:\d{2}$/.test(cutoffTime)) {
    throw new TaskServiceError("CUTOFF_TIME_INVALID", "截单时间不正确");
  }

  if (Number.isNaN(input.startsAt.getTime())) {
    throw new TaskServiceError("STARTS_AT_INVALID", "开始时间不正确");
  }

  if (Number.isNaN(input.endsAt.getTime())) {
    throw new TaskServiceError("ENDS_AT_INVALID", "结束时间不正确");
  }

  if (input.endsAt <= input.startsAt) {
    throw new TaskServiceError("TASK_RANGE_INVALID", "结束时间必须晚于开始时间");
  }

  const dishIds = [...new Set(input.dishIds)];
  if (dishIds.length === 0 || dishIds.length !== input.dishIds.length) {
    throw new TaskServiceError("DISH_IDS_INVALID", "请选择不重复的菜品");
  }

  return {
    cutoffTime,
    dishIds,
    endsAt: input.endsAt,
    name,
    startsAt: input.startsAt,
    status: input.status,
    tag,
  };
}

async function ensureTaskDishes(
  tx: Prisma.TransactionClient,
  storeId: string,
  dishIds: string[],
) {
  const dishes = await tx.dish.findMany({
    where: {
      deletedAt: null,
      id: { in: dishIds },
      storeId,
    },
    select: {
      id: true,
    },
  });

  if (dishes.length !== dishIds.length) {
    throw new TaskServiceError("DISH_NOT_FOUND", "菜品不存在或不属于当前门店");
  }
}

function taskLogValue(input: {
  cutoffTime: string;
  dishIds: string[];
  endsAt: Date;
  name: string;
  startsAt: Date;
  status: TaskStatus;
  tag: string | null;
}) {
  return {
    cutoffTime: input.cutoffTime,
    dishIds: input.dishIds,
    endsAt: input.endsAt.toISOString(),
    name: input.name,
    startsAt: input.startsAt.toISOString(),
    status: input.status,
    tag: input.tag,
  };
}

async function replaceTaskDishes(
  tx: Prisma.TransactionClient,
  taskId: string,
  dishIds: string[],
) {
  await tx.taskDish.deleteMany({ where: { taskId } });
  await tx.taskDish.createMany({
    data: dishIds.map((dishId, index) => ({
      dishId,
      sortOrder: index,
      taskId,
    })),
  });
}

export async function listTasks(input: ListTasksInput) {
  const query = input.query?.trim();
  const where: Prisma.TaskWhereInput = {
    storeId: input.storeId,
    ...(input.status ? { status: input.status } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { tag: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [tasks, summaryRows] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ status: "asc" }, { startsAt: "desc" }],
      include: {
        dishes: {
          orderBy: { sortOrder: "asc" },
          include: {
            dish: {
              select: {
                category: true,
                id: true,
                imageUrl: true,
                name: true,
                status: true,
                stockJin: true,
              },
            },
          },
        },
        store: {
          select: {
            code: true,
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.task.groupBy({
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
      if (row.status === "DRAFT") {
        value.draft = row._count._all;
      }
      return value;
    },
    { active: 0, disabled: 0, draft: 0, total: 0 },
  );

  return {
    items: tasks.map((task) => ({
      cutoffTime: task.cutoffTime,
      createdAt: task.createdAt,
      dishCount: task.dishes.length,
      dishes: task.dishes.map((taskDish) => ({
        category: taskDish.dish.category,
        id: taskDish.dish.id,
        imageUrl: taskDish.dish.imageUrl,
        name: taskDish.dish.name,
        sortOrder: taskDish.sortOrder,
        status: taskDish.dish.status,
        stockJin: toNumber(taskDish.dish.stockJin),
      })),
      endsAt: task.endsAt,
      id: task.id,
      name: task.name,
      startsAt: task.startsAt,
      status: task.status,
      store: task.store,
      tag: task.tag,
      updatedAt: task.updatedAt,
    })),
    summary,
  };
}

export async function createTask(input: CreateTaskInput) {
  const operator = await getActiveOperator(input.operatorId);
  const data = normalizeTaskInput(input);

  return prisma.$transaction(async (tx) => {
    await ensureTaskDishes(tx, input.storeId, data.dishIds);

    const task = await tx.task.create({
      data: {
        cutoffTime: data.cutoffTime,
        endsAt: data.endsAt,
        name: data.name,
        startsAt: data.startsAt,
        status: data.status,
        storeId: input.storeId,
        tag: data.tag,
      },
    });

    await replaceTaskDishes(tx, task.id, data.dishIds);

    await tx.adminOperationLog.create({
      data: {
        action: "TASK_CREATED",
        afterValue: taskLogValue(data),
        beforeValue: Prisma.JsonNull,
        operatorId: operator.id,
        resource: "task",
        resourceId: task.id,
        storeId: input.storeId,
      },
    });

    return task;
  });
}

export async function updateTask(input: UpdateTaskInput) {
  const operator = await getActiveOperator(input.operatorId);
  const data = normalizeTaskInput(input);

  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findFirst({
      where: {
        id: input.id,
        storeId: input.storeId,
      },
      include: {
        dishes: {
          orderBy: { sortOrder: "asc" },
          select: { dishId: true },
        },
      },
    });

    if (!task) {
      throw new TaskServiceError("TASK_NOT_FOUND", "任务不存在");
    }

    await ensureTaskDishes(tx, input.storeId, data.dishIds);

    const updated = await tx.task.update({
      where: { id: task.id },
      data: {
        cutoffTime: data.cutoffTime,
        endsAt: data.endsAt,
        name: data.name,
        startsAt: data.startsAt,
        status: data.status,
        tag: data.tag,
      },
    });

    await replaceTaskDishes(tx, task.id, data.dishIds);

    await tx.adminOperationLog.create({
      data: {
        action: "TASK_UPDATED",
        afterValue: taskLogValue(data),
        beforeValue: taskLogValue({
          cutoffTime: task.cutoffTime,
          dishIds: task.dishes.map((dish) => dish.dishId),
          endsAt: task.endsAt,
          name: task.name,
          startsAt: task.startsAt,
          status: task.status,
          tag: task.tag,
        }),
        operatorId: operator.id,
        resource: "task",
        resourceId: task.id,
        storeId: input.storeId,
      },
    });

    return updated;
  });
}

export async function copyTask(input: CopyTaskInput) {
  const operator = await getActiveOperator(input.operatorId);
  const name = input.name.trim();

  if (!name) {
    throw new TaskServiceError("NAME_REQUIRED", "请输入任务名称");
  }

  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findFirst({
      where: {
        id: input.id,
        storeId: input.storeId,
      },
      include: {
        dishes: {
          orderBy: { sortOrder: "asc" },
          select: { dishId: true },
        },
      },
    });

    if (!task) {
      throw new TaskServiceError("TASK_NOT_FOUND", "任务不存在");
    }

    const copied = await tx.task.create({
      data: {
        cutoffTime: task.cutoffTime,
        endsAt: task.endsAt,
        name,
        startsAt: task.startsAt,
        status: "DRAFT",
        storeId: input.storeId,
        tag: task.tag,
      },
    });

    await replaceTaskDishes(
      tx,
      copied.id,
      task.dishes.map((dish) => dish.dishId),
    );

    await tx.adminOperationLog.create({
      data: {
        action: "TASK_COPIED",
        afterValue: taskLogValue({
          cutoffTime: copied.cutoffTime,
          dishIds: task.dishes.map((dish) => dish.dishId),
          endsAt: copied.endsAt,
          name: copied.name,
          startsAt: copied.startsAt,
          status: copied.status,
          tag: copied.tag,
        }),
        beforeValue: { sourceTaskId: task.id },
        operatorId: operator.id,
        resource: "task",
        resourceId: copied.id,
        storeId: input.storeId,
      },
    });

    return copied;
  });
}

export async function getActiveTaskForStore(input: GetActiveTaskForStoreInput) {
  const at = input.at ?? new Date();
  const task = await prisma.task.findFirst({
    where: {
      endsAt: { gte: at },
      startsAt: { lte: at },
      status: "ACTIVE",
      storeId: input.storeId,
    },
    orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
    include: {
      dishes: {
        orderBy: { sortOrder: "asc" },
        include: {
          dish: true,
        },
      },
    },
  });

  if (!task) {
    return null;
  }

  return {
    cutoffTime: task.cutoffTime,
    dishes: task.dishes
      .filter(
        (taskDish) =>
          taskDish.dish.status === "ON_SALE" && taskDish.dish.deletedAt === null,
      )
      .map((taskDish) => ({
        category: taskDish.dish.category,
        description: taskDish.dish.description,
        id: taskDish.dish.id,
        imageUrl: taskDish.dish.imageUrl,
        name: taskDish.dish.name,
        sortOrder: taskDish.sortOrder,
        stepJin: toNumber(taskDish.dish.stepJin),
        stockJin: toNumber(taskDish.dish.stockJin),
      })),
    endsAt: task.endsAt,
    id: task.id,
    name: task.name,
    startsAt: task.startsAt,
    tag: task.tag,
  };
}
