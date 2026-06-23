import { afterEach, describe, expect, it } from "vitest";

import {
  Prisma,
  prisma,
  type AdminUser,
  type Dish,
  type Store,
  type Task,
} from "./index";
import * as taskOperations from "./tasks";

type Fixture = {
  admin: AdminUser;
  dishes: {
    cucumber: Dish;
    spinach: Dish;
  };
  store: Store;
};

const createdStoreIds = new Set<string>();
const createdAdminIds = new Set<string>();

async function cleanup() {
  const storeIds = [...createdStoreIds];
  const adminIds = [...createdAdminIds];

  if (storeIds.length) {
    await prisma.adminOperationLog.deleteMany({
      where: { storeId: { in: storeIds } },
    });
    await prisma.taskDish.deleteMany({
      where: { task: { storeId: { in: storeIds } } },
    });
    await prisma.task.deleteMany({ where: { storeId: { in: storeIds } } });
    await prisma.dish.deleteMany({ where: { storeId: { in: storeIds } } });
    await prisma.store.deleteMany({ where: { id: { in: storeIds } } });
  }

  if (adminIds.length) {
    await prisma.adminUser.deleteMany({ where: { id: { in: adminIds } } });
  }

  createdStoreIds.clear();
  createdAdminIds.clear();
}

afterEach(async () => {
  await cleanup();
});

async function createFixture(): Promise<Fixture> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const storeId = `task-test-store-${suffix}`;
  const adminId = `task-test-admin-${suffix}`;
  createdStoreIds.add(storeId);
  createdAdminIds.add(adminId);

  const store = await prisma.store.create({
    data: {
      id: storeId,
      code: `task-test-store-${suffix}`,
      contactName: "任务店长",
      contactPhone: "13900005555",
      name: "任务测试加盟店",
      status: "ACTIVE",
      type: "FRANCHISE",
    },
  });

  const admin = await prisma.adminUser.create({
    data: {
      id: adminId,
      name: "任务管理员",
      passwordHash: "not-used",
      status: "ACTIVE",
      username: `task-admin-${suffix}`,
    },
  });

  const [spinach, cucumber] = await Promise.all([
    prisma.dish.create({
      data: {
        category: "LEAFY",
        id: `task-dish-spinach-${suffix}`,
        name: "任务菠菜",
        sortOrder: 1,
        status: "ON_SALE",
        stepJin: new Prisma.Decimal("0.50"),
        stockJin: new Prisma.Decimal("30.00"),
        storeId: store.id,
      },
    }),
    prisma.dish.create({
      data: {
        category: "ACTIVITY",
        id: `task-dish-cucumber-${suffix}`,
        name: "任务黄瓜",
        sortOrder: 2,
        status: "ON_SALE",
        stepJin: new Prisma.Decimal("0.50"),
        stockJin: new Prisma.Decimal("12.00"),
        storeId: store.id,
      },
    }),
  ]);

  return { admin, dishes: { cucumber, spinach }, store };
}

