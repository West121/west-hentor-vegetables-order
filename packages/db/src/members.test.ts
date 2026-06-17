import { afterEach, describe, expect, it } from "vitest";

import {
  Prisma,
  prisma,
  type Address,
  type AdminUser,
  type Store,
  type User,
} from "./index";
import * as memberOperations from "./members";

type Fixture = {
  address: Address;
  admin: AdminUser;
  store: Store;
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
  const storeId = `member-test-store-${suffix}`;
  const userId = `member-test-user-${suffix}`;
  const adminId = `member-test-admin-${suffix}`;
  createdStoreIds.add(storeId);
  createdUserIds.add(userId);
  createdAdminIds.add(adminId);

  const store = await prisma.store.create({
    data: {
      id: storeId,
      code: `member-test-store-${suffix}`,
      name: "会员测试加盟店",
      type: "FRANCHISE",
      status: "ACTIVE",
      contactName: "会员店长",
      contactPhone: "13900002222",
    },
  });

  const user = await prisma.user.create({
    data: {
      id: userId,
      defaultStoreId: store.id,
      nickname: "会员张三",
      openid: `member-openid-${suffix}`,
      phone: "13800002222",
      remark: "老客户",
    },
  });

  const admin = await prisma.adminUser.create({
    data: {
      id: adminId,
      name: "会员管理员",
      passwordHash: "not-used",
      status: "ACTIVE",
      username: `member-admin-${suffix}`,
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

  const address = await prisma.address.create({
    data: {
      id: `member-address-${suffix}`,
      detail: "会员测试小区 2 栋 202",
      isDefault: true,
      receiverName: "会员张三",
      receiverPhone: "13800002222",
      storeId: store.id,
      userId: user.id,
    },
  });

  const template = await prisma.packageTemplate.create({
    data: {
      id: `member-template-${suffix}`,
      name: "会员测试套餐",
      storeId: store.id,
      totalTimes: 10,
      validDays: 90,
      weightLimitJin: new Prisma.Decimal("8.00"),
    },
  });

  const userPackage = await prisma.userPackage.create({
    data: {
      expiresAt: new Date("2099-12-31T15:59:59.000Z"),
      id: `member-package-${suffix}`,
      nameSnapshot: template.name,
      status: "ACTIVE",
      storeId: store.id,
      templateId: template.id,
      totalTimes: 10,
      usedTimes: 3,
      userId: user.id,
      weightLimitJin: new Prisma.Decimal("8.00"),
    },
  });

  await prisma.order.create({
    data: {
      addressId: address.id,
      addressSnapshot: {
        detail: address.detail,
        receiverName: address.receiverName,
        receiverPhone: address.receiverPhone,
      },
      orderNo: `MO${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      status: "PENDING_SHIPMENT",
      storeId: store.id,
      totalWeightJin: new Prisma.Decimal("2.00"),
      userId: user.id,
      userPackageId: userPackage.id,
    },
  });

  return {
    address,
    admin,
    store,
    user,
  };
}

describe("member management", () => {
  it("lists members scoped to one store with package, order and address summary", async () => {
    const fixture = await createFixture();
    const otherFixture = await createFixture();

    const result = await (
      memberOperations as typeof memberOperations & {
        listStoreMembers: (input: { storeId: string }) => Promise<{
          items: Array<{
            activePackageCount: number;
            bindingStatus: "ACTIVE" | "DISABLED";
            defaultAddress: { detail: string; receiverPhone: string } | null;
            id: string;
            orderCount: number;
            phone: string | null;
          }>;
          summary: { active: number; disabled: number; total: number };
        }>;
      }
    ).listStoreMembers({ storeId: fixture.store.id });

    expect(result.summary).toEqual({
      active: 1,
      disabled: 0,
      total: 1,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      activePackageCount: 1,
      bindingStatus: "ACTIVE",
      defaultAddress: {
        detail: fixture.address.detail,
        receiverPhone: fixture.address.receiverPhone,
      },
      id: fixture.user.id,
      orderCount: 1,
      phone: "13800002222",
    });
    expect(result.items[0]?.id).not.toBe(otherFixture.user.id);
  });

  it("updates a member store binding and records an admin operation log", async () => {
    const fixture = await createFixture();

    const updated = await (
      memberOperations as typeof memberOperations & {
        updateStoreMember: (input: {
          disabledReason: string;
          operatorId: string;
          remark: string;
          status: "ACTIVE" | "DISABLED";
          storeId: string;
          userId: string;
        }) => Promise<{
          bindingStatus: "ACTIVE" | "DISABLED";
          disabledReason: string | null;
          id: string;
          remark: string | null;
        }>;
      }
    ).updateStoreMember({
      disabledReason: "长期暂停配送",
      operatorId: fixture.admin.id,
      remark: "只在周末联系",
      status: "DISABLED",
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });

    expect(updated).toMatchObject({
      bindingStatus: "DISABLED",
      disabledReason: "长期暂停配送",
      id: fixture.user.id,
      remark: "只在周末联系",
    });

    await expect(
      prisma.adminOperationLog.count({
        where: {
          action: "MEMBER_STORE_BINDING_UPDATED",
          operatorId: fixture.admin.id,
          resourceId: fixture.user.id,
          storeId: fixture.store.id,
        },
      }),
    ).resolves.toBe(1);
  });
});
