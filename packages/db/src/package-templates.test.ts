import { afterEach, describe, expect, it } from "vitest";

import {
  Prisma,
  prisma,
  type AdminUser,
  type PackageTemplate,
  type Store,
  type User,
} from "./index";
import * as templateOperations from "./package-templates";

type Fixture = {
  admin: AdminUser;
  store: Store;
  template: PackageTemplate;
  user: User;
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
    await prisma.paymentOrder.deleteMany({
      where: { purchaseOrder: { storeId: { in: storeIds } } },
    });
    await prisma.packagePurchaseOrder.deleteMany({
      where: { storeId: { in: storeIds } },
    });
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

  createdStoreIds.clear();
  createdUserIds.clear();
  createdAdminIds.clear();
}

afterEach(async () => {
  await cleanup();
});

async function createFixture(): Promise<Fixture> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const storeId = `template-test-store-${suffix}`;
  const userId = `template-test-user-${suffix}`;
  const adminId = `template-test-admin-${suffix}`;
  createdStoreIds.add(storeId);
  createdUserIds.add(userId);
  createdAdminIds.add(adminId);

  const store = await prisma.store.create({
    data: {
      id: storeId,
      code: `template-test-store-${suffix}`,
      contactName: "套餐店长",
      contactPhone: "13900003333",
      name: "套餐测试加盟店",
      status: "ACTIVE",
      type: "FRANCHISE",
    },
  });

  const admin = await prisma.adminUser.create({
    data: {
      id: adminId,
      name: "套餐管理员",
      passwordHash: "not-used",
      status: "ACTIVE",
      username: `template-admin-${suffix}`,
    },
  });

  const user = await prisma.user.create({
    data: {
      id: userId,
      defaultStoreId: store.id,
      openid: `template-openid-${suffix}`,
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
      id: `template-test-${suffix}`,
      name: "8斤月套餐",
      sortOrder: 1,
      status: "ACTIVE",
      storeId: store.id,
      totalTimes: 8,
      validDays: 90,
      weightLimitJin: new Prisma.Decimal("8.00"),
    },
  });

  await prisma.userPackage.create({
    data: {
      expiresAt: new Date("2099-12-31T15:59:59.000Z"),
      id: `template-user-package-${suffix}`,
      nameSnapshot: template.name,
      status: "ACTIVE",
      storeId: store.id,
      templateId: template.id,
      totalTimes: template.totalTimes,
      usedTimes: 1,
      userId: user.id,
      weightLimitJin: template.weightLimitJin,
    },
  });

  await prisma.packagePurchaseOrder.create({
    data: {
      amountFen: 0,
      id: `template-purchase-${suffix}`,
      status: "PAYMENT_NOT_ENABLED",
      storeId: store.id,
      templateId: template.id,
      userId: user.id,
    },
  });

  return { admin, store, template, user };
}

describe("package template management", () => {
  it("lists package templates scoped to one store with usage summary", async () => {
    const fixture = await createFixture();
    const otherFixture = await createFixture();

    const result = await (
      templateOperations as typeof templateOperations & {
        listPackageTemplates: (input: { storeId: string }) => Promise<{
          items: Array<{
            id: string;
            purchaseOrderCount: number;
            status: "ACTIVE" | "DISABLED";
            userPackageCount: number;
            weightLimitJin: number;
          }>;
          summary: { active: number; disabled: number; total: number };
        }>;
      }
    ).listPackageTemplates({ storeId: fixture.store.id });

    expect(result.summary).toEqual({
      active: 1,
      disabled: 0,
      total: 1,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: fixture.template.id,
      purchaseOrderCount: 1,
      status: "ACTIVE",
      userPackageCount: 1,
      weightLimitJin: 8,
    });
    expect(result.items[0]?.id).not.toBe(otherFixture.template.id);
  });

  it("creates and updates a package template with admin operation logs", async () => {
    const fixture = await createFixture();

    const created = await (
      templateOperations as typeof templateOperations & {
        createPackageTemplate: (input: {
          name: string;
          operatorId: string;
          sortOrder: number;
          storeId: string;
          totalTimes: number;
          validDays: number;
          weightLimitJin: number;
        }) => Promise<PackageTemplate>;
        updatePackageTemplate: (input: {
          id: string;
          name: string;
          operatorId: string;
          sortOrder: number;
          status: "ACTIVE" | "DISABLED";
          storeId: string;
          totalTimes: number;
          validDays: number;
          weightLimitJin: number;
        }) => Promise<PackageTemplate>;
      }
    ).createPackageTemplate({
      name: "12斤双周套餐",
      operatorId: fixture.admin.id,
      sortOrder: 2,
      storeId: fixture.store.id,
      totalTimes: 12,
      validDays: 120,
      weightLimitJin: 12,
    });

    expect(created).toMatchObject({
      name: "12斤双周套餐",
      sortOrder: 2,
      status: "ACTIVE",
      totalTimes: 12,
      validDays: 120,
    });
    expect(Number(created.weightLimitJin)).toBe(12);

    const updated = await (
      templateOperations as typeof templateOperations & {
        updatePackageTemplate: (input: {
          id: string;
          name: string;
          operatorId: string;
          sortOrder: number;
          status: "ACTIVE" | "DISABLED";
          storeId: string;
          totalTimes: number;
          validDays: number;
          weightLimitJin: number;
        }) => Promise<PackageTemplate>;
      }
    ).updatePackageTemplate({
      id: created.id,
      name: "12斤双周套餐-停用",
      operatorId: fixture.admin.id,
      sortOrder: 3,
      status: "DISABLED",
      storeId: fixture.store.id,
      totalTimes: 10,
      validDays: 100,
      weightLimitJin: 10.5,
    });

    expect(updated).toMatchObject({
      id: created.id,
      name: "12斤双周套餐-停用",
      sortOrder: 3,
      status: "DISABLED",
      totalTimes: 10,
      validDays: 100,
    });
    expect(Number(updated.weightLimitJin)).toBe(10.5);

    await expect(
      prisma.adminOperationLog.count({
        where: {
          action: { in: ["PACKAGE_TEMPLATE_CREATED", "PACKAGE_TEMPLATE_UPDATED"] },
          operatorId: fixture.admin.id,
          resource: "package_template",
          storeId: fixture.store.id,
        },
      }),
    ).resolves.toBe(2);
  });
});
