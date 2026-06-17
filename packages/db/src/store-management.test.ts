import { afterEach, describe, expect, it } from "vitest";

import {
  prisma,
  type AdminUser,
  type Franchisee,
  type Store,
} from "./index";
import * as storeManagement from "./store-management";

type Fixture = {
  operator: AdminUser;
};

const createdAdminIds = new Set<string>();
const createdFranchiseeIds = new Set<string>();
const createdStoreIds = new Set<string>();

async function cleanup() {
  const adminIds = [...createdAdminIds];
  const franchiseeIds = [...createdFranchiseeIds];
  const storeIds = [...createdStoreIds];

  if (adminIds.length || storeIds.length || franchiseeIds.length) {
    await prisma.adminOperationLog.deleteMany({
      where: {
        OR: [
          ...(adminIds.length ? [{ operatorId: { in: adminIds } }] : []),
          ...(storeIds.length ? [{ storeId: { in: storeIds } }] : []),
          ...(storeIds.length ? [{ resourceId: { in: storeIds } }] : []),
          ...(franchiseeIds.length
            ? [{ resourceId: { in: franchiseeIds } }]
            : []),
        ],
      },
    });
  }

  if (storeIds.length) {
    await prisma.adminUserStore.deleteMany({
      where: { storeId: { in: storeIds } },
    });
    await prisma.store.deleteMany({ where: { id: { in: storeIds } } });
  }

  if (franchiseeIds.length) {
    await prisma.franchisee.deleteMany({
      where: { id: { in: franchiseeIds } },
    });
  }

  if (adminIds.length) {
    await prisma.adminUserRole.deleteMany({
      where: { adminUserId: { in: adminIds } },
    });
    await prisma.adminUser.deleteMany({ where: { id: { in: adminIds } } });
  }

  createdAdminIds.clear();
  createdFranchiseeIds.clear();
  createdStoreIds.clear();
}

afterEach(async () => {
  await cleanup();
});

async function createFixture(): Promise<Fixture> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const operatorId = `store-mgmt-operator-${suffix}`;
  createdAdminIds.add(operatorId);

  const operator = await prisma.adminUser.create({
    data: {
      id: operatorId,
      name: "总部运营",
      passwordHash: "not-used",
      status: "ACTIVE",
      username: `store-mgmt-operator-${suffix}`,
    },
  });

  return { operator };
}

