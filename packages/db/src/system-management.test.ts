import { compare } from "bcryptjs";
import { afterEach, describe, expect, it } from "vitest";

import {
  prisma,
  type AdminRole,
  type AdminUser,
  type Store,
  type User,
} from "./index";
import * as systemManagement from "./system-management";

type Fixture = {
  memberUser: User;
  operator: AdminUser;
  role: AdminRole;
  store: Store;
};

const createdStoreIds = new Set<string>();
const createdAdminIds = new Set<string>();
const createdRoleIds = new Set<string>();
const createdUserIds = new Set<string>();

async function cleanup() {
  const storeIds = [...createdStoreIds];
  const adminIds = [...createdAdminIds];
  const roleIds = [...createdRoleIds];
  const userIds = [...createdUserIds];

  const logConditions = [
    ...(storeIds.length ? [{ storeId: { in: storeIds } }] : []),
    ...(adminIds.length ? [{ operatorId: { in: adminIds } }] : []),
    ...(adminIds.length ? [{ resourceId: { in: adminIds } }] : []),
  ];

  if (storeIds.length || adminIds.length) {
    await prisma.adminOperationLog.deleteMany({
      where: { OR: logConditions },
    });
  }

  if (adminIds.length) {
    await prisma.adminUserStore.deleteMany({
      where: { adminUserId: { in: adminIds } },
    });
    await prisma.adminUserRole.deleteMany({
      where: { adminUserId: { in: adminIds } },
    });
  }

  if (roleIds.length) {
    await prisma.adminRolePermission.deleteMany({
      where: { roleId: { in: roleIds } },
    });
    await prisma.adminUserRole.deleteMany({
      where: { roleId: { in: roleIds } },
    });
  }

  if (adminIds.length) {
    await prisma.adminUser.deleteMany({ where: { id: { in: adminIds } } });
  }

  if (roleIds.length) {
    await prisma.adminRole.deleteMany({ where: { id: { in: roleIds } } });
  }

  if (userIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  if (storeIds.length) {
    await prisma.store.deleteMany({ where: { id: { in: storeIds } } });
  }

  createdStoreIds.clear();
  createdAdminIds.clear();
  createdRoleIds.clear();
  createdUserIds.clear();
}

afterEach(async () => {
  await cleanup();
});

async function createFixture(): Promise<Fixture> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const storeId = `system-test-store-${suffix}`;
  const operatorId = `system-test-operator-${suffix}`;
  const roleId = `system-test-role-${suffix}`;
  const userId = `system-test-member-${suffix}`;
  createdStoreIds.add(storeId);
  createdAdminIds.add(operatorId);
  createdRoleIds.add(roleId);
  createdUserIds.add(userId);

  const store = await prisma.store.create({
    data: {
      id: storeId,
      code: `system-test-store-${suffix}`,
      contactName: "系统店长",
      contactPhone: "13900006666",
      name: "系统测试加盟店",
      status: "ACTIVE",
      type: "FRANCHISE",
    },
  });

  const role = await prisma.adminRole.create({
    data: {
      id: roleId,
      code: `system-role-${suffix}`,
      name: "系统测试角色",
    },
  });

  const operator = await prisma.adminUser.create({
    data: {
      id: operatorId,
      name: "系统管理员",
      passwordHash: "not-used",
      status: "ACTIVE",
      username: `system-operator-${suffix}`,
    },
  });

  const memberUser = await prisma.user.create({
    data: {
      id: userId,
      defaultStoreId: store.id,
      openid: `system-member-openid-${suffix}`,
      phone: "13800006666",
    },
  });

  return { memberUser, operator, role, store };
}

