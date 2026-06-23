import { afterEach, describe, expect, it } from "vitest";

import {
  Prisma,
  prisma,
  type AdminUser,
  type Dish,
  type Store,
} from "./index";
import * as dishOperations from "./dishes";

type Fixture = {
  admin: AdminUser;
  dish: Dish;
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
    await prisma.inventoryLog.deleteMany({
      where: { storeId: { in: storeIds } },
    });
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
  const storeId = `dish-test-store-${suffix}`;
  const adminId = `dish-test-admin-${suffix}`;
  createdStoreIds.add(storeId);
  createdAdminIds.add(adminId);

  const store = await prisma.store.create({
    data: {
      id: storeId,
      code: `dish-test-store-${suffix}`,
      contactName: "菜品店长",
      contactPhone: "13900004444",
      name: "菜品测试加盟店",
      status: "ACTIVE",
      type: "FRANCHISE",
    },
  });

  const admin = await prisma.adminUser.create({
    data: {
      id: adminId,
      name: "菜品管理员",
      passwordHash: "not-used",
      status: "ACTIVE",
      username: `dish-admin-${suffix}`,
    },
  });

  const dish = await prisma.dish.create({
    data: {
      category: "LEAFY",
      description: "测试叶菜",
      id: `dish-test-spinach-${suffix}`,
      name: "测试菠菜",
      sortOrder: 1,
      status: "ON_SALE",
      stepJin: new Prisma.Decimal("0.50"),
      stockJin: new Prisma.Decimal("20.00"),
      storeId: store.id,
    },
  });

  return { admin, dish, store };
}