describe("store management", () => {
  it("creates and updates franchisees and franchise stores with operation logs", async () => {
    const fixture = await createFixture();

    const franchisee = await (
      storeManagement as typeof storeManagement & {
        createFranchisee: (input: {
          contactName: string;
          contactPhone: string;
          contractEndsAt: Date;
          name: string;
          operatorId: string;
          remark: string;
          status: "ACTIVE";
        }) => Promise<Franchisee>;
      }
    ).createFranchisee({
      contactName: "李加盟",
      contactPhone: "13900001111",
      contractEndsAt: new Date("2028-12-31T15:59:59.000Z"),
      name: "西城社区加盟商",
      operatorId: fixture.operator.id,
      remark: "负责西城社区团购",
      status: "ACTIVE",
    });
    createdFranchiseeIds.add(franchisee.id);

    const store = await (
      storeManagement as typeof storeManagement & {
        createStore: (input: {
          address: string;
          city: string;
          code: string;
          contactName: string;
          contactPhone: string;
          cutoffTime: string;
          district: string;
          franchiseEndsAt: Date;
          franchiseeId: string;
          name: string;
          operatorId: string;
          province: string;
          status: "ACTIVE";
          type: "FRANCHISE";
        }) => Promise<Store>;
      }
    ).createStore({
      address: "西直门外大街 18 号",
      city: "北京市",
      code: `franchise-store-${franchisee.id}`,
      contactName: "王店长",
      contactPhone: "13900002222",
      cutoffTime: "18:30",
      district: "西城区",
      franchiseEndsAt: new Date("2028-12-31T15:59:59.000Z"),
      franchiseeId: franchisee.id,
      name: "西直门加盟店",
      operatorId: fixture.operator.id,
      province: "北京市",
      status: "ACTIVE",
      type: "FRANCHISE",
    });
    createdStoreIds.add(store.id);

    expect(store).toMatchObject({
      code: `franchise-store-${franchisee.id}`,
      contactName: "王店长",
      cutoffTime: "18:30",
      franchiseeId: franchisee.id,
      name: "西直门加盟店",
      status: "ACTIVE",
      type: "FRANCHISE",
    });

    const updatedStore = await storeManagement.updateStore({
      address: "西直门外大街 20 号",
      city: "北京市",
      code: store.code,
      contactName: "赵店长",
      contactPhone: "13900003333",
      cutoffTime: "17:30",
      district: "西城区",
      franchiseEndsAt: new Date("2029-12-31T15:59:59.000Z"),
      franchiseeId: franchisee.id,
      name: "西直门蔬菜加盟店",
      operatorId: fixture.operator.id,
      province: "北京市",
      status: "DISABLED",
      storeId: store.id,
      type: "FRANCHISE",
    });

    expect(updatedStore).toMatchObject({
      contactName: "赵店长",
      name: "西直门蔬菜加盟店",
      status: "DISABLED",
    });

    const updatedFranchisee = await storeManagement.updateFranchisee({
      contactName: "李主管",
      contactPhone: "13900004444",
      contractEndsAt: new Date("2029-12-31T15:59:59.000Z"),
      franchiseeId: franchisee.id,
      name: "西城社区加盟公司",
      operatorId: fixture.operator.id,
      remark: null,
      status: "SUSPENDED",
    });

    expect(updatedFranchisee).toMatchObject({
      contactName: "李主管",
      name: "西城社区加盟公司",
      status: "SUSPENDED",
    });

    const stores = await storeManagement.listStores({
      query: "西直门",
    });
    expect(stores.summary).toMatchObject({
      disabled: 1,
      franchise: 1,
      total: 1,
    });
    expect(stores.items[0]).toMatchObject({
      franchisee: {
        id: franchisee.id,
        name: "西城社区加盟公司",
      },
      id: store.id,
      memberCount: 0,
      orderCount: 0,
    });

    await expect(
      prisma.adminOperationLog.count({
        where: {
          action: {
            in: [
              "FRANCHISEE_CREATED",
              "FRANCHISEE_UPDATED",
              "STORE_CREATED",
              "STORE_UPDATED",
            ],
          },
          operatorId: fixture.operator.id,
        },
      }),
    ).resolves.toBe(4);
  });

  it("filters managed stores by authorized store ids", async () => {
    const fixture = await createFixture();
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const firstStoreId = `store-mgmt-first-${suffix}`;
    const secondStoreId = `store-mgmt-second-${suffix}`;
    createdStoreIds.add(firstStoreId);
    createdStoreIds.add(secondStoreId);

    await prisma.store.createMany({
      data: [
        {
          id: firstStoreId,
          code: firstStoreId,
          contactName: "第一店长",
          contactPhone: "13900005555",
          name: "第一加盟店",
          status: "ACTIVE",
          type: "FRANCHISE",
        },
        {
          id: secondStoreId,
          code: secondStoreId,
          contactName: "第二店长",
          contactPhone: "13900006666",
          name: "第二加盟店",
          status: "ACTIVE",
          type: "FRANCHISE",
        },
      ],
    });

    const stores = await storeManagement.listStores({
      storeIds: [firstStoreId],
    });

    expect(stores.items.map((store) => store.id)).toEqual([firstStoreId]);
    expect(stores.summary).toMatchObject({
      active: 1,
      total: 1,
    });
    expect(stores.items[0]).toMatchObject({
      contactName: "第一店长",
      operatorVisible: true,
    });
  });
});
