import { afterEach, describe, expect, it } from "vitest";

import {
  Prisma,
  prisma,
  type Address,
  type AdminUser,
  type Dish,
  type Store,
  type User,
  type UserPackage,
} from "./index";
import { shipOrder } from "./orders";
import { freezeUserPackage, unfreezeUserPackage } from "./packages";
import { ReservationServiceError, submitReservation } from "./reservations";

type Fixture = {
  address: Address;
  admin: AdminUser;
  dishes: {
    spinach: Dish;
    cucumber: Dish;
  };
  store: Store;
  user: User;
  userPackage: UserPackage;
};

const createdStoreIds = new Set<string>();
const createdUserIds = new Set<string>();
const createdAdminIds = new Set<string>();

async function cleanup() {
  const storeIds = [...createdStoreIds];
  const userIds = [...createdUserIds];
  const adminIds = [...createdAdminIds];

  if (storeIds.length) {
    await prisma.adminOperationLog.deleteMany({
      where: { storeId: { in: storeIds } },
    });
    await prisma.orderChangeLog.deleteMany({
      where: { order: { storeId: { in: storeIds } } },
    });
    await prisma.orderItem.deleteMany({
      where: { order: { storeId: { in: storeIds } } },
    });
    await prisma.order.deleteMany({ where: { storeId: { in: storeIds } } });
    await prisma.packageOperationLog.deleteMany({
      where: { userPackage: { storeId: { in: storeIds } } },
    });
    await prisma.userPackage.deleteMany({ where: { storeId: { in: storeIds } } });
    await prisma.address.deleteMany({ where: { storeId: { in: storeIds } } });
    await prisma.memberStoreBinding.deleteMany({
      where: { storeId: { in: storeIds } },
    });
    await prisma.dish.deleteMany({ where: { storeId: { in: storeIds } } });
    await prisma.packageTemplate.deleteMany({
      where: { storeId: { in: storeIds } },
    });
    await prisma.store.deleteMany({ where: { id: { in: storeIds } } });
  }

  if (userIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  if (adminIds.length) {
    await prisma.adminUser.deleteMany({ where: { id: { in: adminIds } } });
  }

  createdStoreIds.clear();
  createdUserIds.clear();
  createdAdminIds.clear();
}

afterEach(async () => {
  await cleanup();
});

async function createFixture(): Promise<Fixture> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const storeId = `test-store-${suffix}`;
  const userId = `test-user-${suffix}`;
  const adminId = `test-admin-${suffix}`;
  createdStoreIds.add(storeId);
  createdUserIds.add(userId);
  createdAdminIds.add(adminId);

  const store = await prisma.store.create({
    data: {
      id: storeId,
      code: `test-store-${suffix}`,
      name: "测试加盟店",
      type: "FRANCHISE",
      status: "ACTIVE",
      contactName: "测试店长",
      contactPhone: "13900000000",
      cutoffTime: "18:00",
    },
  });

  const user = await prisma.user.create({
    data: {
      id: userId,
      openid: `openid-${suffix}`,
      phone: "13800001111",
      nickname: "测试会员",
      defaultStoreId: store.id,
    },
  });

  const admin = await prisma.adminUser.create({
    data: {
      id: adminId,
      username: `admin-${suffix}`,
      name: "测试管理员",
      passwordHash: "not-used-in-service-test",
      status: "ACTIVE",
    },
  });

  await prisma.memberStoreBinding.create({
    data: {
      userId: user.id,
      storeId: store.id,
      isDefault: true,
      status: "ACTIVE",
      source: "test",
    },
  });

  const address = await prisma.address.create({
    data: {
      id: `test-address-${suffix}`,
      userId: user.id,
      storeId: store.id,
      receiverName: "测试会员",
      receiverPhone: "13800001111",
      detail: "测试小区 1 栋 101",
      isDefault: true,
    },
  });

  const packageTemplate = await prisma.packageTemplate.create({
    data: {
      id: `test-template-${suffix}`,
      storeId: store.id,
      name: "8斤测试套餐",
      totalTimes: 8,
      weightLimitJin: new Prisma.Decimal("8.00"),
      validDays: 90,
    },
  });

  const userPackage = await prisma.userPackage.create({
    data: {
      id: `test-user-package-${suffix}`,
      userId: user.id,
      storeId: store.id,
      templateId: packageTemplate.id,
      nameSnapshot: packageTemplate.name,
      totalTimes: 8,
      usedTimes: 0,
      weightLimitJin: new Prisma.Decimal("8.00"),
      status: "ACTIVE",
      expiresAt: new Date("2099-12-31T15:59:59.000Z"),
    },
  });

  const [spinach, cucumber] = await Promise.all([
    prisma.dish.create({
      data: {
        id: `test-dish-spinach-${suffix}`,
        storeId: store.id,
        name: "菠菜",
        category: "LEAFY",
        stepJin: new Prisma.Decimal("0.50"),
        stockJin: new Prisma.Decimal("20.00"),
      },
    }),
    prisma.dish.create({
      data: {
        id: `test-dish-cucumber-${suffix}`,
        storeId: store.id,
        name: "黄瓜",
        category: "ACTIVITY",
        stepJin: new Prisma.Decimal("0.50"),
        stockJin: new Prisma.Decimal("20.00"),
      },
    }),
  ]);

  return {
    address,
    admin,
    dishes: { spinach, cucumber },
    store,
    user,
    userPackage,
  };
}

