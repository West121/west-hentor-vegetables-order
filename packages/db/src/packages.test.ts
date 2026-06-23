import { afterEach, describe, expect, it } from "vitest";

import { Prisma, prisma, type AdminUser, type Store, type User } from "./index";
import * as packageOperations from "./packages";

type Fixture = {
  admin: AdminUser;
  store: Store;
  user: User;
  userPackageId: string;
};

const createdAdminIds = new Set<string>();
const createdStoreIds = new Set<string>();
const createdUserIds = new Set<string>();

async function cleanup() {
  const adminIds = [...createdAdminIds];
  const storeIds = [...createdStoreIds];
  const userIds = [...createdUserIds];

  if (storeIds.length) {
    await prisma.adminOperationLog.deleteMany({
      where: { storeId: { in: storeIds } },
    });
    await prisma.packageOperationLog.deleteMany({
      where: { userPackage: { storeId: { in: storeIds } } },
    });
    await prisma.orderItem.deleteMany({
      where: { order: { storeId: { in: storeIds } } },
    });
    await prisma.order.deleteMany({ where: { storeId: { in: storeIds } } });
    await prisma.userPackage.deleteMany({ where: { storeId: { in: storeIds } } });
    await prisma.memberStoreBinding.deleteMany({
      where: { storeId: { in: storeIds } },
    });
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

  createdAdminIds.clear();
  createdStoreIds.clear();
  createdUserIds.clear();
}

afterEach(async () => {
  await cleanup();
});

async function createFixture(): Promise<Fixture> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const adminId = `package-test-admin-${suffix}`;
  const storeId = `package-test-store-${suffix}`;
  const userId = `package-test-user-${suffix}`;
  const templateId = `package-test-template-${suffix}`;
  const userPackageId = `package-test-user-package-${suffix}`;

  createdAdminIds.add(adminId);
  createdStoreIds.add(storeId);
  createdUserIds.add(userId);

  const [admin, store] = await Promise.all([
    prisma.adminUser.create({
      data: {
        id: adminId,
        name: "套餐管理员",
        passwordHash: "not-used",
        status: "ACTIVE",
        username: `package-admin-${suffix}`,
      },
    }),
    prisma.store.create({
      data: {
        id: storeId,
        code: `package-test-store-${suffix}`,
        contactName: "套餐店长",
        contactPhone: "13900003333",
        name: "套餐测试加盟店",
        status: "ACTIVE",
        type: "FRANCHISE",
      },
    }),
  ]);

  const user = await prisma.user.create({
    data: {
      id: userId,
      defaultStoreId: store.id,
      nickname: "套餐会员",
      openid: `package-openid-${suffix}`,
      phone: "13800003333",
    },
  });

  await prisma.memberStoreBinding.create({
    data: {
      isDefault: true,
      source: "test",
      status: "ACTIVE",
      storeId: store.id,
      userId: user.id,
    },
  });

  const template = await prisma.packageTemplate.create({
    data: {
      id: templateId,
      name: "8斤周套餐",
      storeId: store.id,
      totalTimes: 10,
      validDays: 90,
      weightLimitJin: new Prisma.Decimal("8.00"),
    },
  });

  const userPackage = await prisma.userPackage.create({
    data: {
      expiresAt: new Date("2099-12-31T15:59:59.000Z"),
      id: userPackageId,
      nameSnapshot: template.name,
      status: "ACTIVE",
      storeId: store.id,
      templateId: template.id,
      totalTimes: 10,
      usedTimes: 4,
      userId: user.id,
      weightLimitJin: new Prisma.Decimal("8.00"),
    },
  });

  await prisma.order.create({
    data: {
      addressSnapshot: {
        detail: "套餐测试地址",
        receiverName: "套餐会员",
        receiverPhone: "13800003333",
      },
      orderNo: `PO${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      status: "SHIPPED",
      storeId: store.id,
      totalWeightJin: new Prisma.Decimal("3.50"),
      userId: user.id,
      userPackageId: userPackage.id,
    },
  });

  await prisma.packageOperationLog.create({
    data: {
      afterValue: { usedTimes: 4 },
      beforeValue: { usedTimes: 3 },
      operatorId: admin.id,
      reason: "后台调整次数",
      userPackageId: userPackage.id,
    },
  });

  return {
    admin,
    store,
    user,
    userPackageId,
  };
}

describe("user package management", () => {
  it("imports user packages from member phone and package template name", async () => {
    const fixture = await createFixture();
    const extraTemplate = await prisma.packageTemplate.create({
      data: {
        benefits: {
          create: {
            kind: "EGG",
            name: "鸡蛋",
            shipmentGroup: "鸡蛋",
            sortOrder: 0,
            totalQuantity: new Prisma.Decimal("1"),
            unit: "箱",
          },
        },
        id: `package-test-extra-template-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: "鸡蛋周套餐",
        storeId: fixture.store.id,
        totalTimes: 4,
        validDays: 90,
        weightLimitJin: new Prisma.Decimal("8.00"),
      },
    });

    const result = await (
      packageOperations as typeof packageOperations & {
        importUserPackages: (input: {
          operatorId: string;
          rows: Array<{
            phone: string;
            remark?: string;
            templateName: string;
            totalTimes?: number;
            usedTimes?: number;
            weightLimitJin?: number;
          }>;
          storeId: string;
        }) => Promise<{
          createdPackages: number;
          failedRows: number;
          importedRows: number;
          updatedPackages: number;
        }>;
      }
    ).importUserPackages({
      operatorId: fixture.admin.id,
      rows: [
        {
          phone: fixture.user.phone ?? "",
          remark: "导入调整",
          templateName: "8斤周套餐",
          totalTimes: 8,
          usedTimes: 2,
          weightLimitJin: 7.5,
        },
        {
          phone: fixture.user.phone ?? "",
          remark: "导入开通",
          templateName: "鸡蛋周套餐",
        },
      ],
      storeId: fixture.store.id,
    });

    expect(result).toMatchObject({
      createdPackages: 2,
      failedRows: 0,
      importedRows: 2,
      updatedPackages: 0,
    });

    const unchanged = await prisma.userPackage.findUniqueOrThrow({
      where: { id: fixture.userPackageId },
    });
    expect(unchanged.totalTimes).toBe(10);
    expect(unchanged.usedTimes).toBe(4);
    expect(Number(unchanged.weightLimitJin)).toBe(8);

    const importedSameTemplate = await prisma.userPackage.findFirstOrThrow({
      where: {
        id: { not: fixture.userPackageId },
        storeId: fixture.store.id,
        templateId: unchanged.templateId,
        userId: fixture.user.id,
      },
    });
    expect(importedSameTemplate.totalTimes).toBe(8);
    expect(importedSameTemplate.usedTimes).toBe(2);
    expect(Number(importedSameTemplate.weightLimitJin)).toBe(7.5);

    const created = await prisma.userPackage.findFirstOrThrow({
      include: { benefits: true },
      where: {
        storeId: fixture.store.id,
        templateId: extraTemplate.id,
        userId: fixture.user.id,
      },
    });
    expect(created.benefits).toEqual([
      expect.objectContaining({
        kind: "EGG",
        nameSnapshot: "鸡蛋",
        unitSnapshot: "箱",
      }),
    ]);
  });

  it("gets a user package detail with user, orders and operation logs", async () => {
    const fixture = await createFixture();

    const detail = await (
      packageOperations as typeof packageOperations & {
        getUserPackage: (input: {
          storeId: string;
          userPackageId: string;
        }) => Promise<{
          id: string;
          operationLogs: Array<{ operator: { id: string; name: string } | null; reason: string }>;
          recentOrders: Array<{ status: "SHIPPED"; totalWeightJin: number }>;
          remainingTimes: number;
          usagePercent: number;
          user: { id: string; phone: string | null };
          weightLimitJin: number;
        }>;
      }
    ).getUserPackage({
      storeId: fixture.store.id,
      userPackageId: fixture.userPackageId,
    });

    expect(detail).toMatchObject({
      id: fixture.userPackageId,
      remainingTimes: 6,
      usagePercent: 40,
      user: {
        id: fixture.user.id,
        phone: fixture.user.phone,
      },
      weightLimitJin: 8,
    });
    expect(detail.recentOrders).toEqual([
      expect.objectContaining({
        status: "SHIPPED",
        totalWeightJin: 3.5,
      }),
    ]);
    expect(detail.operationLogs).toEqual([
      expect.objectContaining({
        operator: expect.objectContaining({
          id: fixture.admin.id,
          name: fixture.admin.name,
        }),
        reason: "后台调整次数",
      }),
    ]);
  });
});