describe("task management", () => {
  it("creates and updates store-scoped tasks with associated dishes", async () => {
    const fixture = await createFixture();
    const otherFixture = await createFixture();

    const created = await (
      taskOperations as typeof taskOperations & {
        createTask: (input: {
          cutoffTime: string;
          dishIds: string[];
          endsAt: Date;
          name: string;
          operatorId: string;
          startsAt: Date;
          status: "DRAFT";
          storeId: string;
          tag: string;
        }) => Promise<Task>;
      }
    ).createTask({
      cutoffTime: "18:00",
      dishIds: [fixture.dishes.spinach.id, fixture.dishes.cucumber.id],
      endsAt: new Date("2099-01-08T15:59:59.000Z"),
      name: "本周预订任务",
      operatorId: fixture.admin.id,
      startsAt: new Date("2099-01-01T00:00:00.000Z"),
      status: "DRAFT",
      storeId: fixture.store.id,
      tag: "本周",
    });

    const listResult = await (
      taskOperations as typeof taskOperations & {
        listTasks: (input: { storeId: string }) => Promise<{
          items: Array<{
            dishCount: number;
            dishes: Array<{ id: string; name: string; sortOrder: number }>;
            id: string;
            status: "DRAFT" | "ACTIVE" | "DISABLED";
          }>;
          summary: { active: number; disabled: number; draft: number; total: number };
        }>;
      }
    ).listTasks({ storeId: fixture.store.id });

    expect(listResult.summary).toEqual({
      active: 0,
      disabled: 0,
      draft: 1,
      total: 1,
    });
    expect(listResult.items).toHaveLength(1);
    expect(listResult.items[0]).toMatchObject({
      dishCount: 2,
      id: created.id,
      status: "DRAFT",
    });
    expect(listResult.items[0]?.dishes.map((dish) => dish.id)).toEqual([
      fixture.dishes.spinach.id,
      fixture.dishes.cucumber.id,
    ]);

    const otherList = await taskOperations.listTasks({
      storeId: otherFixture.store.id,
    });
    expect(otherList.items).toHaveLength(0);

    const updated = await taskOperations.updateTask({
      cutoffTime: "17:30",
      dishIds: [fixture.dishes.cucumber.id],
      endsAt: new Date("2099-01-09T15:59:59.000Z"),
      id: created.id,
      name: "本周预订任务-调整",
      operatorId: fixture.admin.id,
      startsAt: new Date("2099-01-02T00:00:00.000Z"),
      status: "DISABLED",
      storeId: fixture.store.id,
      tag: "调整",
    });

    expect(updated).toMatchObject({
      cutoffTime: "17:30",
      id: created.id,
      name: "本周预订任务-调整",
      status: "DISABLED",
    });

    await expect(
      prisma.taskDish.findMany({
        where: { taskId: created.id },
        orderBy: { sortOrder: "asc" },
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        dishId: fixture.dishes.cucumber.id,
        sortOrder: 0,
      }),
    ]);

    await expect(
      prisma.adminOperationLog.count({
        where: {
          action: { in: ["TASK_CREATED", "TASK_UPDATED"] },
          operatorId: fixture.admin.id,
          resource: "task",
          storeId: fixture.store.id,
        },
      }),
    ).resolves.toBe(2);
  });

  it("rejects updates once a task is active", async () => {
    const fixture = await createFixture();

    const task = await taskOperations.createTask({
      cutoffTime: "18:00",
      dishIds: [fixture.dishes.spinach.id],
      endsAt: new Date("2099-01-08T15:59:59.000Z"),
      name: "已生效任务",
      operatorId: fixture.admin.id,
      startsAt: new Date("2099-01-01T00:00:00.000Z"),
      status: "ACTIVE",
      storeId: fixture.store.id,
      tag: "生效",
    });

    await expect(
      taskOperations.updateTask({
        cutoffTime: "17:30",
        dishIds: [fixture.dishes.cucumber.id],
        endsAt: new Date("2099-01-09T15:59:59.000Z"),
        id: task.id,
        name: "已生效任务-调整",
        operatorId: fixture.admin.id,
        startsAt: new Date("2099-01-02T00:00:00.000Z"),
        status: "DISABLED",
        storeId: fixture.store.id,
        tag: "调整",
      }),
    ).rejects.toMatchObject({
      code: "TASK_ALREADY_ACTIVE",
      message: "已生效任务不能再修改",
    } satisfies Partial<taskOperations.TaskServiceError>);

    await expect(
      prisma.task.findUniqueOrThrow({ where: { id: task.id } }),
    ).resolves.toMatchObject({
      cutoffTime: "18:00",
      name: "已生效任务",
      status: "ACTIVE",
    });
  });

  it("gets a task detail with ordered associated dishes", async () => {
    const fixture = await createFixture();

    const task = await taskOperations.createTask({
      cutoffTime: "18:00",
      dishIds: [fixture.dishes.spinach.id, fixture.dishes.cucumber.id],
      endsAt: new Date("2099-01-08T15:59:59.000Z"),
      name: "详情任务",
      operatorId: fixture.admin.id,
      startsAt: new Date("2099-01-01T00:00:00.000Z"),
      status: "ACTIVE",
      storeId: fixture.store.id,
      tag: "详情",
    });

    const detail = await (
      taskOperations as typeof taskOperations & {
        getTask: (input: {
          storeId: string;
          taskId: string;
        }) => Promise<{
          dishCount: number;
          dishes: Array<{
            id: string;
            name: string;
            sortOrder: number;
            stepJin: number;
            stockJin: number;
          }>;
          id: string;
          store: { id: string; name: string };
        }>;
      }
    ).getTask({
      storeId: fixture.store.id,
      taskId: task.id,
    });

    expect(detail).toMatchObject({
      dishCount: 2,
      id: task.id,
      store: {
        id: fixture.store.id,
        name: fixture.store.name,
      },
    });
    expect(detail.dishes).toEqual([
      expect.objectContaining({
        id: fixture.dishes.spinach.id,
        name: fixture.dishes.spinach.name,
        sortOrder: 0,
        stepJin: 0.5,
        stockJin: 30,
      }),
      expect.objectContaining({
        id: fixture.dishes.cucumber.id,
        name: fixture.dishes.cucumber.name,
        sortOrder: 1,
        stepJin: 0.5,
        stockJin: 12,
      }),
    ]);
  });

  it("rejects invalid cutoff times without creating a task", async () => {
    const fixture = await createFixture();

    for (const cutoffTime of ["24:00", "24:10", "99:99", "8:00"]) {
      await expect(
        taskOperations.createTask({
          cutoffTime,
          dishIds: [fixture.dishes.spinach.id],
          endsAt: new Date("2099-01-08T15:59:59.000Z"),
          name: `非法截单时间 ${cutoffTime}`,
          operatorId: fixture.admin.id,
          startsAt: new Date("2099-01-01T00:00:00.000Z"),
          status: "ACTIVE",
          storeId: fixture.store.id,
          tag: "校验",
        }),
      ).rejects.toMatchObject({
        code: "CUTOFF_TIME_INVALID",
        message: "截单时间不正确",
      } satisfies Partial<taskOperations.TaskServiceError>);
    }

    await expect(
      prisma.task.count({ where: { storeId: fixture.store.id } }),
    ).resolves.toBe(0);
  });

  it("copies a task and resolves the active task for mini app home", async () => {
    const fixture = await createFixture();

    const task = await taskOperations.createTask({
      cutoffTime: "18:00",
      dishIds: [fixture.dishes.spinach.id],
      endsAt: new Date("2099-01-08T15:59:59.000Z"),
      name: "可预订任务",
      operatorId: fixture.admin.id,
      startsAt: new Date("2099-01-01T00:00:00.000Z"),
      status: "ACTIVE",
      storeId: fixture.store.id,
      tag: "新鲜",
    });

    const copied = await taskOperations.copyTask({
      cutoffTime: "17:30",
      dishIds: [fixture.dishes.cucumber.id],
      endsAt: new Date("2099-01-09T15:59:59.000Z"),
      id: task.id,
      name: "复制任务次日",
      operatorId: fixture.admin.id,
      startsAt: new Date("2099-01-09T00:00:00.000Z"),
      storeId: fixture.store.id,
      tag: "次日",
    });

    expect(copied).toMatchObject({
      cutoffTime: "17:30",
      name: "复制任务次日",
      status: "DRAFT",
      storeId: fixture.store.id,
      tag: "次日",
    });
    await expect(
      prisma.taskDish.findMany({
        orderBy: { sortOrder: "asc" },
        where: { taskId: copied.id },
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        dishId: fixture.dishes.cucumber.id,
        sortOrder: 0,
      }),
    ]);

    const activeTask = await taskOperations.getActiveTaskForStore({
      at: new Date("2099-01-03T08:00:00.000Z"),
      storeId: fixture.store.id,
    });

    expect(activeTask).toMatchObject({
      cutoffTime: "18:00",
      id: task.id,
      tag: "新鲜",
    });
    expect(activeTask?.dishes).toEqual([
      expect.objectContaining({
        id: fixture.dishes.spinach.id,
        name: "任务菠菜",
        stockJin: 30,
      }),
    ]);

    await expect(
      taskOperations.getActiveTaskForStore({
        at: new Date("2099-01-12T08:00:00.000Z"),
        storeId: fixture.store.id,
      }),
    ).resolves.toBeNull();
  });

  it("filters off-sale task dishes when resolving the active mini app task", async () => {
    const fixture = await createFixture();

    await taskOperations.createTask({
      cutoffTime: "18:00",
      dishIds: [fixture.dishes.spinach.id, fixture.dishes.cucumber.id],
      endsAt: new Date("2099-01-08T15:59:59.000Z"),
      name: "实时上下架任务",
      operatorId: fixture.admin.id,
      startsAt: new Date("2099-01-01T00:00:00.000Z"),
      status: "ACTIVE",
      storeId: fixture.store.id,
      tag: "实时",
    });
    await prisma.dish.update({
      where: { id: fixture.dishes.cucumber.id },
      data: { status: "OFF_SALE" },
    });

    const activeTask = await taskOperations.getActiveTaskForStore({
      at: new Date("2099-01-03T08:00:00.000Z"),
      storeId: fixture.store.id,
    });

    expect(activeTask?.dishes.map((dish) => dish.id)).toEqual([
      fixture.dishes.spinach.id,
    ]);
  });
});
