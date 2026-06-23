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
          deliveryCities: string[];
          deliveryProvinces: string[];
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
      deliveryCities: ["北京市"],
      deliveryProvinces: ["北京市"],
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
      deliveryCities: ["北京市", "天津市", "北京市"],
      deliveryProvinces: ["北京市"],
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
      deliveryCities: ["北京市", "天津市"],
      deliveryProvinces: ["北京市"],
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
      deliveryCities: ["北京市", "天津市"],
      deliveryProvinces: ["北京市"],
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

  it("rejects invalid store cutoff time without writing a store", async () => {
    const fixture = await createFixture();

    await expect(
      storeManagement.createStore({
        address: "和平路 1 号",
        city: "南京市",
        code: `invalid-cutoff-${Date.now()}`,
        contactName: "截单店长",
        contactPhone: "13900009999",
        cutoffTime: "99:99",
        district: "玄武区",
        name: "非法截单门店",
        operatorId: fixture.operator.id,
        province: "江苏省",
        status: "ACTIVE",
        type: "DIRECT",
      }),
    ).rejects.toMatchObject({
      code: "CUTOFF_TIME_INVALID",
      message: "截单时间不正确",
    } satisfies Partial<storeManagement.StoreManagementServiceError>);

    await expect(
      prisma.store.count({ where: { name: "非法截单门店" } }),
    ).resolves.toBe(0);
  });

  it("gets franchisee and store details for multi-store management", async () => {
    const fixture = await createFixture();

    const franchisee = await storeManagement.createFranchisee({
      contactName: "周加盟",
      contactPhone: "13900007777",
      contractEndsAt: new Date("2029-12-31T15:59:59.000Z"),
      name: "东城社区加盟商",
      operatorId: fixture.operator.id,
      remark: "东城片区",
      status: "ACTIVE",
    });
    createdFranchiseeIds.add(franchisee.id);

    const store = await storeManagement.createStore({
      address: "东四十条 88 号",
      city: "北京市",
      code: `detail-store-${franchisee.id}`,
      contactName: "陈店长",
      contactPhone: "13900008888",
      cutoffTime: "18:00",
      district: "东城区",
      franchiseEndsAt: new Date("2029-12-31T15:59:59.000Z"),
      franchiseeId: franchisee.id,
      name: "东四蔬菜加盟店",
      operatorId: fixture.operator.id,
      province: "北京市",
      status: "ACTIVE",
      type: "FRANCHISE",
    });
    createdStoreIds.add(store.id);

    const franchiseeDetail = await (
      storeManagement as typeof storeManagement & {
        getFranchisee: (input: { franchiseeId: string }) => Promise<{
          id: string;
          name: string;
          storeCount: number;
          stores: Array<{ id: string; name: string; status: "ACTIVE" | "DISABLED" }>;
        }>;
      }
    ).getFranchisee({ franchiseeId: franchisee.id });

    expect(franchiseeDetail).toMatchObject({
      id: franchisee.id,
      name: "东城社区加盟商",
      storeCount: 1,
    });
    expect(franchiseeDetail.stores).toEqual([
      expect.objectContaining({
        id: store.id,
        name: store.name,
        status: "ACTIVE",
      }),
    ]);

    const storeDetail = await (
      storeManagement as typeof storeManagement & {
        getStore: (input: { storeId: string }) => Promise<{
          adminUserCount: number;
          franchisee: { id: string; name: string } | null;
          id: string;
          memberCount: number;
          name: string;
          orderCount: number;
          packageTemplateCount: number;
        }>;
      }
    ).getStore({ storeId: store.id });

    expect(storeDetail).toMatchObject({
      adminUserCount: 0,
      franchisee: {
        id: franchisee.id,
        name: franchisee.name,
      },
      id: store.id,
      memberCount: 0,
      name: store.name,
      orderCount: 0,
      packageTemplateCount: 0,
    });
  });
});
