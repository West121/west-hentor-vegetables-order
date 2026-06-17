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

  it("keeps address operations scoped to a member store binding", async () => {
    const fixture = await createFixture();

    const address = await addressOperations.createMiniappAddress({
      detail: "本店地址",
      receiverName: "张建国",
      receiverPhone: "13800007777",
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });

    await expect(
      addressOperations.updateMiniappAddress({
        addressId: address.id,
        detail: "跨门店修改",
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
});
