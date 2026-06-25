import { afterEach, describe, expect, it } from "vitest";

import {
  prisma,
  type Address,
  type Store,
  type User,
} from "./index";
import * as addressOperations from "./addresses";

type Fixture = {
  otherStore: Store;
  otherUser: User;
  store: Store;
  user: User;
};

const createdStoreIds = new Set<string>();
const createdUserIds = new Set<string>();

async function cleanup() {
  const storeIds = [...createdStoreIds];
  const userIds = [...createdUserIds];

  if (storeIds.length) {
    await prisma.orderItem.deleteMany({
      where: { order: { storeId: { in: storeIds } } },
    });
    await prisma.order.deleteMany({ where: { storeId: { in: storeIds } } });
    await prisma.address.deleteMany({ where: { storeId: { in: storeIds } } });
    await prisma.memberStoreBinding.deleteMany({
      where: { storeId: { in: storeIds } },
    });
    await prisma.store.deleteMany({ where: { id: { in: storeIds } } });
  }

  if (userIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  createdStoreIds.clear();
  createdUserIds.clear();
}

afterEach(async () => {
  await cleanup();
});

async function createFixture(): Promise<Fixture> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const storeId = `address-test-store-${suffix}`;
  const otherStoreId = `address-test-other-store-${suffix}`;
  const userId = `address-test-user-${suffix}`;
  const otherUserId = `address-test-other-user-${suffix}`;
  createdStoreIds.add(storeId);
  createdStoreIds.add(otherStoreId);
  createdUserIds.add(userId);
  createdUserIds.add(otherUserId);

  const [store, otherStore] = await Promise.all([
    prisma.store.create({
      data: {
        id: storeId,
        code: storeId,
        contactName: "地址店长",
        contactPhone: "13900007777",
        name: "地址测试加盟店",
        status: "ACTIVE",
        type: "FRANCHISE",
      },
    }),
    prisma.store.create({
      data: {
        id: otherStoreId,
        code: otherStoreId,
        contactName: "其他店长",
        contactPhone: "13900008888",
        name: "其他地址加盟店",
        status: "ACTIVE",
        type: "FRANCHISE",
      },
    }),
  ]);

  const [user, otherUser] = await Promise.all([
    prisma.user.create({
      data: {
        id: userId,
        defaultStoreId: store.id,
        openid: `address-openid-${suffix}`,
        phone: "13800007777",
      },
    }),
    prisma.user.create({
      data: {
        id: otherUserId,
        defaultStoreId: otherStore.id,
        openid: `address-other-openid-${suffix}`,
        phone: "13800008888",
      },
    }),
  ]);

  await prisma.memberStoreBinding.createMany({
    data: [
      {
        isDefault: true,
        source: "test",
        status: "ACTIVE",
        storeId: store.id,
        userId: user.id,
      },
      {
        isDefault: true,
        source: "test",
        status: "ACTIVE",
        storeId: otherStore.id,
        userId: otherUser.id,
      },
    ],
  });

  return { otherStore, otherUser, store, user };
}