describe("dish management", () => {
  it("lists dishes scoped to one store with numeric stock summary", async () => {
    const fixture = await createFixture();
    const otherFixture = await createFixture();

    const result = await (
      dishOperations as typeof dishOperations & {
        listDishes: (input: { storeId: string }) => Promise<{
          items: Array<{
            id: string;
            status: "ON_SALE" | "OFF_SALE";
            stepJin: number;
            stockJin: number;
          }>;
          summary: {
            lowStock: number;
            offSale: number;
            onSale: number;
            stock: number;
            total: number;
          };
        }>;
      }
    ).listDishes({ storeId: fixture.store.id });

    expect(result.summary).toEqual({
      lowStock: 0,
      offSale: 0,
      onSale: 1,
      stock: 20,
      total: 1,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: fixture.dish.id,
      status: "ON_SALE",
      stepJin: 0.5,
      stockJin: 20,
    });
    expect(result.items[0]?.id).not.toBe(otherFixture.dish.id);
  });

  it("gets a dish detail with recent inventory logs", async () => {
    const fixture = await createFixture();

    await prisma.inventoryLog.create({
      data: {
        afterJin: new Prisma.Decimal("18.50"),
        beforeJin: fixture.dish.stockJin,
        changeJin: new Prisma.Decimal("-1.50"),
        dishId: fixture.dish.id,
        operatorId: fixture.admin.id,
        reason: "预定扣减",
        storeId: fixture.store.id,
      },
    });

    const detail = await (
      dishOperations as typeof dishOperations & {
        getDish: (input: {
          dishId: string;
          storeId: string;
        }) => Promise<{
          id: string;
          inventoryLogs: Array<{
            afterJin: number;
            beforeJin: number;
            changeJin: number;
            operator: { id: string; name: string } | null;
            reason: string;
          }>;
          name: string;
          stepJin: number;
          stockJin: number;
          store: { id: string; name: string };
        }>;
      }
    ).getDish({
      dishId: fixture.dish.id,
      storeId: fixture.store.id,
    });

    expect(detail).toMatchObject({
      id: fixture.dish.id,
      name: fixture.dish.name,
      stepJin: 0.5,
      stockJin: 20,
      store: {
        id: fixture.store.id,
        name: fixture.store.name,
      },
    });
    expect(detail.inventoryLogs).toEqual([
      expect.objectContaining({
        afterJin: 18.5,
        beforeJin: 20,
        changeJin: -1.5,
        operator: expect.objectContaining({
          id: fixture.admin.id,
          name: fixture.admin.name,
        }),
        reason: "预定扣减",
      }),
    ]);
  });

  it("creates updates and adjusts inventory with operation logs", async () => {
    const fixture = await createFixture();

    const created = await (
      dishOperations as typeof dishOperations & {
        createDish: (input: {
          category: "FRUIT";
          description: string;
          imageKey: string;
          imageUrl: string;
          name: string;
          operatorId: string;
          sortOrder: number;
          status: "ON_SALE";
          stepJin: number;
          stockJin: number;
          storeId: string;
        }) => Promise<Dish>;
        updateDish: (input: {
          category: "ACTIVITY";
          description: string;
          id: string;
          imageKey: string;
          imageUrl: string;
          name: string;
          operatorId: string;
          sortOrder: number;
          status: "ON_SALE";
          stepJin: number;
          stockJin: number;
          storeId: string;
        }) => Promise<Dish>;
        adjustDishInventory: (input: {
          changeJin: number;
          dishId: string;
          operatorId: string;
          reason: string;
          storeId: string;
        }) => Promise<Dish>;
      }
    ).createDish({
      category: "FRUIT",
      description: "今日到店",
      imageKey: "dishes/tomato.png",
      imageUrl: "http://localhost:9000/hentor-assets/dishes/tomato.png",
      name: "测试番茄",
      operatorId: fixture.admin.id,
      sortOrder: 2,
      status: "ON_SALE",
      stepJin: 1,
      stockJin: 0,
      storeId: fixture.store.id,
    });

    expect(created).toMatchObject({
      category: "FRUIT",
      name: "测试番茄",
      status: "OFF_SALE",
    });
    expect(Number(created.stockJin)).toBe(0);

    const updated = await (
      dishOperations as typeof dishOperations & {
        updateDish: (input: {
          category: "ACTIVITY";
          description: string;
          id: string;
          imageKey: string;
          imageUrl: string;
          name: string;
          operatorId: string;
          sortOrder: number;
          status: "ON_SALE";
          stepJin: number;
          stockJin: number;
          storeId: string;
        }) => Promise<Dish>;
        adjustDishInventory: (input: {
          changeJin: number;
          dishId: string;
          operatorId: string;
          reason: string;
          storeId: string;
        }) => Promise<Dish>;
      }
    ).updateDish({
      category: "ACTIVITY",
      description: "活动菜",
      id: created.id,
      imageKey: "dishes/tomato-updated.png",
      imageUrl: "http://localhost:9000/hentor-assets/dishes/tomato-updated.png",
      name: "测试番茄活动款",
      operatorId: fixture.admin.id,
      sortOrder: 3,
      status: "ON_SALE",
      stepJin: 0.5,
      stockJin: 10,
      storeId: fixture.store.id,
    });

    expect(updated).toMatchObject({
      category: "ACTIVITY",
      imageKey: "dishes/tomato-updated.png",
      name: "测试番茄活动款",
      status: "ON_SALE",
    });
    expect(Number(updated.stepJin)).toBe(0.5);
    expect(Number(updated.stockJin)).toBe(10);

    const adjusted = await dishOperations.adjustDishInventory({
      changeJin: -10,
      dishId: created.id,
      operatorId: fixture.admin.id,
      reason: "售罄下架",
      storeId: fixture.store.id,
    });

    expect(adjusted.status).toBe("OFF_SALE");
    expect(Number(adjusted.stockJin)).toBe(0);

    await expect(
      prisma.inventoryLog.findFirst({
        where: {
          dishId: created.id,
          reason: "售罄下架",
          storeId: fixture.store.id,
        },
      }),
    ).resolves.toMatchObject({
      afterJin: new Prisma.Decimal("0"),
      beforeJin: new Prisma.Decimal("10"),
      changeJin: new Prisma.Decimal("-10"),
      operatorId: fixture.admin.id,
    });

    await expect(
      prisma.adminOperationLog.count({
        where: {
          action: { in: ["DISH_CREATED", "DISH_UPDATED"] },
          operatorId: fixture.admin.id,
          resource: "dish",
          storeId: fixture.store.id,
        },
      }),
    ).resolves.toBe(2);
  });
});
