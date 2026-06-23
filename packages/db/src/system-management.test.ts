import { compare } from "bcryptjs";
import { afterEach, describe, expect, it } from "vitest";

import {
  prisma,
  createMiniappOperationLog,
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
const createdPermissionIds = new Set<string>();
const createdUserIds = new Set<string>();

async function cleanup() {
  const storeIds = [...createdStoreIds];
  const adminIds = [...createdAdminIds];
  const roleIds = [...createdRoleIds];
  const permissionIds = [...createdPermissionIds];
  const userIds = [...createdUserIds];

  const logConditions = [
    ...(storeIds.length ? [{ storeId: { in: storeIds } }] : []),
    ...(adminIds.length ? [{ operatorId: { in: adminIds } }] : []),
    ...(adminIds.length ? [{ resourceId: { in: adminIds } }] : []),
    ...(userIds.length ? [{ userId: { in: userIds } }] : []),
    ...(userIds.length ? [{ resourceId: { in: userIds } }] : []),
  ];

  if (storeIds.length || adminIds.length || userIds.length) {
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

  if (roleIds.length || permissionIds.length) {
    await prisma.adminRolePermission.deleteMany({
      where: {
        OR: [
          ...(roleIds.length ? [{ roleId: { in: roleIds } }] : []),
          ...(permissionIds.length
            ? [{ permissionId: { in: permissionIds } }]
            : []),
        ],
      },
    });
  }

  if (roleIds.length) {
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

  if (permissionIds.length) {
    await prisma.adminPermission.deleteMany({
      where: { id: { in: permissionIds } },
    });
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
  createdPermissionIds.clear();
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

  it("lists miniapp user operation logs with member context", async () => {
    const fixture = await createFixture();

    await createMiniappOperationLog({
      action: "MINIAPP_PHONE_LOGIN",
      afterValue: { phone: "138****6666" },
      durationMs: 42,
      requestMethod: "POST",
      requestParams: { storeCode: "system-test-store" },
      requestPath: "/api/v1/auth/wx-phone",
      resource: "miniapp_session",
      resourceId: fixture.memberUser.id,
      responseData: { success: true },
      statusCode: 200,
      storeId: fixture.store.id,
      userAgent: "wechat-devtools",
      userId: fixture.memberUser.id,
    });

    const logs = await systemManagement.listAdminOperationLogs({
      resource: "miniapp_session",
      storeId: fixture.store.id,
    });
    const log = logs.items[0];
    expect(log).toBeDefined();

    expect(log).toMatchObject({
      action: "MINIAPP_PHONE_LOGIN",
      operator: null,
      requestMethod: "POST",
      requestPath: "/api/v1/auth/wx-phone",
      resource: "miniapp_session",
      resourceId: fixture.memberUser.id,
      statusCode: 200,
      user: {
        id: fixture.memberUser.id,
        phone: "13800006666",
      },
    });
    expect(log!.durationMs).toBe(42);
    expect(log!.requestParams).toEqual({
      storeCode: "system-test-store",
    });
    expect(log!.responseData).toEqual({ success: true });
  });

  it("filters operation logs by action, keyword, status code and date range", async () => {
    const fixture = await createFixture();
    const resourceId = `address-filter-${fixture.store.id}`;
    const dateFrom = new Date();
    dateFrom.setHours(0, 0, 0, 0);
    const dateTo = new Date();
    dateTo.setHours(23, 59, 59, 999);

    await createMiniappOperationLog({
      action: "MINIAPP_ADDRESS_UPDATED",
      afterValue: { addressId: resourceId },
      durationMs: 35,
      requestMethod: "PATCH",
      requestParams: { addressId: resourceId },
      requestPath: `/api/v1/addresses/${resourceId}`,
      resource: "address",
      resourceId,
      responseData: { success: true },
      statusCode: 201,
      storeId: fixture.store.id,
      userId: fixture.memberUser.id,
    });

    const logs = await systemManagement.listAdminOperationLogs({
      action: "MINIAPP_ADDRESS_UPDATED",
      dateFrom,
      dateTo,
      query: resourceId,
      statusCode: 201,
      storeId: fixture.store.id,
    });

    expect(logs.items).toHaveLength(1);
    expect(logs.items[0]).toMatchObject({
      action: "MINIAPP_ADDRESS_UPDATED",
      resource: "address",
      resourceId,
      statusCode: 201,
    });

    const unmatched = await systemManagement.listAdminOperationLogs({
      action: "MINIAPP_ADDRESS_UPDATED",
      query: resourceId,
      statusCode: 500,
      storeId: fixture.store.id,
    });

    expect(unmatched.items).toHaveLength(0);
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

  it("gets a backend admin user detail within authorized store scope", async () => {
    const fixture = await createFixture();

    const created = await systemManagement.createAdminUser({
      name: "详情账号",
      operatorId: fixture.operator.id,
      password: "Admin123456",
      phone: "13800009999",
      roleIds: [fixture.role.id],
      status: "ACTIVE",
      storeIds: [fixture.store.id],
      username: `system-detail-${fixture.store.id}`,
    });
    createdAdminIds.add(created.id);

    const detail = await (
      systemManagement as typeof systemManagement & {
        getAdminUser: (input: {
          adminUserId: string;
          storeIds?: string[];
        }) => Promise<{
          id: string;
          name: string;
          roleIds: string[];
          roleNames: string[];
          storeIds: string[];
          stores: Array<{ id: string; name: string }>;
          username: string;
        }>;
      }
    ).getAdminUser({
      adminUserId: created.id,
      storeIds: [fixture.store.id],
    });

    expect(detail).toMatchObject({
      id: created.id,
      name: "详情账号",
      roleIds: [fixture.role.id],
      roleNames: ["系统测试角色"],
      storeIds: [fixture.store.id],
      username: `system-detail-${fixture.store.id}`,
    });
    expect(detail.stores).toEqual([
      expect.objectContaining({
        id: fixture.store.id,
        name: fixture.store.name,
      }),
    ]);
  });

  it("rejects backend admin user detail outside authorized store scope", async () => {
    const fixture = await createFixture();
    const otherStoreId = `system-detail-other-store-${Date.now()}`;
    createdStoreIds.add(otherStoreId);

    const otherStore = await prisma.store.create({
      data: {
        id: otherStoreId,
        code: otherStoreId,
        contactName: "其他店长",
        contactPhone: "13900008888",
        name: "详情其他加盟店",
        status: "ACTIVE",
        type: "FRANCHISE",
      },
    });

    const forbidden = await systemManagement.createAdminUser({
      name: "其他店详情账号",
      operatorId: fixture.operator.id,
      password: "Admin123456",
      phone: null,
      roleIds: [fixture.role.id],
      status: "ACTIVE",
      storeIds: [otherStore.id],
      username: `system-detail-forbidden-${otherStore.id}`,
    });
    createdAdminIds.add(forbidden.id);

    await expect(
      (
        systemManagement as typeof systemManagement & {
          getAdminUser: (input: {
            adminUserId: string;
            storeIds?: string[];
          }) => Promise<unknown>;
        }
      ).getAdminUser({
        adminUserId: forbidden.id,
        storeIds: [fixture.store.id],
      }),
    ).rejects.toMatchObject({
      code: "ADMIN_USER_NOT_FOUND",
      message: "后台用户不存在",
    });
  });

  it("lists backend roles with permissions and usage counts", async () => {
    const fixture = await createFixture();
    const permissionId = `system-test-permission-${Date.now()}`;
    const permissionCode = `system.permission.${fixture.store.id}`;
    createdPermissionIds.add(permissionId);

    const permission = await prisma.adminPermission.create({
      data: {
        id: permissionId,
        code: permissionCode,
        name: "系统测试权限",
      },
    });

    await prisma.adminRolePermission.create({
      data: {
        permissionId: permission.id,
        roleId: fixture.role.id,
      },
    });

    const created = await systemManagement.createAdminUser({
      name: "角色绑定账号",
      operatorId: fixture.operator.id,
      password: "Admin123456",
      phone: null,
      roleIds: [fixture.role.id],
      status: "ACTIVE",
      storeIds: [fixture.store.id],
      username: `system-role-user-${fixture.store.id}`,
    });
    createdAdminIds.add(created.id);

    const roles = await systemManagement.listAdminRoles({
      query: "系统测试角色",
    });

    expect(roles.items).toEqual([
      expect.objectContaining({
        code: fixture.role.code,
        id: fixture.role.id,
        name: "系统测试角色",
        permissionCodes: [permissionCode],
        permissions: [
          {
            code: permissionCode,
            id: permission.id,
            name: "系统测试权限",
          },
        ],
        userCount: 1,
      }),
    ]);
    expect(roles.summary.total).toBe(1);
  });
});