describe("miniapp address management", () => {
  it("creates the first address as default and switches default addresses", async () => {
    const fixture = await createFixture();

    const first = await (
      addressOperations as typeof addressOperations & {
        createMiniappAddress: (input: {
          detail: string;
          isDefault?: boolean;
          receiverName: string;
          receiverPhone: string;
          storeId: string;
          userId: string;
        }) => Promise<Address>;
      }
    ).createMiniappAddress({
      detail: "莲花小区 3 栋 602",
      receiverName: "张建国",
      receiverPhone: "13800007777",
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });

    expect(first.isDefault).toBe(true);

    const second = await addressOperations.createMiniappAddress({
      city: "北京市",
      detail: "望京街道 10 号院 1 栋 101",
      district: "朝阳区",
      isDefault: true,
      province: "北京市",
      receiverName: "张建国",
      receiverPhone: "13800007777",
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });

    expect(second.isDefault).toBe(true);
    await expect(
      prisma.address.findUniqueOrThrow({ where: { id: first.id } }),
    ).resolves.toMatchObject({ isDefault: false });

    const updatedFirst = await addressOperations.updateMiniappAddress({
      addressId: first.id,
      detail: "莲花小区 3 栋 603",
      isDefault: true,
      receiverName: "张建国",
      receiverPhone: "13800009999",
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });

    expect(updatedFirst).toMatchObject({
      detail: "莲花小区 3 栋 603",
      isDefault: true,
      receiverPhone: "13800009999",
    });
    await expect(
      prisma.address.findUniqueOrThrow({ where: { id: second.id } }),
    ).resolves.toMatchObject({ isDefault: false });

    const list = await addressOperations.listMiniappAddresses({
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });

    expect(list.items.map((item) => item.id)).toEqual([first.id, second.id]);
    expect(list.defaultAddress?.id).toBe(first.id);
  });

  it("sets an existing address as default without requiring full address fields", async () => {
    const fixture = await createFixture();

    const first = await addressOperations.createMiniappAddress({
      detail: "莲花小区 3 栋 602",
      receiverName: "张建国",
      receiverPhone: "13800007777",
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });
    const second = await addressOperations.createMiniappAddress({
      detail: "望京街道 10 号院 1 栋 101",
      receiverName: "张建国",
      receiverPhone: "13800007777",
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });

    const updated = await (
      addressOperations as typeof addressOperations & {
        setDefaultMiniappAddress: (input: {
          addressId: string;
          storeId: string;
          userId: string;
        }) => Promise<Address>;
      }
    ).setDefaultMiniappAddress({
      addressId: second.id,
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });

    expect(updated).toMatchObject({
      detail: "望京街道 10 号院 1 栋 101",
      id: second.id,
      isDefault: true,
    });
    await expect(
      prisma.address.findUniqueOrThrow({ where: { id: first.id } }),
    ).resolves.toMatchObject({ isDefault: false });

    await expect(
      (
        addressOperations as typeof addressOperations & {
          setDefaultMiniappAddress: (input: {
            addressId: string;
            storeId: string;
            userId: string;
          }) => Promise<Address>;
        }
      ).setDefaultMiniappAddress({
        addressId: second.id,
        storeId: fixture.otherStore.id,
        userId: fixture.user.id,
      }),
    ).rejects.toMatchObject({
      code: "MEMBER_STORE_NOT_FOUND",
    });
  });

  it("rejects addresses outside the store delivery province or city", async () => {
    const fixture = await createFixture();

    const legacyAddress = await addressOperations.createMiniappAddress({
      city: "杭州市",
      detail: "西湖区文三路 88 号 1 栋 101",
      district: "西湖区",
      province: "浙江省",
      receiverName: "张建国",
      receiverPhone: "13800007777",
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });

    await prisma.store.update({
      where: { id: fixture.store.id },
      data: {
        deliveryCities: ["南京市"],
        deliveryProvinces: ["江苏省"],
      },
    });

    await expect(
      addressOperations.createMiniappAddress({
        city: "杭州市",
        detail: "西湖区文三路 99 号 1 栋 101",
        district: "西湖区",
        province: "浙江省",
        receiverName: "张建国",
        receiverPhone: "13800007777",
        storeId: fixture.store.id,
        userId: fixture.user.id,
      }),
    ).rejects.toMatchObject({
      code: "ADDRESS_OUT_OF_DELIVERY_RANGE",
      message: "当前门店仅配送：江苏省",
    });

    const allowedAddress = await addressOperations.createMiniappAddress({
      city: "南京市",
      detail: "六合区龙池街道 1 号 3 栋 602",
      district: "六合区",
      isDefault: true,
      province: "江苏省",
      receiverName: "张建国",
      receiverPhone: "13800007777",
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });

    expect(allowedAddress.isDefault).toBe(true);

    await expect(
      addressOperations.updateMiniappAddress({
        addressId: allowedAddress.id,
        city: "苏州市",
        detail: "姑苏区平江路 10 号 1 栋 101",
        district: "姑苏区",
        province: "江苏省",
        receiverName: "张建国",
        receiverPhone: "13800007777",
        storeId: fixture.store.id,
        userId: fixture.user.id,
      }),
    ).rejects.toMatchObject({
      code: "ADDRESS_OUT_OF_DELIVERY_RANGE",
      message: "当前门店仅配送城市：南京市",
    });

    await expect(
      addressOperations.setDefaultMiniappAddress({
        addressId: legacyAddress.id,
        storeId: fixture.store.id,
        userId: fixture.user.id,
      }),
    ).rejects.toMatchObject({
      code: "ADDRESS_OUT_OF_DELIVERY_RANGE",
    });
  });

  it("keeps address operations scoped to a member store binding", async () => {
    const fixture = await createFixture();

    const address = await addressOperations.createMiniappAddress({
      detail: "莲花小区 3 栋 602",
      receiverName: "张建国",
      receiverPhone: "13800007777",
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });

    await expect(
      addressOperations.updateMiniappAddress({
        addressId: address.id,
        detail: "跨门店修改地址 1 栋 101",
        receiverName: "张建国",
        receiverPhone: "13800007777",
        storeId: fixture.otherStore.id,
        userId: fixture.user.id,
      }),
    ).rejects.toMatchObject({
      code: "MEMBER_STORE_NOT_FOUND",
      message: "当前门店会员不存在",
    });

    await expect(
      addressOperations.listMiniappAddresses({
        storeId: fixture.otherStore.id,
        userId: fixture.user.id,
      }),
    ).rejects.toMatchObject({
      code: "MEMBER_STORE_NOT_FOUND",
    });
  });

  it("returns a disabled-member error with reason for address operations", async () => {
    const fixture = await createFixture();
    await prisma.user.update({
      where: { id: fixture.user.id },
      data: { disabledReason: "暂停配送" },
    });
    await prisma.memberStoreBinding.updateMany({
      where: {
        storeId: fixture.store.id,
        userId: fixture.user.id,
      },
      data: { status: "DISABLED" },
    });

    await expect(
      addressOperations.createMiniappAddress({
        detail: "停用后新增配送地址",
        receiverName: "张建国",
        receiverPhone: "13800007777",
        storeId: fixture.store.id,
        userId: fixture.user.id,
      }),
    ).rejects.toMatchObject({
      code: "MEMBER_DISABLED",
      message: "会员已停用：暂停配送",
    });

    await expect(
      addressOperations.listMiniappAddresses({
        storeId: fixture.store.id,
        userId: fixture.user.id,
      }),
    ).rejects.toMatchObject({
      code: "MEMBER_DISABLED",
      message: "会员已停用：暂停配送",
    });
  });

  it("validates phone, enforces address limit and deletes addresses safely", async () => {
    const fixture = await createFixture();

    await expect(
      addressOperations.createMiniappAddress({
        detail: "3栋602",
        receiverName: "张建国",
        receiverPhone: "13800007777",
        storeId: fixture.store.id,
        userId: fixture.user.id,
      }),
    ).resolves.toMatchObject({
      address: expect.objectContaining({
        detail: "3栋602",
      }),
    });
    await expect(
      prisma.address.count({
        where: { storeId: fixture.store.id, userId: fixture.user.id },
      }),
    ).resolves.toBe(1);

    await expect(
      addressOperations.createMiniappAddress({
        detail: "手机号错误地址",
        receiverName: "张建国",
        receiverPhone: "12345",
        storeId: fixture.store.id,
        userId: fixture.user.id,
      }),
    ).rejects.toMatchObject({
      code: "RECEIVER_PHONE_INVALID",
      message: "请输入正确的手机号",
    });

    const created: Address[] = [];
    for (let index = 0; index < 10; index += 1) {
      created.push(
        await addressOperations.createMiniappAddress({
          detail: `莲花小区 ${index + 1} 栋 101`,
          isDefault: index === 0,
          receiverName: "张建国",
          receiverPhone: "13800007777",
          storeId: fixture.store.id,
          userId: fixture.user.id,
        }),
      );
    }

    await expect(
      addressOperations.createMiniappAddress({
        detail: "第 11 个测试地址 101",
        receiverName: "张建国",
        receiverPhone: "13800007777",
        storeId: fixture.store.id,
        userId: fixture.user.id,
      }),
    ).rejects.toMatchObject({
      code: "ADDRESS_LIMIT_EXCEEDED",
      message: "最多只能保存 10 条地址",
    });

    const deleted = await (
      addressOperations as typeof addressOperations & {
        deleteMiniappAddress: (input: {
          addressId: string;
          storeId: string;
          userId: string;
        }) => Promise<{ id: string }>;
      }
    ).deleteMiniappAddress({
      addressId: created[0]!.id,
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });

    expect(deleted.id).toBe(created[0]!.id);
    await expect(
      prisma.address.findUnique({ where: { id: created[0]!.id } }),
    ).resolves.toBeNull();
    await expect(
      prisma.address.count({
        where: { storeId: fixture.store.id, userId: fixture.user.id },
      }),
    ).resolves.toBe(9);

    const list = await addressOperations.listMiniappAddresses({
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });
    expect(list.defaultAddress).not.toBeNull();
    expect(list.items.filter((item) => item.isDefault)).toHaveLength(1);
  });
});
