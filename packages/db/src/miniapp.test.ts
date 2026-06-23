import { afterEach, describe, expect, it } from "vitest";

import {
  Prisma,
  prisma,
  type Address,
  type Dish,
  type Store,
  type User,
  type UserPackage,
} from "./index";
import * as miniapp from "./miniapp";

type Fixture = {
  address: Address;
  dish: Dish;
  otherStore: Store;
  pendingOrder: { id: string };
  purchaseTemplate: {
    id: string;
  };
  shippedOrder: { id: string };
  store: Store;
  user: User;
  userPackage: UserPackage;
};

const createdStoreIds = new Set<string>();
const createdUserIds = new Set<string>();
const createdFranchiseeIds = new Set<string>();

async function cleanup() {
  const storeIds = [...createdStoreIds];
  const userIds = [...createdUserIds];

  if (storeIds.length) {
    await prisma.paymentOrder.deleteMany({
      where: { purchaseOrder: { storeId: { in: storeIds } } },
    });
    await prisma.packagePurchaseOrder.deleteMany({
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

  if (createdFranchiseeIds.size) {
    await prisma.franchisee.deleteMany({
      where: { id: { in: [...createdFranchiseeIds] } },
    });
  }

  if (userIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  createdStoreIds.clear();
  createdUserIds.clear();
  createdFranchiseeIds.clear();
}

afterEach(async () => {
  await cleanup();
});

async function createFixture(): Promise<Fixture> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const storeId = `miniapp-test-store-${suffix}`;
  const otherStoreId = `miniapp-other-store-${suffix}`;
  const userId = `miniapp-test-user-${suffix}`;
  const otherUserId = `miniapp-other-user-${suffix}`;
  createdStoreIds.add(storeId);
  createdStoreIds.add(otherStoreId);
  createdUserIds.add(userId);
  createdUserIds.add(otherUserId);

  const store = await prisma.store.create({
    data: {
      id: storeId,
      code: storeId,
      contactName: "小程序店长",
      contactPhone: "13900005555",
      cutoffTime: "18:00",
      name: "小程序测试加盟店",
      status: "ACTIVE",
      type: "FRANCHISE",
    },
  });
  const otherStore = await prisma.store.create({
    data: {
      id: otherStoreId,
      code: otherStoreId,
      contactName: "其他店长",
      contactPhone: "13900006666",
      name: "其他加盟店",
      status: "ACTIVE",
      type: "FRANCHISE",
    },
  });

  const user = await prisma.user.create({
    data: {
      id: userId,
      defaultStoreId: store.id,
      nickname: "小程序张三",
      openid: `miniapp-openid-${suffix}`,
      phone: "13800005555",
    },
  });
  const otherUser = await prisma.user.create({
    data: {
      id: otherUserId,
      defaultStoreId: otherStore.id,
      openid: `miniapp-other-openid-${suffix}`,
      phone: "13800006666",
    },
  });

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

  const address = await prisma.address.create({
    data: {
      id: `miniapp-address-${suffix}`,
      detail: "莲花小区 3 栋 602",
      isDefault: true,
      receiverName: "小程序张三",
      receiverPhone: "13800005555",
      storeId: store.id,
      userId: user.id,
    },
  });

  const template = await prisma.packageTemplate.create({
    data: {
      id: `miniapp-template-${suffix}`,
      name: "8斤周套餐",
      sortOrder: 1,
      status: "ACTIVE",
      storeId: store.id,
      totalTimes: 8,
      validDays: 90,
      weightLimitJin: new Prisma.Decimal("8.00"),
    },
  });
  const purchaseTemplate = await prisma.packageTemplate.create({
    data: {
      id: `miniapp-buy-template-${suffix}`,
      name: "12斤家庭套餐",
      sortOrder: 2,
      status: "ACTIVE",
      storeId: store.id,
      totalTimes: 12,
      validDays: 120,
      weightLimitJin: new Prisma.Decimal("12.00"),
    },
  });
  const otherTemplate = await prisma.packageTemplate.create({
    data: {
      id: `miniapp-other-template-${suffix}`,
      name: "其他门店套餐",
      status: "ACTIVE",
      storeId: otherStore.id,
      totalTimes: 4,
      validDays: 30,
      weightLimitJin: new Prisma.Decimal("4.00"),
    },
  });

  const userPackage = await prisma.userPackage.create({
    data: {
      expiresAt: new Date("2099-12-31T15:59:59.000Z"),
      id: `miniapp-user-package-${suffix}`,
      nameSnapshot: template.name,
      status: "ACTIVE",
      storeId: store.id,
      templateId: template.id,
      totalTimes: 8,
      usedTimes: 2,
      userId: user.id,
      weightLimitJin: new Prisma.Decimal("8.00"),
    },
  });
  await prisma.userPackage.create({
    data: {
      expiresAt: new Date("2099-12-31T15:59:59.000Z"),
      id: `miniapp-other-user-package-${suffix}`,
      nameSnapshot: otherTemplate.name,
      status: "ACTIVE",
      storeId: otherStore.id,
      templateId: otherTemplate.id,
      totalTimes: 4,
      usedTimes: 0,
      userId: otherUser.id,
      weightLimitJin: new Prisma.Decimal("4.00"),
    },
  });

  const dish = await prisma.dish.create({
    data: {
      id: `miniapp-dish-${suffix}`,
      category: "LEAFY",
      name: "菠菜",
      status: "ON_SALE",
      stepJin: new Prisma.Decimal("0.50"),
      stockJin: new Prisma.Decimal("20.00"),
      storeId: store.id,
    },
  });

  const pendingOrder = await prisma.order.create({
    data: {
      addressId: address.id,
      addressSnapshot: {
        detail: address.detail,
        receiverName: address.receiverName,
        receiverPhone: address.receiverPhone,
      },
      items: {
        create: {
          dishId: dish.id,
          dishNameSnapshot: dish.name,
          stepJinSnapshot: dish.stepJin,
          weightJin: new Prisma.Decimal("2.00"),
        },
      },
      orderNo: `MP${Date.now()}A${Math.random().toString(36).slice(2, 6)}`,
      status: "PENDING_SHIPMENT",
      storeId: store.id,
      totalWeightJin: new Prisma.Decimal("2.00"),
      userId: user.id,
      userPackageId: userPackage.id,
    },
  });
  const shippedOrder = await prisma.order.create({
    data: {
      addressId: address.id,
      addressSnapshot: {
        detail: address.detail,
        receiverName: address.receiverName,
        receiverPhone: address.receiverPhone,
      },
      items: {
        create: {
          dishId: dish.id,
          dishNameSnapshot: dish.name,
          stepJinSnapshot: dish.stepJin,
          weightJin: new Prisma.Decimal("1.00"),
        },
      },
      orderNo: `MS${Date.now()}B${Math.random().toString(36).slice(2, 6)}`,
      shippedAt: new Date("2026-06-18T02:00:00.000Z"),
      status: "SHIPPED",
      storeId: store.id,
      totalWeightJin: new Prisma.Decimal("1.00"),
      userId: user.id,
      userPackageId: userPackage.id,
    },
  });
  await prisma.order.create({
    data: {
      addressSnapshot: { detail: "其他门店地址" },
      orderNo: `MO${Date.now()}C${Math.random().toString(36).slice(2, 6)}`,
      status: "PENDING_SHIPMENT",
      storeId: otherStore.id,
      totalWeightJin: new Prisma.Decimal("1.00"),
      userId: otherUser.id,
      userPackageId: `miniapp-other-user-package-${suffix}`,
    },
  });

  return {
    address,
    dish,
    otherStore,
    pendingOrder,
    purchaseTemplate,
    shippedOrder,
    store,
    user,
    userPackage,
  };
}

describe("mini app customer portal", () => {
  it("only resolves stores available to mini app customers", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date("2026-06-18T00:00:00.000Z");
    const activeFranchiseeId = `miniapp-active-franchisee-${suffix}`;
    const suspendedFranchiseeId = `miniapp-suspended-franchisee-${suffix}`;
    const expiredFranchiseeId = `miniapp-expired-franchisee-${suffix}`;
    const directStoreId = `miniapp-direct-store-${suffix}`;
    const activeStoreId = `miniapp-active-store-${suffix}`;
    const suspendedStoreId = `miniapp-suspended-store-${suffix}`;
    const expiredStoreId = `miniapp-expired-store-${suffix}`;
    const expiredContractStoreId = `miniapp-expired-contract-store-${suffix}`;

    createdFranchiseeIds.add(activeFranchiseeId);
    createdFranchiseeIds.add(suspendedFranchiseeId);
    createdFranchiseeIds.add(expiredFranchiseeId);
    createdStoreIds.add(directStoreId);
    createdStoreIds.add(activeStoreId);
    createdStoreIds.add(suspendedStoreId);
    createdStoreIds.add(expiredStoreId);
    createdStoreIds.add(expiredContractStoreId);

    await prisma.franchisee.createMany({
      data: [
        {
          id: activeFranchiseeId,
          contactName: "有效加盟商",
          contactPhone: "13900001000",
          contractEndsAt: new Date("2027-01-01T00:00:00.000Z"),
          name: "有效加盟商",
          status: "ACTIVE",
        },
        {
          id: suspendedFranchiseeId,
          contactName: "暂停加盟商",
          contactPhone: "13900001001",
          contractEndsAt: new Date("2027-01-01T00:00:00.000Z"),
          name: "暂停加盟商",
          status: "SUSPENDED",
        },
        {
          id: expiredFranchiseeId,
          contactName: "到期加盟商",
          contactPhone: "13900001002",
          contractEndsAt: new Date("2026-01-01T00:00:00.000Z"),
          name: "到期加盟商",
          status: "ACTIVE",
        },
      ],
    });
    await prisma.store.createMany({
      data: [
        {
          id: directStoreId,
          code: directStoreId,
          contactName: "直营店长",
          contactPhone: "13900002000",
          name: "直营可用门店",
          status: "ACTIVE",
          type: "DIRECT",
        },
        {
          id: activeStoreId,
          code: activeStoreId,
          contactName: "加盟店长",
          contactPhone: "13900002001",
          franchiseEndsAt: new Date("2027-01-01T00:00:00.000Z"),
          franchiseeId: activeFranchiseeId,
          name: "加盟可用门店",
          status: "ACTIVE",
          type: "FRANCHISE",
        },
        {
          id: suspendedStoreId,
          code: suspendedStoreId,
          contactName: "暂停店长",
          contactPhone: "13900002002",
          franchiseeId: suspendedFranchiseeId,
          name: "暂停加盟门店",
          status: "ACTIVE",
          type: "FRANCHISE",
        },
        {
          id: expiredStoreId,
          code: expiredStoreId,
          contactName: "过期店长",
          contactPhone: "13900002003",
          franchiseeId: expiredFranchiseeId,
          name: "加盟商过期门店",
          status: "ACTIVE",
          type: "FRANCHISE",
        },
        {
          id: expiredContractStoreId,
          code: expiredContractStoreId,
          contactName: "合同过期店长",
          contactPhone: "13900002004",
          franchiseEndsAt: new Date("2026-01-01T00:00:00.000Z"),
          franchiseeId: activeFranchiseeId,
          name: "门店合同过期",
          status: "ACTIVE",
          type: "FRANCHISE",
        },
      ],
    });

    await expect(
      miniapp.findAvailableMiniappStore({ storeCode: directStoreId, now }),
    ).resolves.toMatchObject({ id: directStoreId, type: "DIRECT" });
    await expect(
      miniapp.findAvailableMiniappStore({ storeCode: activeStoreId, now }),
    ).resolves.toMatchObject({
      franchisee: { id: activeFranchiseeId },
      id: activeStoreId,
      type: "FRANCHISE",
    });
    await expect(
      miniapp.findAvailableMiniappStore({ storeCode: suspendedStoreId, now }),
    ).resolves.toBeNull();
    await expect(
      miniapp.findAvailableMiniappStore({ storeCode: expiredStoreId, now }),
    ).resolves.toBeNull();
    await expect(
      miniapp.findAvailableMiniappStore({
        storeCode: expiredContractStoreId,
        now,
      }),
    ).resolves.toBeNull();
  });

  it("returns profile, package and order summaries scoped to one member store", async () => {
    const fixture = await createFixture();

    const profile = await miniapp.getMiniappProfile({
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });
    const orders = await miniapp.listMiniappOrders({
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });
    const packages = await miniapp.listMiniappPackages({
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });

    expect(profile).toMatchObject({
      currentPackage: {
        id: fixture.userPackage.id,
        nameSnapshot: "8斤周套餐",
        remainingTimes: 6,
        status: "ACTIVE",
        weightLimitJin: 8,
      },
      defaultAddress: {
        detail: fixture.address.detail,
        receiverPhone: fixture.address.receiverPhone,
      },
      member: {
        id: fixture.user.id,
        nickname: "小程序张三",
        phone: "13800005555",
      },
      orderSummary: {
        pendingShipment: 1,
        shipped: 1,
        total: 2,
      },
      store: {
        id: fixture.store.id,
        name: "小程序测试加盟店",
      },
    });
    expect(orders.items).toHaveLength(2);
    expect(orders.items[0]).toMatchObject({
      canEdit: true,
      items: [{ dishNameSnapshot: fixture.dish.name, weightJin: 2 }],
      status: "PENDING_SHIPMENT",
      totalWeightJin: 2,
    });
    expect(orders.items[1]).toMatchObject({
      canEdit: false,
      status: "SHIPPED",
      totalWeightJin: 1,
    });
    expect(packages.items).toEqual([
      expect.objectContaining({
        id: fixture.userPackage.id,
        remainingTimes: 6,
        status: "ACTIVE",
      }),
    ]);
    expect(packages.purchaseReserve).toMatchObject({
      enabled: false,
      status: "PAYMENT_NOT_ENABLED",
      templates: [
        expect.objectContaining({ name: "8斤周套餐", weightLimitJin: 8 }),
        expect.objectContaining({ name: "12斤家庭套餐", weightLimitJin: 12 }),
      ],
    });

    const otherStoreOrders = await miniapp.listMiniappOrders({
      storeId: fixture.otherStore.id,
      userId: fixture.user.id,
    });
    expect(otherStoreOrders.items).toHaveLength(0);
  });

  it("returns public store agreement settings for login and profile entry points", async () => {
    const fixture = await createFixture();
    await prisma.store.update({
      where: { id: fixture.store.id },
      data: { type: "DIRECT" },
    });
    await prisma.systemConfig.createMany({
      data: [
        {
          key: "about_text",
          storeId: fixture.store.id,
          value: "莲花小区门店配送范围",
        },
        {
          key: "privacy_policy_url",
          storeId: fixture.store.id,
          value: "https://example.com/privacy",
        },
        {
          key: "login_image_url",
          storeId: fixture.store.id,
          value: "/uploads/login.jpg",
        },
        {
          key: "login_title",
          storeId: fixture.store.id,
          value: "Hentor Fresh",
        },
        {
          key: "login_subtitle",
          storeId: fixture.store.id,
          value: "社区鲜蔬会员",
        },
        {
          key: "login_welcome",
          storeId: fixture.store.id,
          value: "欢迎来到蔬菜预订",
        },
        {
          key: "user_agreement_url",
          storeId: fixture.store.id,
          value: "https://example.com/agreement",
        },
      ],
    });

    await expect(
      miniapp.getMiniappStorePublicSettings({
        storeCode: fixture.store.code,
      }),
    ).resolves.toMatchObject({
      aboutText: "莲花小区门店配送范围",
      loginImageUrl: "/uploads/login.jpg",
      loginSubtitle: "社区鲜蔬会员",
      loginTitle: "Hentor Fresh",
      loginWelcome: "欢迎来到蔬菜预订",
      privacyPolicyUrl: "https://example.com/privacy",
      store: {
        code: fixture.store.code,
        id: fixture.store.id,
      },
      userAgreementUrl: "https://example.com/agreement",
    });
  });

  it("soft-cancels the miniapp account for the current store without deleting history", async () => {
    const fixture = await createFixture();

    const account = await miniapp.cancelMiniappAccount({
      reason: "用户主动注销",
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });

    expect(account).toMatchObject({
      bindingStatus: "DISABLED",
      disabledReason: "用户主动注销",
      status: "DISABLED",
      userId: fixture.user.id,
    });

    await expect(
      prisma.order.count({
        where: {
          storeId: fixture.store.id,
          userId: fixture.user.id,
        },
      }),
    ).resolves.toBeGreaterThan(0);
    await expect(
      miniapp.createMiniappPackagePurchase({
        storeId: fixture.store.id,
        templateId: fixture.purchaseTemplate.id,
        userId: fixture.user.id,
      }),
    ).rejects.toMatchObject({
      code: "MEMBER_DISABLED",
    });
  });

  it("keeps disabled miniapp users locked even if the store binding is active", async () => {
    const fixture = await createFixture();
    await prisma.user.update({
      where: { id: fixture.user.id },
      data: {
        disabledReason: "账号已注销",
        status: "DISABLED",
      },
    });

    await expect(
      miniapp.createMiniappPackagePurchase({
        storeId: fixture.store.id,
        templateId: fixture.purchaseTemplate.id,
        userId: fixture.user.id,
      }),
    ).rejects.toMatchObject({
      code: "MEMBER_DISABLED",
      message: "会员已停用：账号已注销",
    });
  });

  it("lists available member stores and switches the current mini app store", async () => {
    const fixture = await createFixture();
    await prisma.store.updateMany({
      where: { id: { in: [fixture.store.id, fixture.otherStore.id] } },
      data: { type: "DIRECT" },
    });
    await prisma.memberStoreBinding.create({
      data: {
        isDefault: false,
        source: "test-switch",
        status: "ACTIVE",
        storeId: fixture.otherStore.id,
        userId: fixture.user.id,
      },
    });

    const availableStores = await miniapp.listMiniappMemberStores({
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });

    expect(availableStores).toMatchObject({
      currentStore: {
        id: fixture.store.id,
        isCurrent: true,
        isDefault: true,
      },
      stores: [
        expect.objectContaining({
          id: fixture.store.id,
          isCurrent: true,
          isDefault: true,
        }),
        expect.objectContaining({
          id: fixture.otherStore.id,
          isCurrent: false,
          isDefault: false,
        }),
      ],
    });

    const switched = await miniapp.switchMiniappStore({
      storeId: fixture.otherStore.id,
      userId: fixture.user.id,
    });

    expect(switched).toMatchObject({
      id: fixture.otherStore.id,
      isCurrent: true,
      isDefault: true,
    });
    await expect(
      prisma.user.findUniqueOrThrow({
        where: { id: fixture.user.id },
        select: { defaultStoreId: true },
      }),
    ).resolves.toEqual({ defaultStoreId: fixture.otherStore.id });
    await expect(
      prisma.memberStoreBinding.findMany({
        where: { userId: fixture.user.id },
        orderBy: { storeId: "asc" },
        select: { isDefault: true, storeId: true },
      }),
    ).resolves.toEqual([
      { isDefault: true, storeId: fixture.otherStore.id },
      { isDefault: false, storeId: fixture.store.id },
    ]);
  });

  it("rejects switching to a store that is not bound to the member", async () => {
    const fixture = await createFixture();
    await prisma.store.update({
      where: { id: fixture.otherStore.id },
      data: { type: "DIRECT" },
    });

    await expect(
      miniapp.switchMiniappStore({
        storeId: fixture.otherStore.id,
        userId: fixture.user.id,
      }),
    ).rejects.toMatchObject({
      code: "STORE_BINDING_NOT_FOUND",
      message: "当前会员未绑定该门店",
    } satisfies Partial<miniapp.MiniappServiceError>);
  });

  it("returns disabled member state and reason in the mini app profile", async () => {
    const fixture = await createFixture();
    await prisma.user.update({
      where: { id: fixture.user.id },
      data: { disabledReason: "后台暂停服务" },
    });
    await prisma.memberStoreBinding.updateMany({
      where: {
        storeId: fixture.store.id,
        userId: fixture.user.id,
      },
      data: { status: "DISABLED" },
    });

    const profile = await miniapp.getMiniappProfile({
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });

    expect(profile).toMatchObject({
      member: {
        bindingStatus: "DISABLED",
        disabledReason: "后台暂停服务",
        id: fixture.user.id,
        nickname: "小程序张三",
        phone: "13800005555",
      },
      store: {
        id: fixture.store.id,
        name: "小程序测试加盟店",
      },
    });
  });

  it("returns a frozen current package for home state when no active package is available", async () => {
    const fixture = await createFixture();
    await prisma.userPackage.update({
      where: { id: fixture.userPackage.id },
      data: {
        frozenReason: "后台冻结测试",
        status: "FROZEN",
      },
    });

    const currentPackage = await (
      miniapp as typeof miniapp & {
        getMiniappCurrentPackage: (input: {
          now: Date;
          storeId: string;
          userId: string;
        }) => Promise<{
          frozenReason: string | null;
          id: string;
          remainingTimes: number;
          status: string;
        } | null>;
      }
    ).getMiniappCurrentPackage({
      now: new Date("2026-06-18T00:00:00.000Z"),
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });

    expect(currentPackage).toMatchObject({
      frozenReason: "后台冻结测试",
      id: fixture.userPackage.id,
      remainingTimes: 6,
      status: "FROZEN",
    });
  });

  it("uses the earliest active package with remaining times as the current package", async () => {
    const fixture = await createFixture();
    const newerPackage = await prisma.userPackage.create({
      data: {
        expiresAt: new Date("2099-12-31T15:59:59.000Z"),
        id: `${fixture.userPackage.id}-newer`,
        nameSnapshot: "新开通套餐",
        status: "ACTIVE",
        storeId: fixture.store.id,
        templateId: fixture.userPackage.templateId,
        totalTimes: 8,
        usedTimes: 0,
        userId: fixture.user.id,
        weightLimitJin: new Prisma.Decimal("8.00"),
      },
    });

    const currentPackage = await miniapp.getMiniappCurrentPackage({
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });

    expect(currentPackage?.id).toBe(fixture.userPackage.id);
    expect(currentPackage?.id).not.toBe(newerPackage.id);
  });

  it("skips an older active package after its times are used up", async () => {
    const fixture = await createFixture();
    const newerPackage = await prisma.userPackage.create({
      data: {
        expiresAt: new Date("2099-12-31T15:59:59.000Z"),
        id: `${fixture.userPackage.id}-newer-usable`,
        nameSnapshot: "后续套餐",
        status: "ACTIVE",
        storeId: fixture.store.id,
        templateId: fixture.userPackage.templateId,
        totalTimes: 8,
        usedTimes: 0,
        userId: fixture.user.id,
        weightLimitJin: new Prisma.Decimal("8.00"),
      },
    });
    await prisma.userPackage.update({
      data: { usedTimes: fixture.userPackage.totalTimes },
      where: { id: fixture.userPackage.id },
    });

    const currentPackage = await miniapp.getMiniappCurrentPackage({
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });

    expect(currentPackage?.id).toBe(newerPackage.id);
  });

  it("loads a specific pending reservation for editing from the home page", async () => {
    const fixture = await createFixture();
    const laterPendingOrder = await prisma.order.create({
      data: {
        addressId: fixture.address.id,
        addressSnapshot: {
          detail: fixture.address.detail,
          receiverName: fixture.address.receiverName,
          receiverPhone: fixture.address.receiverPhone,
        },
        items: {
          create: {
            dishId: fixture.dish.id,
            dishNameSnapshot: fixture.dish.name,
            stepJinSnapshot: fixture.dish.stepJin,
            weightJin: new Prisma.Decimal("3.00"),
          },
        },
        orderNo: `ME${Date.now()}D${Math.random().toString(36).slice(2, 6)}`,
        status: "PENDING_SHIPMENT",
        storeId: fixture.store.id,
        totalWeightJin: new Prisma.Decimal("3.00"),
        userId: fixture.user.id,
        userPackageId: fixture.userPackage.id,
      },
    });

    const latest = await miniapp.getMiniappEditableOrder({
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });
    const requested = await miniapp.getMiniappEditableOrder({
      orderId: fixture.pendingOrder.id,
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });
    const shipped = await miniapp.getMiniappEditableOrder({
      orderId: fixture.shippedOrder.id,
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });
    const crossStore = await miniapp.getMiniappEditableOrder({
      orderId: fixture.pendingOrder.id,
      storeId: fixture.otherStore.id,
      userId: fixture.user.id,
    });
    const tomorrow = await miniapp.getMiniappEditableOrder({
      now: new Date(Date.now() + 24 * 60 * 60 * 1000),
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });

    expect(latest).toMatchObject({
      id: laterPendingOrder.id,
      items: [{ dishId: fixture.dish.id, weightJin: 3 }],
      totalWeightJin: 3,
    });
    expect(requested).toMatchObject({
      id: fixture.pendingOrder.id,
      items: [{ dishId: fixture.dish.id, weightJin: 2 }],
      totalWeightJin: 2,
    });
    expect(shipped).toBeNull();
    expect(crossStore).toBeNull();
    expect(tomorrow).toBeNull();
  });

  it("cancels pending orders and lets members hide canceled orders", async () => {
    const fixture = await createFixture();
    await Promise.all([
      prisma.userPackage.update({
        where: { id: fixture.userPackage.id },
        data: { usedTimes: 3 },
      }),
      prisma.dish.update({
        where: { id: fixture.dish.id },
        data: { stockJin: new Prisma.Decimal("18.00") },
      }),
    ]);

    const canceled = await miniapp.cancelMiniappOrder({
      orderId: fixture.pendingOrder.id,
      reason: "今天不在家",
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });

    expect(canceled).toMatchObject({
      cancelReason: "今天不在家",
      id: fixture.pendingOrder.id,
      status: "CANCELED",
    });
    await expect(
      prisma.userPackage.findUniqueOrThrow({
        where: { id: fixture.userPackage.id },
      }),
    ).resolves.toMatchObject({ usedTimes: 2 });
    expect(
      Number(
        (
          await prisma.dish.findUniqueOrThrow({
            where: { id: fixture.dish.id },
          })
        ).stockJin,
      ),
    ).toBe(20);

    await expect(
      miniapp.cancelMiniappOrder({
        orderId: fixture.shippedOrder.id,
        reason: "想取消已发货",
        storeId: fixture.store.id,
        userId: fixture.user.id,
      }),
    ).rejects.toMatchObject({
      code: "ORDER_NOT_CANCELABLE",
      message: "当前订单不可取消",
    });

    const hidden = await miniapp.hideMiniappOrder({
      orderId: fixture.pendingOrder.id,
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });
    expect(hidden.deletedByUserAt).toBeInstanceOf(Date);

    const orders = await miniapp.listMiniappOrders({
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });
    expect(orders.items.map((order) => order.id)).not.toContain(
      fixture.pendingOrder.id,
    );
  });

  it("blocks disabled members from canceling pending orders", async () => {
    const fixture = await createFixture();
    await Promise.all([
      prisma.user.update({
        where: { id: fixture.user.id },
        data: { disabledReason: "暂停履约操作" },
      }),
      prisma.memberStoreBinding.updateMany({
        where: {
          storeId: fixture.store.id,
          userId: fixture.user.id,
        },
        data: { status: "DISABLED" },
      }),
      prisma.userPackage.update({
        where: { id: fixture.userPackage.id },
        data: { usedTimes: 3 },
      }),
      prisma.dish.update({
        where: { id: fixture.dish.id },
        data: { stockJin: new Prisma.Decimal("18.00") },
      }),
    ]);

    await expect(
      miniapp.cancelMiniappOrder({
        orderId: fixture.pendingOrder.id,
        reason: "今天不在家",
        storeId: fixture.store.id,
        userId: fixture.user.id,
      }),
    ).rejects.toMatchObject({
      code: "MEMBER_DISABLED",
      message: "会员已停用：暂停履约操作",
    });

    await expect(
      prisma.order.findUniqueOrThrow({
        where: { id: fixture.pendingOrder.id },
      }),
    ).resolves.toMatchObject({ status: "PENDING_SHIPMENT" });
    await expect(
      prisma.userPackage.findUniqueOrThrow({
        where: { id: fixture.userPackage.id },
      }),
    ).resolves.toMatchObject({ usedTimes: 3 });
    expect(
      Number(
        (
          await prisma.dish.findUniqueOrThrow({
            where: { id: fixture.dish.id },
          })
        ).stockJin,
      ),
    ).toBe(18);
  });

  it("reserves package purchase intent without enabling WeChat payment yet", async () => {
    const fixture = await createFixture();

    const purchase = await miniapp.createMiniappPackagePurchase({
      storeId: fixture.store.id,
      templateId: fixture.purchaseTemplate.id,
      userId: fixture.user.id,
    });
    const prepay = await miniapp.reserveMiniappWechatPrepay({
      purchaseOrderId: purchase.id,
      storeId: fixture.store.id,
      userId: fixture.user.id,
    });

    expect(purchase).toMatchObject({
      amountFen: 0,
      payChannel: "WECHAT",
      status: "PAYMENT_NOT_ENABLED",
      storeId: fixture.store.id,
      templateId: fixture.purchaseTemplate.id,
      userId: fixture.user.id,
    });
    expect(prepay).toMatchObject({
      id: purchase.id,
      status: "PAYMENT_NOT_ENABLED",
    });

    await prisma.memberStoreBinding.create({
      data: {
        source: "test-cross-store",
        status: "ACTIVE",
        storeId: fixture.otherStore.id,
        userId: fixture.user.id,
      },
    });
    await expect(
      miniapp.createMiniappPackagePurchase({
        storeId: fixture.otherStore.id,
        templateId: fixture.purchaseTemplate.id,
        userId: fixture.user.id,
      }),
    ).rejects.toMatchObject({
      code: "PACKAGE_TEMPLATE_NOT_FOUND",
      message: "套餐模板不存在或已停用",
    });
  });

  it("blocks package purchase intents for disabled or unbound members", async () => {
    const fixture = await createFixture();

    await prisma.user.update({
      where: { id: fixture.user.id },
      data: { disabledReason: "暂停购买套餐" },
    });
    await prisma.memberStoreBinding.updateMany({
      where: {
        storeId: fixture.store.id,
        userId: fixture.user.id,
      },
      data: { status: "DISABLED" },
    });

    await expect(
      miniapp.createMiniappPackagePurchase({
        storeId: fixture.store.id,
        templateId: fixture.purchaseTemplate.id,
        userId: fixture.user.id,
      }),
    ).rejects.toMatchObject({
      code: "MEMBER_DISABLED",
      message: "会员已停用：暂停购买套餐",
    });

    await prisma.memberStoreBinding.deleteMany({
      where: {
        storeId: fixture.store.id,
        userId: fixture.user.id,
      },
    });

    await expect(
      miniapp.createMiniappPackagePurchase({
        storeId: fixture.store.id,
        templateId: fixture.purchaseTemplate.id,
        userId: fixture.user.id,
      }),
    ).rejects.toMatchObject({
      code: "STORE_REQUIRED",
      message: "请先绑定当前门店后再购买套餐",
    });
  });

  it("blocks package prepay reservations for disabled or unbound members", async () => {
    const fixture = await createFixture();

    const purchase = await miniapp.createMiniappPackagePurchase({
      storeId: fixture.store.id,
      templateId: fixture.purchaseTemplate.id,
      userId: fixture.user.id,
    });

    await prisma.user.update({
      where: { id: fixture.user.id },
      data: { disabledReason: "暂停支付套餐" },
    });
    await prisma.memberStoreBinding.updateMany({
      where: {
        storeId: fixture.store.id,
        userId: fixture.user.id,
      },
      data: { status: "DISABLED" },
    });

    await expect(
      miniapp.reserveMiniappWechatPrepay({
        purchaseOrderId: purchase.id,
        storeId: fixture.store.id,
        userId: fixture.user.id,
      }),
    ).rejects.toMatchObject({
      code: "MEMBER_DISABLED",
      message: "会员已停用：暂停支付套餐",
    });

    await prisma.memberStoreBinding.deleteMany({
      where: {
        storeId: fixture.store.id,
        userId: fixture.user.id,
      },
    });

    await expect(
      miniapp.reserveMiniappWechatPrepay({
        purchaseOrderId: purchase.id,
        storeId: fixture.store.id,
        userId: fixture.user.id,
      }),
    ).rejects.toMatchObject({
      code: "STORE_REQUIRED",
      message: "请先绑定当前门店后再支付套餐",
    });
  });
});