describe("system management", () => {
  it("creates updates and resets backend admin users separately from members", async () => {
    const fixture = await createFixture();

    const created = await (
      systemManagement as typeof systemManagement & {
        createAdminUser: (input: {
          name: string;
          operatorId: string;
          password: string;
          phone: string;
          roleIds: string[];
          status: "ACTIVE";
          storeIds: string[];
          username: string;
        }) => Promise<AdminUser>;
      }
    ).createAdminUser({
      name: "门店运营",
      operatorId: fixture.operator.id,
      password: "Admin123456",
      phone: "13800006666",
      roleIds: [fixture.role.id],
      status: "ACTIVE",
      storeIds: [fixture.store.id],
      username: `system-created-${fixture.store.id}`,
    });
    createdAdminIds.add(created.id);

    expect(created).toMatchObject({
      name: "门店运营",
      phone: "13800006666",
      status: "ACTIVE",
    });
    await expect(compare("Admin123456", created.passwordHash)).resolves.toBe(true);

    const list = await systemManagement.listAdminUsers({
      query: "门店运营",
    });
    expect(list.items.map((item) => item.id)).toContain(created.id);
    expect(list.items.map((item) => item.id)).not.toContain(fixture.memberUser.id);
    expect(list.items.find((item) => item.id === created.id)).toMatchObject({
      roleNames: ["系统测试角色"],
      storeNames: ["系统测试加盟店"],
      username: `system-created-${fixture.store.id}`,
    });

    const updated = await systemManagement.updateAdminUser({
      adminUserId: created.id,
      name: "门店运营主管",
      operatorId: fixture.operator.id,
      phone: "13900007777",
      roleIds: [fixture.role.id],
      status: "DISABLED",
      storeIds: [fixture.store.id],
    });

    expect(updated).toMatchObject({
      id: created.id,
      name: "门店运营主管",
      phone: "13900007777",
      status: "DISABLED",
    });

    const reset = await systemManagement.resetAdminUserPassword({
      adminUserId: created.id,
      newPassword: "NewAdmin123456",
      operatorId: fixture.operator.id,
    });
    await expect(compare("NewAdmin123456", reset.passwordHash)).resolves.toBe(true);

    await expect(
      prisma.adminOperationLog.count({
        where: {
          action: {
            in: [
              "ADMIN_USER_CREATED",
              "ADMIN_USER_UPDATED",
              "ADMIN_USER_PASSWORD_RESET",
            ],
          },
          operatorId: fixture.operator.id,
          resource: "admin_user",
          resourceId: created.id,
        },
      }),
    ).resolves.toBe(3);
  });

  it("lists operation logs with operator and store context", async () => {
    const fixture = await createFixture();

    const created = await systemManagement.createAdminUser({
      name: "日志测试账号",
      operatorId: fixture.operator.id,
      password: "Admin123456",
      phone: null,
      roleIds: [fixture.role.id],
      status: "ACTIVE",
      storeIds: [fixture.store.id],
      username: `system-log-created-${fixture.store.id}`,
    });
    createdAdminIds.add(created.id);

    const logs = await systemManagement.listAdminOperationLogs({
      resource: "admin_user",
      storeId: fixture.store.id,
    });

    expect(logs.items[0]).toMatchObject({
      action: "ADMIN_USER_CREATED",
      operator: {
        id: fixture.operator.id,
        name: "系统管理员",
      },
      resource: "admin_user",
      resourceId: created.id,
      store: {
        id: fixture.store.id,
        name: "系统测试加盟店",
      },
    });
    expect(logs.summary.total).toBeGreaterThanOrEqual(1);
  });

  it("lists accessible franchise stores by backend user scope", async () => {
    const fixture = await createFixture();

    const created = await systemManagement.createAdminUser({
      name: "加盟店账号",
      operatorId: fixture.operator.id,
      password: "Admin123456",
      phone: "13800006666",
      roleIds: [fixture.role.id],
      status: "ACTIVE",
      storeIds: [fixture.store.id],
      username: `system-store-scope-${fixture.store.id}`,
    });
    createdAdminIds.add(created.id);

    const access = await systemManagement.listAccessibleStores(created.id);

    expect(access).toMatchObject({
      scope: "ASSIGNED",
      stores: [
        {
          id: fixture.store.id,
          name: "系统测试加盟店",
          type: "FRANCHISE",
        },
      ],
    });
  });

  it("filters backend admin users by authorized franchise stores", async () => {
    const fixture = await createFixture();
    const otherStoreId = `system-test-other-store-${Date.now()}`;
    createdStoreIds.add(otherStoreId);

    const otherStore = await prisma.store.create({
      data: {
        id: otherStoreId,
        code: otherStoreId,
        contactName: "其他店长",
        contactPhone: "13900008888",
        name: "其他加盟店",
        status: "ACTIVE",
        type: "FRANCHISE",
      },
    });

    const authorized = await systemManagement.createAdminUser({
      name: "本店账号",
      operatorId: fixture.operator.id,
      password: "Admin123456",
      phone: null,
      roleIds: [fixture.role.id],
      status: "ACTIVE",
      storeIds: [fixture.store.id],
      username: `system-authorized-${fixture.store.id}`,
    });
    const forbidden = await systemManagement.createAdminUser({
      name: "其他店账号",
      operatorId: fixture.operator.id,
      password: "Admin123456",
      phone: null,
      roleIds: [fixture.role.id],
      status: "ACTIVE",
      storeIds: [otherStore.id],
      username: `system-forbidden-${otherStore.id}`,
    });
    createdAdminIds.add(authorized.id);
    createdAdminIds.add(forbidden.id);

    const list = await systemManagement.listAdminUsers({
      storeIds: [fixture.store.id],
    });

    expect(list.items.map((item) => item.id)).toContain(authorized.id);
    expect(list.items.map((item) => item.id)).not.toContain(forbidden.id);
  });
});
