import { afterEach, describe, expect, it } from "vitest";

import { Prisma, prisma, type AdminUser, type Store } from "./index";
import {
  getSystemSettings,
  SystemSettingsServiceError,
  updateSystemSettings,
} from "./system-settings";

type Fixture = {
  admin: AdminUser;
  store: Store;
};

const createdStoreIds = new Set<string>();
const createdAdminIds = new Set<string>();

async function cleanup() {
  const storeIds = [...createdStoreIds];
  const adminIds = [...createdAdminIds];

  if (storeIds.length) {
    await prisma.adminOperationLog.deleteMany({
      where: { storeId: { in: storeIds } },
    });
    await prisma.systemConfig.deleteMany({
      where: { storeId: { in: storeIds } },
    });
    await prisma.store.deleteMany({ where: { id: { in: storeIds } } });
  }

  if (adminIds.length) {
    await prisma.adminUser.deleteMany({ where: { id: { in: adminIds } } });
  }

  createdStoreIds.clear();
  createdAdminIds.clear();
}

afterEach(async () => {
  await cleanup();
});

async function createFixture(): Promise<Fixture> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const storeId = `system-settings-store-${suffix}`;
  const adminId = `system-settings-admin-${suffix}`;
  createdStoreIds.add(storeId);
  createdAdminIds.add(adminId);

  const [store, admin] = await Promise.all([
    prisma.store.create({
      data: {
        id: storeId,
        code: `settings-${suffix}`,
        contactName: "系统店长",
        contactPhone: "13900001111",
        customerServiceTel: "400-100-2000",
        cutoffTime: "18:00",
        name: "系统设置测试店",
        status: "ACTIVE",
        type: "DIRECT",
      },
    }),
    prisma.adminUser.create({
      data: {
        id: adminId,
        name: "系统管理员",
        passwordHash: "not-used",
        status: "ACTIVE",
        username: `settings-admin-${suffix}`,
      },
    }),
  ]);

  return { admin, store };
}

describe("system settings", () => {
  it("reads store settings together with persisted text and policy links", async () => {
    const fixture = await createFixture();
    await prisma.systemConfig.createMany({
      data: [
        {
          key: "about_text",
          storeId: fixture.store.id,
          value: "社区蔬菜配送说明",
        },
        {
          key: "privacy_policy_url",
          storeId: fixture.store.id,
          value: "https://example.com/privacy",
        },
      ],
    });

    await expect(
      getSystemSettings({ storeId: fixture.store.id }),
    ).resolves.toMatchObject({
      aboutText: "社区蔬菜配送说明",
      cutoffTime: "18:00",
      customerServiceTel: "400-100-2000",
      deliveryCities: [],
      deliveryProvinces: [],
      loginImageUrl: "",
      loginSubtitle: "",
      loginTitle: "",
      loginWelcome: "",
      privacyPolicyUrl: "https://example.com/privacy",
      userAgreementUrl: "",
    });
  });

  it("updates store settings and config values with an operation log", async () => {
    const fixture = await createFixture();

    const settings = await updateSystemSettings({
      aboutText: "门店配送范围：莲花小区。",
      cutoffTime: "17:30",
      customerServiceTel: "400-222-3333",
      deliveryCities: ["南京市", "合肥市", "南京市"],
      deliveryProvinces: ["江苏省", "安徽省"],
      loginImageUrl: "/uploads/login.jpg",
      loginSubtitle: "社区鲜蔬会员",
      loginTitle: "Hentor Fresh",
      loginWelcome: "欢迎来到蔬菜预订",
      operatorId: fixture.admin.id,
      privacyPolicyUrl: "https://example.com/privacy-v2",
      storeId: fixture.store.id,
      userAgreementUrl: "https://example.com/agreement",
    });

    expect(settings).toMatchObject({
      aboutText: "门店配送范围：莲花小区。",
      cutoffTime: "17:30",
      customerServiceTel: "400-222-3333",
      deliveryCities: ["南京市", "合肥市"],
      deliveryProvinces: ["江苏省", "安徽省"],
      loginImageUrl: "/uploads/login.jpg",
      loginSubtitle: "社区鲜蔬会员",
      loginTitle: "Hentor Fresh",
      loginWelcome: "欢迎来到蔬菜预订",
      privacyPolicyUrl: "https://example.com/privacy-v2",
      userAgreementUrl: "https://example.com/agreement",
    });

    await expect(
      prisma.store.findUniqueOrThrow({
        where: { id: fixture.store.id },
        select: {
          customerServiceTel: true,
          cutoffTime: true,
          deliveryCities: true,
          deliveryProvinces: true,
        },
      }),
    ).resolves.toEqual({
      customerServiceTel: "400-222-3333",
      cutoffTime: "17:30",
      deliveryCities: ["南京市", "合肥市"],
      deliveryProvinces: ["江苏省", "安徽省"],
    });

    await expect(
      prisma.systemConfig.findMany({
        where: { storeId: fixture.store.id },
        orderBy: { key: "asc" },
        select: { key: true, value: true },
      }),
    ).resolves.toEqual([
      { key: "about_text", value: "门店配送范围：莲花小区。" },
      { key: "customer_service_tel", value: "400-222-3333" },
      { key: "cutoff_time", value: "17:30" },
      { key: "login_image_url", value: "/uploads/login.jpg" },
      { key: "login_subtitle", value: "社区鲜蔬会员" },
      { key: "login_title", value: "Hentor Fresh" },
      { key: "login_welcome", value: "欢迎来到蔬菜预订" },
      { key: "privacy_policy_url", value: "https://example.com/privacy-v2" },
      { key: "user_agreement_url", value: "https://example.com/agreement" },
    ]);

    await expect(
      prisma.adminOperationLog.count({
        where: {
          action: "SYSTEM_SETTINGS_UPDATED",
          operatorId: fixture.admin.id,
          resource: "system_config",
          storeId: fixture.store.id,
        },
      }),
    ).resolves.toBe(1);
  });

  it("rejects invalid cutoff time without writing settings", async () => {
    const fixture = await createFixture();

    await expect(
      updateSystemSettings({
        aboutText: "",
        cutoffTime: "24:10",
        customerServiceTel: "",
        operatorId: fixture.admin.id,
        privacyPolicyUrl: "",
        storeId: fixture.store.id,
        userAgreementUrl: "",
      }),
    ).rejects.toMatchObject({
      code: "INVALID_CUTOFF_TIME",
      message: "截单时间必须是 HH:mm",
    } satisfies Partial<SystemSettingsServiceError>);

    await expect(
      prisma.store.findUniqueOrThrow({
        where: { id: fixture.store.id },
        select: { cutoffTime: true },
      }),
    ).resolves.toEqual({ cutoffTime: "18:00" });
    await expect(
      prisma.systemConfig.count({ where: { storeId: fixture.store.id } }),
    ).resolves.toBe(0);
  });
});
