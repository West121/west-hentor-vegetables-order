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
import * as orderOperations from "./orders";
import * as packageOperations from "./packages";
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
    await prisma.taskDish.deleteMany({
      where: { task: { storeId: { in: storeIds } } },
    });
    await prisma.task.deleteMany({ where: { storeId: { in: storeIds } } });
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
      cutoffTime: "24:00",
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

  it("rejects new reservations that skip an older usable package", async () => {
    const fixture = await createFixture();
    const newerPackage = await prisma.userPackage.create({
      data: {
        expiresAt: new Date("2099-12-31T15:59:59.000Z"),
        id: `${fixture.userPackage.id}-newer`,
        nameSnapshot: fixture.userPackage.nameSnapshot,
        status: "ACTIVE",
        storeId: fixture.store.id,
        templateId: fixture.userPackage.templateId,
        totalTimes: 8,
        usedTimes: 0,
        userId: fixture.user.id,
        weightLimitJin: new Prisma.Decimal("8.00"),
      },
    });

    await expect(
      submitReservation({
        addressId: fixture.address.id,
        items: [{ dishId: fixture.dishes.spinach.id, weightJin: 1 }],
        storeId: fixture.store.id,
        userId: fixture.user.id,
        userPackageId: newerPackage.id,
      }),
    ).rejects.toMatchObject({
      code: "PACKAGE_NOT_CURRENT",
      message: "请刷新后使用最早可用套餐预订",
    } satisfies Partial<ReservationServiceError>);

    await expect(
      prisma.order.count({ where: { storeId: fixture.store.id } }),
    ).resolves.toBe(0);
  });

  it("rejects reservations when the member is disabled for the current store", async () => {
    const fixture = await createFixture();
    await prisma.user.update({
      where: { id: fixture.user.id },
      data: { disabledReason: "欠费暂停配送" },
    });
    await prisma.memberStoreBinding.updateMany({
      where: {
        storeId: fixture.store.id,
        userId: fixture.user.id,
      },
      data: { status: "DISABLED" },
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
      code: "MEMBER_DISABLED",
      message: "会员已停用：欠费暂停配送",
    } satisfies Partial<ReservationServiceError>);

    await expect(
      prisma.order.count({ where: { storeId: fixture.store.id } }),
    ).resolves.toBe(0);
  });

  it("rejects reservations when the member account is disabled even if the store binding is active", async () => {
    const fixture = await createFixture();
    await prisma.user.update({
      where: { id: fixture.user.id },
      data: {
        disabledReason: "用户主动注销",
        status: "DISABLED",
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
      code: "MEMBER_DISABLED",
      message: "会员已停用：用户主动注销",
    } satisfies Partial<ReservationServiceError>);

    await expect(
      prisma.order.count({ where: { storeId: fixture.store.id } }),
    ).resolves.toBe(0);
  });

  it("rejects reservations when the selected address is outside delivery range", async () => {
    const fixture = await createFixture();
    await prisma.store.update({
      where: { id: fixture.store.id },
      data: {
        deliveryCities: ["南京市"],
        deliveryProvinces: ["江苏省"],
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
      code: "ADDRESS_OUT_OF_DELIVERY_RANGE",
      message: "当前门店仅配送：江苏省",
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

  it("rejects dishes outside the active task while allowing task dishes", async () => {
    const fixture = await createFixture();
    await prisma.task.create({
      data: {
        cutoffTime: "18:00",
        dishes: {
          create: {
            dishId: fixture.dishes.spinach.id,
            sortOrder: 0,
          },
        },
        endsAt: new Date("2026-06-19T23:59:59+08:00"),
        name: "今日任务",
        startsAt: new Date("2026-06-18T00:00:00+08:00"),
        status: "ACTIVE",
        storeId: fixture.store.id,
      },
    });

    await expect(
      submitReservation({
        addressId: fixture.address.id,
        items: [{ dishId: fixture.dishes.cucumber.id, weightJin: 1 }],
        now: new Date("2026-06-18T08:00:00+08:00"),
        storeId: fixture.store.id,
        userId: fixture.user.id,
        userPackageId: fixture.userPackage.id,
      }),
    ).rejects.toMatchObject({
      code: "DISH_NOT_IN_ACTIVE_TASK",
      message: "菜品不在今日可预订任务中",
    } satisfies Partial<ReservationServiceError>);

    await expect(
      submitReservation({
        addressId: fixture.address.id,
        items: [{ dishId: fixture.dishes.spinach.id, weightJin: 1 }],
        now: new Date("2026-06-18T08:30:00+08:00"),
        storeId: fixture.store.id,
        userId: fixture.user.id,
        userPackageId: fixture.userPackage.id,
      }),
    ).resolves.toMatchObject({
      totalWeightJin: 1,
    });
  });

  it("rejects off-sale dishes even when they belong to the active task", async () => {
    const fixture = await createFixture();
    await prisma.task.create({
      data: {
        cutoffTime: "18:00",
        dishes: {
          create: {
            dishId: fixture.dishes.spinach.id,
            sortOrder: 0,
          },
        },
        endsAt: new Date("2026-06-19T23:59:59+08:00"),
        name: "含下架菜任务",
        startsAt: new Date("2026-06-18T00:00:00+08:00"),
        status: "ACTIVE",
        storeId: fixture.store.id,
      },
    });
    await prisma.dish.update({
      where: { id: fixture.dishes.spinach.id },
      data: { status: "OFF_SALE" },
    });

    await expect(
      submitReservation({
        addressId: fixture.address.id,
        items: [{ dishId: fixture.dishes.spinach.id, weightJin: 1 }],
        now: new Date("2026-06-18T08:00:00+08:00"),
        storeId: fixture.store.id,
        userId: fixture.user.id,
        userPackageId: fixture.userPackage.id,
      }),
    ).rejects.toMatchObject({
      code: "DISH_NOT_FOUND",
      message: "菜品不存在或已下架",
    } satisfies Partial<ReservationServiceError>);
  });

  it("rejects new reservations at and after the store cutoff time", async () => {
    const fixture = await createFixture();
    await prisma.store.update({
      where: { id: fixture.store.id },
      data: { cutoffTime: "08:30" },
    });

    await expect(
      submitReservation({
        addressId: fixture.address.id,
        items: [{ dishId: fixture.dishes.spinach.id, weightJin: 1 }],
        now: new Date("2026-06-18T08:30:00+08:00"),
        storeId: fixture.store.id,
        userId: fixture.user.id,
        userPackageId: fixture.userPackage.id,
      } as Parameters<typeof submitReservation>[0] & { now: Date }),
    ).rejects.toMatchObject({
      code: "ORDER_CUTOFF_PASSED",
      message: "今日已截单，不能提交预订",
    } satisfies Partial<ReservationServiceError>);

    await expect(
      submitReservation({
        addressId: fixture.address.id,
        items: [{ dishId: fixture.dishes.spinach.id, weightJin: 1 }],
        now: new Date("2026-06-18T08:31:00+08:00"),
        storeId: fixture.store.id,
        userId: fixture.user.id,
        userPackageId: fixture.userPackage.id,
      } as Parameters<typeof submitReservation>[0] & { now: Date }),
    ).rejects.toMatchObject({
      code: "ORDER_CUTOFF_PASSED",
      message: "今日已截单，不能提交预订",
    } satisfies Partial<ReservationServiceError>);

    await expect(
      prisma.order.count({ where: { storeId: fixture.store.id } }),
    ).resolves.toBe(0);
  });

  it("uses the active task cutoff time before the store cutoff time", async () => {
    const fixture = await createFixture();
    await prisma.task.create({
      data: {
        cutoffTime: "08:30",
        dishes: {
          create: {
            dishId: fixture.dishes.spinach.id,
            sortOrder: 0,
          },
        },
        endsAt: new Date("2026-06-19T23:59:59+08:00"),
        name: "早截单任务",
        startsAt: new Date("2026-06-18T00:00:00+08:00"),
        status: "ACTIVE",
        storeId: fixture.store.id,
      },
    });

    await expect(
      submitReservation({
        addressId: fixture.address.id,
        items: [{ dishId: fixture.dishes.spinach.id, weightJin: 1 }],
        now: new Date("2026-06-18T08:31:00+08:00"),
        storeId: fixture.store.id,
        userId: fixture.user.id,
        userPackageId: fixture.userPackage.id,
      }),
    ).rejects.toMatchObject({
      code: "ORDER_CUTOFF_PASSED",
      message: "今日已截单，不能提交预订",
    } satisfies Partial<ReservationServiceError>);
  });

  it("rejects editing reservations after the store cutoff time", async () => {
    const fixture = await createFixture();
    const created = await submitReservation({
      addressId: fixture.address.id,
      items: [{ dishId: fixture.dishes.spinach.id, weightJin: 1 }],
      now: new Date("2026-06-18T08:00:00+08:00"),
      storeId: fixture.store.id,
      userId: fixture.user.id,
      userPackageId: fixture.userPackage.id,
    } as Parameters<typeof submitReservation>[0] & { now: Date });
    await prisma.store.update({
      where: { id: fixture.store.id },
      data: { cutoffTime: "08:30" },
    });

    await expect(
      submitReservation({
        addressId: fixture.address.id,
        items: [{ dishId: fixture.dishes.spinach.id, weightJin: 1.5 }],
        now: new Date("2026-06-18T08:31:00+08:00"),
        orderId: created.id,
        storeId: fixture.store.id,
        userId: fixture.user.id,
        userPackageId: fixture.userPackage.id,
      } as Parameters<typeof submitReservation>[0] & { now: Date }),
    ).rejects.toMatchObject({
      code: "ORDER_CUTOFF_PASSED",
      message: "今日已截单，不能提交预订",
    } satisfies Partial<ReservationServiceError>);
  });

  it("rejects creating a second miniapp reservation on the same business day", async () => {
    const fixture = await createFixture();
    const now = new Date("2026-06-18T08:00:00+08:00");

    await submitReservation({
      addressId: fixture.address.id,
      items: [{ dishId: fixture.dishes.spinach.id, weightJin: 1 }],
      now,
      storeId: fixture.store.id,
      userId: fixture.user.id,
      userPackageId: fixture.userPackage.id,
    });

    await expect(
      submitReservation({
        addressId: fixture.address.id,
        items: [{ dishId: fixture.dishes.cucumber.id, weightJin: 1 }],
        now: new Date("2026-06-18T09:00:00+08:00"),
        storeId: fixture.store.id,
        userId: fixture.user.id,
        userPackageId: fixture.userPackage.id,
      }),
    ).rejects.toMatchObject({
      code: "ORDER_ALREADY_EXISTS",
      message: "今日已提交预订，请修改今日预订",
    } satisfies Partial<ReservationServiceError>);
  });

  it("only consumes user-selected package benefits and creates matching shipments", async () => {
    const fixture = await createFixture();
    const suffix = fixture.userPackage.id;
    const [eggBenefit, chickenBenefit] = await Promise.all([
      prisma.userPackageBenefit.create({
        data: {
          id: `benefit-egg-${suffix}`,
          kind: "EGG",
          nameSnapshot: "土鸡蛋",
          shipmentGroup: "鸡蛋包裹",
          sortOrder: 1,
          totalQuantity: new Prisma.Decimal("1"),
          unitSnapshot: "箱",
          userPackageId: fixture.userPackage.id,
        },
      }),
      prisma.userPackageBenefit.create({
        data: {
          id: `benefit-chicken-${suffix}`,
          kind: "CHICKEN",
          nameSnapshot: "老母鸡",
          shipmentGroup: "禽类包裹",
          sortOrder: 2,
          totalQuantity: new Prisma.Decimal("2"),
          unitSnapshot: "只",
          userPackageId: fixture.userPackage.id,
        },
      }),
    ]);

    const order = await submitReservation({
      addressId: fixture.address.id,
      benefitSelections: [
        {
          quantity: 1,
          userPackageBenefitId: eggBenefit.id,
        },
      ],
      items: [{ dishId: fixture.dishes.spinach.id, weightJin: 1 }],
      storeId: fixture.store.id,
      userId: fixture.user.id,
      userPackageId: fixture.userPackage.id,
    });

    expect(order.benefits).toEqual([
      {
        kind: "EGG",
        nameSnapshot: "土鸡蛋",
        quantity: 1,
        unitSnapshot: "箱",
      },
    ]);
    await expect(
      prisma.userPackageBenefit.findUniqueOrThrow({
        where: { id: eggBenefit.id },
        select: { usedQuantity: true },
      }),
    ).resolves.toMatchObject({
      usedQuantity: new Prisma.Decimal("1"),
    });
    await expect(
      prisma.userPackageBenefit.findUniqueOrThrow({
        where: { id: chickenBenefit.id },
        select: { usedQuantity: true },
      }),
    ).resolves.toMatchObject({
      usedQuantity: new Prisma.Decimal("0"),
    });
    await expect(
      prisma.orderShipment.findMany({
        where: { orderId: order.id },
        orderBy: { sortOrder: "asc" },
        select: { packageName: true, packageType: true },
      }),
    ).resolves.toEqual([
      { packageName: "蔬菜包裹", packageType: "VEGETABLE" },
      { packageName: "鸡蛋包裹", packageType: "EGG" },
    ]);
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
    expect(
      Number(
        (
          await prisma.dish.findUniqueOrThrow({
            where: { id: fixture.dishes.spinach.id },
          })
        ).stockJin,
      ),
    ).toBe(19);
    expect(
      Number(
        (
          await prisma.dish.findUniqueOrThrow({
            where: { id: fixture.dishes.cucumber.id },
          })
        ).stockJin,
      ),
    ).toBe(18.5);

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
    expect(
      Number(
        (
          await prisma.dish.findUniqueOrThrow({
            where: { id: fixture.dishes.spinach.id },
          })
        ).stockJin,
      ),
    ).toBe(18);
    expect(
      Number(
        (
          await prisma.dish.findUniqueOrThrow({
            where: { id: fixture.dishes.cucumber.id },
          })
        ).stockJin,
      ),
    ).toBe(20);
    await expect(
      prisma.orderChangeLog.count({ where: { orderId: created.id } }),
    ).resolves.toBe(1);
  });

  it("updates selected package benefits when editing today's reservation", async () => {
    const fixture = await createFixture();
    const eggBenefit = await prisma.userPackageBenefit.create({
      data: {
        id: `benefit-egg-edit-${fixture.userPackage.id}`,
        kind: "EGG",
        nameSnapshot: "土鸡蛋",
        shipmentGroup: "鸡蛋包裹",
        sortOrder: 1,
        totalQuantity: new Prisma.Decimal("1"),
        unitSnapshot: "箱",
        userPackageId: fixture.userPackage.id,
      },
    });

    const created = await submitReservation({
      addressId: fixture.address.id,
      items: [{ dishId: fixture.dishes.spinach.id, weightJin: 1 }],
      storeId: fixture.store.id,
      userId: fixture.user.id,
      userPackageId: fixture.userPackage.id,
    });
    expect(created.benefits).toEqual([]);

    const updated = await submitReservation({
      addressId: fixture.address.id,
      benefitSelections: [
        {
          quantity: 1,
          userPackageBenefitId: eggBenefit.id,
        },
      ],
      items: [{ dishId: fixture.dishes.spinach.id, weightJin: 1.5 }],
      orderId: created.id,
      storeId: fixture.store.id,
      userId: fixture.user.id,
      userPackageId: fixture.userPackage.id,
    });

    expect(updated.id).toBe(created.id);
    expect(updated.benefits).toEqual([
      {
        kind: "EGG",
        nameSnapshot: "土鸡蛋",
        quantity: 1,
        unitSnapshot: "箱",
      },
    ]);
    await expect(
      prisma.userPackageBenefit.findUniqueOrThrow({
        where: { id: eggBenefit.id },
        select: { usedQuantity: true },
      }),
    ).resolves.toMatchObject({
      usedQuantity: new Prisma.Decimal("1"),
    });
    await expect(
      prisma.orderShipment.findMany({
        where: { orderId: created.id },
        orderBy: { sortOrder: "asc" },
        select: { packageName: true, packageType: true },
      }),
    ).resolves.toEqual([
      { packageName: "蔬菜包裹", packageType: "VEGETABLE" },
      { packageName: "鸡蛋包裹", packageType: "EGG" },
    ]);
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

    const shipped = await orderOperations.shipOrder({
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

  it("marks a shipped order as signed and records an admin operation log", async () => {
    const fixture = await createFixture();
    const order = await submitReservation({
      addressId: fixture.address.id,
      items: [{ dishId: fixture.dishes.spinach.id, weightJin: 1 }],
      storeId: fixture.store.id,
      userId: fixture.user.id,
      userPackageId: fixture.userPackage.id,
    });
    await orderOperations.shipOrder({
      logisticsNo: "SF123456789",
      operatorId: fixture.admin.id,
      orderId: order.id,
      storeId: fixture.store.id,
    });

    const signed = await orderOperations.signOrder({
      operatorId: fixture.admin.id,
      orderId: order.id,
      storeId: fixture.store.id,
    });

    expect(signed.status).toBe("SIGNED");
    expect(signed.signedAt).toBeInstanceOf(Date);
    await expect(
      prisma.adminOperationLog.count({
        where: {
          action: "ORDER_SIGNED",
          operatorId: fixture.admin.id,
          resourceId: order.id,
        },
      }),
    ).resolves.toBe(1);
  });

  it("rejects signing orders that have not been shipped", async () => {
    const fixture = await createFixture();
    const order = await submitReservation({
      addressId: fixture.address.id,
      items: [{ dishId: fixture.dishes.spinach.id, weightJin: 1 }],
      storeId: fixture.store.id,
      userId: fixture.user.id,
      userPackageId: fixture.userPackage.id,
    });

    await expect(
      orderOperations.signOrder({
        operatorId: fixture.admin.id,
        orderId: order.id,
        storeId: fixture.store.id,
      }),
    ).rejects.toMatchObject({
      code: "ORDER_NOT_SIGNABLE",
      message: "当前订单不可签收",
      name: "OrderServiceError",
    });
  });

  it("creates an order from backend operations and records an admin log", async () => {
    const fixture = await createFixture();

    const created = await (
      orderOperations as typeof orderOperations & {
        createStoreOrder: (input: {
          addressId: string;
          internalRemark?: string;
          items: Array<{ dishId: string; weightJin: number }>;
          operatorId: string;
          storeId: string;
          userId: string;
          userPackageId: string;
          userVisibleRemark?: string;
        }) => Promise<{
          id: string;
          internalRemark: string | null;
          items: Array<{ dishId: string; weightJin: number }>;
          status: string;
          totalWeightJin: number;
        }>;
      }
    ).createStoreOrder({
      addressId: fixture.address.id,
      internalRemark: "后台代客下单",
      items: [{ dishId: fixture.dishes.spinach.id, weightJin: 1.5 }],
      operatorId: fixture.admin.id,
      storeId: fixture.store.id,
      userId: fixture.user.id,
      userPackageId: fixture.userPackage.id,
      userVisibleRemark: "客户电话确认",
    });

    expect(created).toMatchObject({
      internalRemark: "后台代客下单",
      items: [{ dishId: fixture.dishes.spinach.id, weightJin: 1.5 }],
      status: "PENDING_SHIPMENT",
      totalWeightJin: 1.5,
    });
    await expect(
      prisma.userPackage.findUniqueOrThrow({
        where: { id: fixture.userPackage.id },
      }),
    ).resolves.toMatchObject({ usedTimes: 1 });
    await expect(
      prisma.adminOperationLog.count({
        where: {
          action: "ORDER_CREATED",
          operatorId: fixture.admin.id,
          resourceId: created.id,
        },
      }),
    ).resolves.toBe(1);
  });

  it("normalizes backend create order validation failures as order service errors", async () => {
    const fixture = await createFixture();

    await expect(
      (
        orderOperations as typeof orderOperations & {
          createStoreOrder: (input: {
            addressId: string;
            items: Array<{ dishId: string; weightJin: number }>;
            operatorId: string;
            storeId: string;
            userId: string;
            userPackageId: string;
          }) => Promise<unknown>;
        }
      ).createStoreOrder({
        addressId: fixture.address.id,
        items: [{ dishId: fixture.dishes.spinach.id, weightJin: 9 }],
        operatorId: fixture.admin.id,
        storeId: fixture.store.id,
        userId: fixture.user.id,
        userPackageId: fixture.userPackage.id,
      }),
    ).rejects.toMatchObject({
      code: "WEIGHT_LIMIT_EXCEEDED",
      message: "已超过套餐本次可预订重量",
      name: "OrderServiceError",
    });
  });

  it("lists store orders with member, address, item details and status summary", async () => {
    const fixture = await createFixture();
    const otherStoreFixture = await createFixture();
    const order = await submitReservation({
      addressId: fixture.address.id,
      items: [
        { dishId: fixture.dishes.spinach.id, weightJin: 1 },
        { dishId: fixture.dishes.cucumber.id, weightJin: 1.5 },
      ],
      storeId: fixture.store.id,
      userId: fixture.user.id,
      userPackageId: fixture.userPackage.id,
      userVisibleRemark: "配送前电话确认",
    });
    await submitReservation({
      addressId: otherStoreFixture.address.id,
      items: [{ dishId: otherStoreFixture.dishes.spinach.id, weightJin: 1 }],
      storeId: otherStoreFixture.store.id,
      userId: otherStoreFixture.user.id,
      userPackageId: otherStoreFixture.userPackage.id,
    });

    const result = await (
      orderOperations as typeof orderOperations & {
        listStoreOrders: (input: { storeId: string }) => Promise<{
          items: Array<{
            id: string;
            addressSnapshot: {
              detail?: string;
              receiverName?: string;
              receiverPhone?: string;
            };
            items: Array<{ dishNameSnapshot: string; weightJin: number }>;
            orderNo: string;
            totalWeightJin: number;
            user: { id: string; nickname: string | null; phone: string | null };
          }>;
          summary: {
            canceled: number;
            pendingShipment: number;
            shipped: number;
            signed: number;
            total: number;
          };
        }>;
      }
    ).listStoreOrders({ storeId: fixture.store.id });

    expect(result.summary).toEqual({
      canceled: 0,
      pendingShipment: 1,
      shipped: 0,
      signed: 0,
      total: 1,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: order.id,
      addressSnapshot: {
        detail: "测试小区 1 栋 101",
        receiverName: "测试会员",
        receiverPhone: "13800001111",
      },
      orderNo: order.orderNo,
      totalWeightJin: 2.5,
      user: {
        id: fixture.user.id,
        nickname: "测试会员",
        phone: "13800001111",
      },
    });
    expect(
      result.items[0]?.items.map((item) => ({
        dishNameSnapshot: item.dishNameSnapshot,
        weightJin: item.weightJin,
      })),
    ).toEqual([
      { dishNameSnapshot: "菠菜", weightJin: 1 },
      { dishNameSnapshot: "黄瓜", weightJin: 1.5 },
    ]);
  });

  it("gets one store order detail and keeps it scoped to the store", async () => {
    const fixture = await createFixture();
    const otherStoreFixture = await createFixture();
    const order = await submitReservation({
      addressId: fixture.address.id,
      items: [
        { dishId: fixture.dishes.spinach.id, weightJin: 1 },
        { dishId: fixture.dishes.cucumber.id, weightJin: 1.5 },
      ],
      storeId: fixture.store.id,
      userId: fixture.user.id,
      userPackageId: fixture.userPackage.id,
      userVisibleRemark: "少放根茎",
    });

    const detail = await orderOperations.getStoreOrder({
      orderId: order.id,
      storeId: fixture.store.id,
    });

    expect(detail).toMatchObject({
      id: order.id,
      orderNo: order.orderNo,
      status: "PENDING_SHIPMENT",
      totalWeightJin: 2.5,
      userVisibleRemark: "少放根茎",
      user: {
        id: fixture.user.id,
        nickname: "测试会员",
      },
    });
    expect(detail.items).toEqual([
      expect.objectContaining({ dishNameSnapshot: "菠菜", weightJin: 1 }),
      expect.objectContaining({ dishNameSnapshot: "黄瓜", weightJin: 1.5 }),
    ]);

    await expect(
      orderOperations.getStoreOrder({
        orderId: order.id,
        storeId: otherStoreFixture.store.id,
      }),
    ).rejects.toMatchObject({
      code: "ORDER_NOT_FOUND",
      message: "订单不存在",
    });
  });

  it("filters store orders by status and dish name search", async () => {
    const fixture = await createFixture();
    const pendingOrder = await submitReservation({
      addressId: fixture.address.id,
      items: [{ dishId: fixture.dishes.spinach.id, weightJin: 1 }],
      storeId: fixture.store.id,
      userId: fixture.user.id,
      userPackageId: fixture.userPackage.id,
    });
    const shippedOrder = await submitReservation({
      addressId: fixture.address.id,
      items: [{ dishId: fixture.dishes.cucumber.id, weightJin: 1.5 }],
      now: new Date("2026-06-19T08:00:00+08:00"),
      storeId: fixture.store.id,
      userId: fixture.user.id,
      userPackageId: fixture.userPackage.id,
    });
    await orderOperations.shipOrder({
      logisticsNo: "SF987654321",
      operatorId: fixture.admin.id,
      orderId: shippedOrder.id,
      storeId: fixture.store.id,
    });

    const result = await orderOperations.listStoreOrders({
      query: "黄瓜",
      status: "SHIPPED",
      storeId: fixture.store.id,
    });

    expect(result.summary).toMatchObject({
      pendingShipment: 1,
      shipped: 1,
      total: 2,
    });
    expect(result.items.map((item) => item.id)).toEqual([shippedOrder.id]);
    expect(result.items[0]?.items).toEqual([
      expect.objectContaining({ dishNameSnapshot: "黄瓜", weightJin: 1.5 }),
    ]);
    expect(result.items.map((item) => item.id)).not.toContain(pendingOrder.id);
  });

  it("voids a pending backend order and restores package usage and stock", async () => {
    const fixture = await createFixture();
    const order = await submitReservation({
      addressId: fixture.address.id,
      items: [
        { dishId: fixture.dishes.spinach.id, weightJin: 1 },
        { dishId: fixture.dishes.cucumber.id, weightJin: 1.5 },
      ],
      storeId: fixture.store.id,
      userId: fixture.user.id,
      userPackageId: fixture.userPackage.id,
    });

    const voided = await orderOperations.voidOrder({
      operatorId: fixture.admin.id,
      orderId: order.id,
      reason: "客户临时取消配送",
      storeId: fixture.store.id,
    });

    expect(voided.status).toBe("VOIDED");
    expect(voided.cancelReason).toBe("客户临时取消配送");
    expect(voided.canceledAt).toBeInstanceOf(Date);
    await expect(
      prisma.userPackage.findUniqueOrThrow({
        where: { id: fixture.userPackage.id },
      }),
    ).resolves.toMatchObject({ usedTimes: 0 });
    await expect(
      prisma.dish.findUniqueOrThrow({
        where: { id: fixture.dishes.spinach.id },
      }),
    ).resolves.toMatchObject({ stockJin: new Prisma.Decimal("20.00") });
    await expect(
      prisma.dish.findUniqueOrThrow({
        where: { id: fixture.dishes.cucumber.id },
      }),
    ).resolves.toMatchObject({ stockJin: new Prisma.Decimal("20.00") });
    await expect(
      prisma.adminOperationLog.count({
        where: {
          action: "ORDER_VOIDED",
          operatorId: fixture.admin.id,
          resourceId: order.id,
        },
      }),
    ).resolves.toBe(1);
  });

  it("rejects voiding shipped backend orders", async () => {
    const fixture = await createFixture();
    const order = await submitReservation({
      addressId: fixture.address.id,
      items: [{ dishId: fixture.dishes.spinach.id, weightJin: 1 }],
      storeId: fixture.store.id,
      userId: fixture.user.id,
      userPackageId: fixture.userPackage.id,
    });
    await orderOperations.shipOrder({
      logisticsNo: "SF123456789",
      operatorId: fixture.admin.id,
      orderId: order.id,
      storeId: fixture.store.id,
    });

    await expect(
      orderOperations.voidOrder({
        operatorId: fixture.admin.id,
        orderId: order.id,
        reason: "测试作废",
        storeId: fixture.store.id,
      }),
    ).rejects.toMatchObject({
      code: "ORDER_NOT_VOIDABLE",
      message: "当前订单不可作废",
      name: "OrderServiceError",
    });
  });

  it("batch ships pending orders and reports per-order failures", async () => {
    const fixture = await createFixture();
    const firstOrder = await submitReservation({
      addressId: fixture.address.id,
      items: [{ dishId: fixture.dishes.spinach.id, weightJin: 1 }],
      storeId: fixture.store.id,
      userId: fixture.user.id,
      userPackageId: fixture.userPackage.id,
    });
    const secondOrder = await submitReservation({
      addressId: fixture.address.id,
      items: [{ dishId: fixture.dishes.cucumber.id, weightJin: 1 }],
      now: new Date("2026-06-19T08:00:00+08:00"),
      storeId: fixture.store.id,
      userId: fixture.user.id,
      userPackageId: fixture.userPackage.id,
    });
    const alreadyShippedOrder = await submitReservation({
      addressId: fixture.address.id,
      items: [{ dishId: fixture.dishes.spinach.id, weightJin: 0.5 }],
      now: new Date("2026-06-20T08:00:00+08:00"),
      storeId: fixture.store.id,
      userId: fixture.user.id,
      userPackageId: fixture.userPackage.id,
    });
    await orderOperations.shipOrder({
      logisticsNo: "SF-ALREADY-SHIPPED",
      operatorId: fixture.admin.id,
      orderId: alreadyShippedOrder.id,
      storeId: fixture.store.id,
    });

    const result = await orderOperations.batchShipOrders({
      operatorId: fixture.admin.id,
      shipments: [
        { logisticsNo: "SF-BATCH-001", orderId: firstOrder.id },
        { logisticsNo: "SF-BATCH-FAIL", orderId: alreadyShippedOrder.id },
        { logisticsNo: "SF-BATCH-002", orderId: secondOrder.id },
      ],
      storeId: fixture.store.id,
    });

    expect(result).toMatchObject({
      failureCount: 1,
      successCount: 2,
    });
    expect(result.successes.map((item) => item.orderId)).toEqual([
      firstOrder.id,
      secondOrder.id,
    ]);
    expect(result.failures).toEqual([
      expect.objectContaining({
        code: "ORDER_NOT_SHIPPABLE",
        message: "当前订单不可发货",
        orderId: alreadyShippedOrder.id,
      }),
    ]);
    await expect(
      prisma.order.findMany({
        orderBy: { logisticsNo: "asc" },
        select: { id: true, logisticsNo: true, status: true },
        where: { id: { in: [firstOrder.id, secondOrder.id] } },
      }),
    ).resolves.toEqual([
      { id: firstOrder.id, logisticsNo: "SF-BATCH-001", status: "SHIPPED" },
      { id: secondOrder.id, logisticsNo: "SF-BATCH-002", status: "SHIPPED" },
    ]);
    await expect(
      prisma.adminOperationLog.count({
        where: {
          action: "ORDER_SHIPPED",
          operatorId: fixture.admin.id,
          resourceId: { in: [firstOrder.id, secondOrder.id] },
        },
      }),
    ).resolves.toBe(2);
  });

  it("builds shipment statistics with status, category and address filters", async () => {
    const fixture = await createFixture();
    const otherStoreFixture = await createFixture();
    const shippedOrder = await submitReservation({
      addressId: fixture.address.id,
      items: [
        { dishId: fixture.dishes.spinach.id, weightJin: 1 },
        { dishId: fixture.dishes.cucumber.id, weightJin: 1.5 },
      ],
      storeId: fixture.store.id,
      userId: fixture.user.id,
      userPackageId: fixture.userPackage.id,
    });
    await submitReservation({
      addressId: fixture.address.id,
      items: [{ dishId: fixture.dishes.spinach.id, weightJin: 0.5 }],
      now: new Date("2026-06-19T08:00:00+08:00"),
      storeId: fixture.store.id,
      userId: fixture.user.id,
      userPackageId: fixture.userPackage.id,
    });
    await submitReservation({
      addressId: otherStoreFixture.address.id,
      items: [{ dishId: otherStoreFixture.dishes.spinach.id, weightJin: 1 }],
      storeId: otherStoreFixture.store.id,
      userId: otherStoreFixture.user.id,
      userPackageId: otherStoreFixture.userPackage.id,
    });
    await orderOperations.shipOrder({
      logisticsNo: "SF-STATS-001",
      operatorId: fixture.admin.id,
      orderId: shippedOrder.id,
      storeId: fixture.store.id,
    });

    const result = await orderOperations.getShipmentStats({
      addressKeyword: "测试小区",
      dishCategory: "LEAFY",
      status: "SHIPPED",
      storeId: fixture.store.id,
    });

    expect(result.summary).toEqual({
      orderCount: 1,
      totalWeightJin: 1,
    });
    expect(result.dishes).toEqual([
      {
        category: "LEAFY",
        dishId: fixture.dishes.spinach.id,
        dishName: "菠菜",
        orderCount: 1,
        totalWeightJin: 1,
      },
    ]);
    expect(result.addresses).toEqual([
      {
        address: "测试小区 1 栋 101",
        orderCount: 1,
        totalWeightJin: 1,
      },
    ]);
    expect(result.copyText).toContain("发货统计：1 单，1 斤");
    expect(result.copyText).toContain("菠菜 1斤");
    expect(result.copyText).not.toContain("地址汇总");
    expect(result.csvText).toContain("类型,名称,订单数,重量(斤)");
    expect(result.csvText).toContain("菜品,菠菜,1,1");
    expect(result.csvText).not.toContain("地址,");
  });

  it("exports filtered store orders as csv", async () => {
    const fixture = await createFixture();
    const otherStoreFixture = await createFixture();
    const exportedOrder = await submitReservation({
      addressId: fixture.address.id,
      items: [{ dishId: fixture.dishes.spinach.id, weightJin: 1 }],
      storeId: fixture.store.id,
      userId: fixture.user.id,
      userPackageId: fixture.userPackage.id,
      userVisibleRemark: "=导出备注",
    });
    const pendingOrder = await submitReservation({
      addressId: fixture.address.id,
      items: [{ dishId: fixture.dishes.cucumber.id, weightJin: 1 }],
      now: new Date("2026-06-19T08:00:00+08:00"),
      storeId: fixture.store.id,
      userId: fixture.user.id,
      userPackageId: fixture.userPackage.id,
    });
    await submitReservation({
      addressId: otherStoreFixture.address.id,
      items: [{ dishId: otherStoreFixture.dishes.spinach.id, weightJin: 1 }],
      storeId: otherStoreFixture.store.id,
      userId: otherStoreFixture.user.id,
      userPackageId: otherStoreFixture.userPackage.id,
    });
    await prisma.order.updateMany({
      where: { id: { in: [exportedOrder.id, pendingOrder.id] } },
      data: { createdAt: new Date("2026-06-18T02:00:00.000Z") },
    });
    await orderOperations.shipOrder({
      logisticsNo: "SF-EXPORT-001",
      operatorId: fixture.admin.id,
      orderId: exportedOrder.id,
      storeId: fixture.store.id,
    });

    const result = await orderOperations.exportStoreOrders({
      dateFrom: new Date("2026-06-18T00:00:00.000Z"),
      dateTo: new Date("2026-06-18T23:59:59.999Z"),
      query: "菠菜",
      status: "SHIPPED",
      storeId: fixture.store.id,
    });

    expect(result.rowCount).toBe(1);
    expect(result.csvText).toContain(
      "订单号,状态,会员,手机号,套餐,总重量(斤),菜品明细,配送地址,运单号,会员备注,内部备注,下单时间",
    );
    expect(result.csvText).toContain(exportedOrder.orderNo);
    expect(result.csvText).toContain("已发货");
    expect(result.csvText).toContain("8斤测试套餐");
    expect(result.csvText).toContain("菠菜 1斤");
    expect(result.csvText).toContain("测试小区 1 栋 101");
    expect(result.csvText).toContain("SF-EXPORT-001");
    expect(result.csvText).toContain("'=导出备注");
    expect(result.csvText).not.toContain(",=导出备注,");
    expect(result.csvText).not.toContain(pendingOrder.orderNo);
  });

  it("builds printable shipment labels for selected orders", async () => {
    const fixture = await createFixture();
    const order = await submitReservation({
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
    await orderOperations.shipOrder({
      logisticsNo: "SF-LABEL-001",
      operatorId: fixture.admin.id,
      orderId: order.id,
      storeId: fixture.store.id,
    });

    const result = await orderOperations.buildOrderPrintLabels({
      orderIds: [order.id],
      storeId: fixture.store.id,
    });

    expect(result.labels).toEqual([
      expect.objectContaining({
        address: "测试小区 1 栋 101",
        logisticsNo: "SF-LABEL-001",
        orderNo: order.orderNo,
        receiverName: "测试会员",
        receiverPhone: "13800001111",
        remark: "不要香菜",
        totalWeightJin: 2.5,
      }),
    ]);
    expect(result.labels[0]?.items).toEqual([
      { dishName: "菠菜", weightJin: 1 },
      { dishName: "黄瓜", weightJin: 1.5 },
    ]);
    expect(result.html).toContain(order.orderNo);
    expect(result.html).toContain("测试小区 1 栋 101");
    expect(result.html).toContain("菠菜 1斤");
    expect(result.html).toContain("window.print()");
  });

  it("updates an order internal remark and records an admin operation log", async () => {
    const fixture = await createFixture();
    const order = await submitReservation({
      addressId: fixture.address.id,
      items: [{ dishId: fixture.dishes.spinach.id, weightJin: 1 }],
      storeId: fixture.store.id,
      userId: fixture.user.id,
      userPackageId: fixture.userPackage.id,
    });

    const updated = await (
      orderOperations as typeof orderOperations & {
        updateOrderInternalRemark: (input: {
          internalRemark: string;
          operatorId: string;
          orderId: string;
          storeId: string;
        }) => Promise<{ id: string; internalRemark: string | null }>;
      }
    ).updateOrderInternalRemark({
      internalRemark: "客户要求 18 点后配送",
      operatorId: fixture.admin.id,
      orderId: order.id,
      storeId: fixture.store.id,
    });

    expect(updated.internalRemark).toBe("客户要求 18 点后配送");
    await expect(
      prisma.adminOperationLog.count({
        where: {
          action: "ORDER_INTERNAL_REMARK_UPDATED",
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

    const frozen = await packageOperations.freezeUserPackage({
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

    const active = await packageOperations.unfreezeUserPackage({
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

  it("lists user packages for one store with member and usage summary", async () => {
    const fixture = await createFixture();
    const otherStoreFixture = await createFixture();
    await prisma.userPackage.update({
      where: { id: fixture.userPackage.id },
      data: { usedTimes: 2 },
    });

    const result = await (
      packageOperations as typeof packageOperations & {
        listUserPackages: (input: { storeId: string }) => Promise<{
          items: Array<{
            id: string;
            remainingTimes: number;
            store: { id: string; name: string };
            user: { id: string; nickname: string | null; phone: string | null };
          }>;
          summary: { active: number; expired: number; frozen: number; total: number };
        }>;
      }
    ).listUserPackages({ storeId: fixture.store.id });

    expect(result.summary).toEqual({
      active: 1,
      expired: 0,
      frozen: 0,
      total: 1,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: fixture.userPackage.id,
      remainingTimes: 6,
      store: { id: fixture.store.id, name: "测试加盟店" },
      user: {
        id: fixture.user.id,
        nickname: "测试会员",
        phone: "13800001111",
      },
    });
    expect(result.items[0]?.id).not.toBe(otherStoreFixture.userPackage.id);
  });

  it("adjusts a user package and records the before and after values", async () => {
    const fixture = await createFixture();
    const updated = await packageOperations.adjustUserPackage({
      operatorId: fixture.admin.id,
      reason: "后台补偿调整",
      storeId: fixture.store.id,
      totalTimes: 10,
      usedTimes: 2,
      userPackageId: fixture.userPackage.id,
      weightLimitJin: 6.5,
    });

    expect(updated.totalTimes).toBe(10);
    expect(updated.usedTimes).toBe(2);
    expect(Number(updated.weightLimitJin)).toBe(6.5);

    const log = await prisma.packageOperationLog.findFirstOrThrow({
      where: {
        operatorId: fixture.admin.id,
        reason: "后台补偿调整",
        userPackageId: fixture.userPackage.id,
      },
    });
    expect(log.beforeValue).toMatchObject({
      totalTimes: 8,
      usedTimes: 0,
      weightLimitJin: "8",
    });
    expect(log.afterValue).toMatchObject({
      totalTimes: 10,
      usedTimes: 2,
      weightLimitJin: "6.5",
    });
  });
});
