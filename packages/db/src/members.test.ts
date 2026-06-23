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
    await prisma.dish.deleteMany({ where: { storeId: { in: storeIds } } });
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
      city: "南京市",
      detail: "会员测试小区 2 栋 202",
      district: "六合区",
      isDefault: true,
      province: "江苏省",
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

  const dish = await prisma.dish.create({
    data: {
      id: `member-dish-${suffix}`,
      category: "FRUIT",
      name: "番茄",
      status: "ON_SALE",
      stepJin: new Prisma.Decimal("0.50"),
      stockJin: new Prisma.Decimal("20.00"),
      storeId: store.id,
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
      items: {
        create: [
          {
            dishId: dish.id,
            dishNameSnapshot: dish.name,
            stepJinSnapshot: new Prisma.Decimal("0.50"),
            weightJin: new Prisma.Decimal("2.00"),
          },
        ],
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
            defaultAddress: {
              city: string | null;
              detail: string;
              district: string | null;
              province: string | null;
              receiverPhone: string;
            } | null;
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
        city: "南京市",
        detail: fixture.address.detail,
        district: "六合区",
        province: "江苏省",
        receiverPhone: fixture.address.receiverPhone,
      },
      id: fixture.user.id,
      orderCount: 1,
      phone: "13800002222",
    });
    expect(result.items[0]?.id).not.toBe(otherFixture.user.id);
  });

  it("gets a store member detail with addresses, packages and recent orders", async () => {
    const fixture = await createFixture();

    const detail = await (
      memberOperations as typeof memberOperations & {
        getStoreMember: (input: {
          storeId: string;
          userId: string;
        }) => Promise<{
          activePackageCount: number;
          addresses: Array<{
            city: string | null;
            detail: string;
            district: string | null;
            id: string;
            isDefault: boolean;
            province: string | null;
          }>;
          bindingStatus: "ACTIVE" | "DISABLED";
          defaultAddress: {
            city: string | null;
            detail: string;
            district: string | null;
            id: string;
            province: string | null;
          } | null;
          id: string;
          latestActivePackage: { remainingTimes: number; totalTimes: number } | null;
          packages: Array<{
            remainingTimes: number;
            status: "ACTIVE" | "FROZEN" | "EXPIRED" | "USED_UP";
            totalTimes: number;
            usedTimes: number;
          }>;
          recentOrders: Array<{
            items: Array<{
              dishNameSnapshot: string;
              weightJin: number;
            }>;
            orderNo: string;
            status: "PENDING_SHIPMENT" | "SHIPPED" | "SIGNED" | "CANCELED" | "VOIDED";
            totalWeightJin: number;
          }>;
        }>;
      }
    ).getStoreMember({
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });

    expect(detail).toMatchObject({
      activePackageCount: 1,
      bindingStatus: "ACTIVE",
      defaultAddress: {
        city: "南京市",
        detail: fixture.address.detail,
        district: "六合区",
        id: fixture.address.id,
        province: "江苏省",
      },
      id: fixture.user.id,
      latestActivePackage: {
        remainingTimes: 7,
        totalTimes: 10,
      },
    });
    expect(detail.addresses).toEqual([
      expect.objectContaining({
        city: "南京市",
        detail: fixture.address.detail,
        district: "六合区",
        id: fixture.address.id,
        isDefault: true,
        province: "江苏省",
      }),
    ]);
    expect(detail.packages).toEqual([
      expect.objectContaining({
        remainingTimes: 7,
        status: "ACTIVE",
        totalTimes: 10,
        usedTimes: 3,
      }),
    ]);
    expect(detail.recentOrders).toEqual([
      expect.objectContaining({
        items: [
          {
            dishNameSnapshot: "番茄",
            weightJin: 2,
          },
        ],
        status: "PENDING_SHIPMENT",
        totalWeightJin: 2,
      }),
    ]);
  });

  it("updates a member store binding and records an admin operation log", async () => {
    const fixture = await createFixture();

    const updated = await (
      memberOperations as typeof memberOperations & {
        updateStoreMember: (input: {
          defaultAddress?: {
            city: string;
            detail: string;
            district: string;
            id: string;
            province: string;
            receiverName: string;
            receiverPhone: string;
          };
          disabledReason: string;
          operatorId: string;
          remark: string;
          status: "ACTIVE" | "DISABLED";
          storeId: string;
          userId: string;
        }) => Promise<{
          bindingStatus: "ACTIVE" | "DISABLED";
          defaultAddress: {
            city: string | null;
            detail: string;
            district: string | null;
            id: string;
            province: string | null;
            receiverName: string;
            receiverPhone: string;
          } | null;
          disabledReason: string | null;
          id: string;
          remark: string | null;
        }>;
      }
    ).updateStoreMember({
      defaultAddress: {
        city: "南京市",
        detail: "龙池街道冠军大通 1 号",
        district: "六合区",
        id: fixture.address.id,
        province: "江苏省",
        receiverName: "徐竹西",
        receiverPhone: "15295081992",
      },
      disabledReason: "长期暂停配送",
      operatorId: fixture.admin.id,
      remark: "只在周末联系",
      status: "DISABLED",
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });

    expect(updated).toMatchObject({
      bindingStatus: "DISABLED",
      defaultAddress: {
        city: "南京市",
        detail: "龙池街道冠军大通 1 号",
        district: "六合区",
        id: fixture.address.id,
        province: "江苏省",
        receiverName: "徐竹西",
        receiverPhone: "15295081992",
      },
      disabledReason: "长期暂停配送",
      id: fixture.user.id,
      remark: "只在周末联系",
    });

    await expect(
      prisma.address.findUniqueOrThrow({
        where: { id: fixture.address.id },
      }),
    ).resolves.toMatchObject({
      city: "南京市",
      detail: "龙池街道冠军大通 1 号",
      district: "六合区",
      province: "江苏省",
      receiverName: "徐竹西",
      receiverPhone: "15295081992",
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

  it("imports members into a store and records an admin operation log", async () => {
    const fixture = await createFixture();
    const phoneSuffix = Date.now().toString().slice(-8);
    const phoneOne = `152${phoneSuffix}`;
    const phoneTwo = `153${phoneSuffix}`;

    const result = await memberOperations.importStoreMembers({
      operatorId: fixture.admin.id,
      rows: [
        {
          nickname: "导入张三",
          phone: phoneOne,
          remark: "8斤周套餐",
        },
        {
          disabledReason: "暂不配送",
          nickname: "导入李四",
          phone: `+86 ${phoneTwo}`,
          status: "DISABLED",
        },
        {
          nickname: "重复会员",
          phone: phoneOne,
        },
        {
          nickname: "错误手机号",
          phone: "123",
        },
      ],
      storeId: fixture.store.id,
    });

    expect(result).toMatchObject({
      createdBindings: 2,
      createdUsers: 2,
      failedRows: 2,
      importedRows: 2,
      totalRows: 4,
      updatedBindings: 0,
    });
    expect(result.failures).toEqual([
      expect.objectContaining({
        phone: phoneOne,
        reason: "同一批次手机号重复",
        rowNumber: 3,
      }),
      expect.objectContaining({
        phone: "123",
        reason: "手机号格式不正确",
        rowNumber: 4,
      }),
    ]);

    const importedUsers = await prisma.user.findMany({
      include: {
        storeBindings: {
          where: { storeId: fixture.store.id },
        },
      },
      where: {
        phone: {
          in: [phoneOne, phoneTwo],
        },
      },
    });
    importedUsers.forEach((user) => createdUserIds.add(user.id));

    expect(importedUsers).toHaveLength(2);
    expect(importedUsers.find((user) => user.phone === phoneOne)).toMatchObject({
      defaultStoreId: fixture.store.id,
      nickname: "导入张三",
      openid: `imported-phone:${phoneOne}`,
      remark: "8斤周套餐",
    });
    expect(
      importedUsers.find((user) => user.phone === phoneTwo)?.storeBindings[0],
    ).toMatchObject({
      source: "member_import",
      status: "DISABLED",
      storeId: fixture.store.id,
    });

    const log = await prisma.adminOperationLog.findFirst({
      where: {
        action: "MEMBER_IMPORT",
        operatorId: fixture.admin.id,
        storeId: fixture.store.id,
      },
    });

    expect(log).toMatchObject({
      resource: "member",
      statusCode: 200,
    });
    expect(log?.afterValue).toMatchObject({
      createdBindings: 2,
      createdUsers: 2,
      failedRows: 2,
      importedRows: 2,
      totalRows: 4,
    });
  });
});