describe("submitReservation", () => {
  it("rejects reservations when the member package is frozen", async () => {
    const fixture = await createFixture();
    await prisma.userPackage.update({
      where: { id: fixture.userPackage.id },
      data: {
        status: "FROZEN",
        frozenReason: "后台冻结测试",
      },
    });

    await expect(
      submitReservation({
        addressId: fixture.address.id,
        items: [{ dishId: fixture.dishes.spinach.id, weightJin: 1 }],
        storeId: fixture.store.id,
        userId: fixture.user.id,
        userPackageId: fixture.userPackage.id,
      }),
    ).rejects.toMatchObject({
      code: "PACKAGE_UNAVAILABLE",
      message: "套餐已冻结，暂不能预订",
    } satisfies Partial<ReservationServiceError>);

    await expect(
      prisma.order.count({ where: { storeId: fixture.store.id } }),
    ).resolves.toBe(0);
  });

  it("rejects reservations that exceed the package weight limit", async () => {
    const fixture = await createFixture();

    await expect(
      submitReservation({
        addressId: fixture.address.id,
        items: [
          { dishId: fixture.dishes.spinach.id, weightJin: 5 },
          { dishId: fixture.dishes.cucumber.id, weightJin: 4 },
        ],
        storeId: fixture.store.id,
        userId: fixture.user.id,
        userPackageId: fixture.userPackage.id,
      }),
    ).rejects.toMatchObject({
      code: "WEIGHT_LIMIT_EXCEEDED",
      message: "已超过套餐本次可预订重量",
    } satisfies Partial<ReservationServiceError>);
  });

  it("updates an existing pending reservation without consuming another package use", async () => {
    const fixture = await createFixture();

    const created = await submitReservation({
      addressId: fixture.address.id,
      items: [
        { dishId: fixture.dishes.spinach.id, weightJin: 1 },
        { dishId: fixture.dishes.cucumber.id, weightJin: 1.5 },
      ],
      storeId: fixture.store.id,
      userId: fixture.user.id,
      userPackageId: fixture.userPackage.id,
      userVisibleRemark: "不要香菜",
    });

    expect(created.totalWeightJin).toBe(2.5);
    await expect(
      prisma.userPackage.findUniqueOrThrow({
        where: { id: fixture.userPackage.id },
      }),
    ).resolves.toMatchObject({ usedTimes: 1 });

    const updated = await submitReservation({
      addressId: fixture.address.id,
      items: [{ dishId: fixture.dishes.spinach.id, weightJin: 2 }],
      orderId: created.id,
      storeId: fixture.store.id,
      userId: fixture.user.id,
      userPackageId: fixture.userPackage.id,
      userVisibleRemark: "改成只要菠菜",
    });

    expect(updated.id).toBe(created.id);
    expect(updated.totalWeightJin).toBe(2);
    expect(updated.items).toEqual([
      {
        dishId: fixture.dishes.spinach.id,
        dishNameSnapshot: "菠菜",
        weightJin: 2,
      },
    ]);
    await expect(
      prisma.userPackage.findUniqueOrThrow({
        where: { id: fixture.userPackage.id },
      }),
    ).resolves.toMatchObject({ usedTimes: 1 });
    await expect(
      prisma.orderChangeLog.count({ where: { orderId: created.id } }),
    ).resolves.toBe(1);
  });
});

describe("shipOrder", () => {
  it("marks a pending reservation as shipped and records an admin operation log", async () => {
    const fixture = await createFixture();
    const order = await submitReservation({
      addressId: fixture.address.id,
      items: [{ dishId: fixture.dishes.spinach.id, weightJin: 1 }],
      storeId: fixture.store.id,
      userId: fixture.user.id,
      userPackageId: fixture.userPackage.id,
    });

    const shipped = await shipOrder({
      logisticsNo: "SF123456789",
      operatorId: fixture.admin.id,
      orderId: order.id,
      storeId: fixture.store.id,
    });

    expect(shipped.status).toBe("SHIPPED");
    expect(shipped.logisticsNo).toBe("SF123456789");
    expect(shipped.shippedAt).toBeInstanceOf(Date);
    await expect(
      prisma.adminOperationLog.count({
        where: {
          action: "ORDER_SHIPPED",
          operatorId: fixture.admin.id,
          resourceId: order.id,
        },
      }),
    ).resolves.toBe(1);
  });
});

describe("user package operations", () => {
  it("freezes and unfreezes a user package with operation logs", async () => {
    const fixture = await createFixture();

    const frozen = await freezeUserPackage({
      operatorId: fixture.admin.id,
      reason: "用户暂停配送",
      storeId: fixture.store.id,
      userPackageId: fixture.userPackage.id,
    });

    expect(frozen.status).toBe("FROZEN");
    expect(frozen.frozenReason).toBe("用户暂停配送");
    await expect(
      prisma.packageOperationLog.count({
        where: {
          operatorId: fixture.admin.id,
          reason: "用户暂停配送",
          userPackageId: fixture.userPackage.id,
        },
      }),
    ).resolves.toBe(1);

    const active = await unfreezeUserPackage({
      operatorId: fixture.admin.id,
      reason: "用户恢复配送",
      storeId: fixture.store.id,
      userPackageId: fixture.userPackage.id,
    });

    expect(active.status).toBe("ACTIVE");
    expect(active.frozenReason).toBeNull();
    await expect(
      prisma.packageOperationLog.count({
        where: {
          operatorId: fixture.admin.id,
          reason: "用户恢复配送",
          userPackageId: fixture.userPackage.id,
        },
      }),
    ).resolves.toBe(1);
  });
});
