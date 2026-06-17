import { hash } from "bcryptjs";

import { prisma } from "./client";
import {
  Prisma,
  type AdminStatus,
} from "./generated/prisma/client";

export class SystemManagementServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "SystemManagementServiceError";
  }
}

export type ListAdminUsersInput = {
  query?: string;
  status?: AdminStatus;
  storeIds?: string[];
};

export type CreateAdminUserInput = {
  name: string;
  operatorId: string;
  password: string;
  phone?: string | null;
  roleIds: string[];
  status: AdminStatus;
  storeIds: string[];
  username: string;
};

export type UpdateAdminUserInput = Omit<CreateAdminUserInput, "password" | "username"> & {
  adminUserId: string;
};

export type ResetAdminUserPasswordInput = {
  adminUserId: string;
  newPassword: string;
  operatorId: string;
};

export type ListAdminOperationLogsInput = {
  operatorId?: string;
  resource?: string;
  storeId?: string;
  take?: number;
};

export type StoreAccessScope = "ALL" | "ASSIGNED";

async function getActiveOperator(
  tx: Prisma.TransactionClient | typeof prisma,
  operatorId: string,
) {
  const operator = await tx.adminUser.findFirst({
    where: {
      id: operatorId,
      status: "ACTIVE",
    },
  });

  if (!operator) {
    throw new SystemManagementServiceError(
      "OPERATOR_NOT_FOUND",
      "操作员不存在",
    );
  }

  return operator;
}

function normalizeNullableText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function normalizeAccountInput(input: {
  name: string;
  phone?: string | null;
  roleIds: string[];
  storeIds: string[];
}) {
  const name = input.name.trim();
  if (!name) {
    throw new SystemManagementServiceError("NAME_REQUIRED", "请输入用户姓名");
  }

  const roleIds = [...new Set(input.roleIds)];
  if (roleIds.length === 0 || roleIds.length !== input.roleIds.length) {
    throw new SystemManagementServiceError(
      "ROLE_IDS_INVALID",
      "请选择不重复的后台角色",
    );
  }

  const storeIds = [...new Set(input.storeIds)];
  if (storeIds.length !== input.storeIds.length) {
    throw new SystemManagementServiceError(
      "STORE_IDS_INVALID",
      "请选择不重复的授权门店",
    );
  }

  return {
    name,
    phone: normalizeNullableText(input.phone),
    roleIds,
    storeIds,
  };
}

function normalizeUsername(username: string) {
  const normalized = username.trim();
  if (!normalized) {
    throw new SystemManagementServiceError(
      "USERNAME_REQUIRED",
      "请输入登录账号",
    );
  }
  return normalized;
}

function normalizePassword(password: string) {
  if (password.trim().length < 8) {
    throw new SystemManagementServiceError(
      "PASSWORD_INVALID",
      "密码至少需要 8 位",
    );
  }
  return password;
}

async function ensureRolesAndStores(
  tx: Prisma.TransactionClient,
  roleIds: string[],
  storeIds: string[],
) {
  const [roles, stores] = await Promise.all([
    tx.adminRole.findMany({
      where: { id: { in: roleIds } },
      select: { id: true },
    }),
    storeIds.length
      ? tx.store.findMany({
          where: {
            id: { in: storeIds },
            status: "ACTIVE",
          },
          select: { id: true },
        })
      : Promise.resolve([]),
  ]);

  if (roles.length !== roleIds.length) {
    throw new SystemManagementServiceError(
      "ROLE_NOT_FOUND",
      "后台角色不存在",
    );
  }

  if (stores.length !== storeIds.length) {
    throw new SystemManagementServiceError(
      "STORE_NOT_FOUND",
      "授权门店不存在或已停用",
    );
  }
}

async function replaceAdminUserRelations(
  tx: Prisma.TransactionClient,
  adminUserId: string,
  roleIds: string[],
  storeIds: string[],
) {
  await tx.adminUserRole.deleteMany({ where: { adminUserId } });
  await tx.adminUserStore.deleteMany({ where: { adminUserId } });

  await tx.adminUserRole.createMany({
    data: roleIds.map((roleId) => ({
      adminUserId,
      roleId,
    })),
  });

  if (storeIds.length) {
    await tx.adminUserStore.createMany({
      data: storeIds.map((storeId) => ({
        adminUserId,
        storeId,
      })),
    });
  }
}

function adminUserLogValue(input: {
  name: string;
  phone: string | null;
  roleIds: string[];
  status: AdminStatus;
  storeIds: string[];
  username: string;
}) {
  return {
    name: input.name,
    phone: input.phone,
    roleIds: input.roleIds,
    status: input.status,
    storeIds: input.storeIds,
    username: input.username,
  };
}

async function adminUserSnapshot(tx: Prisma.TransactionClient, adminUserId: string) {
  const adminUser = await tx.adminUser.findUnique({
    where: { id: adminUserId },
    include: {
      roles: {
        orderBy: { roleId: "asc" },
        select: { roleId: true },
      },
      stores: {
        orderBy: { storeId: "asc" },
        select: { storeId: true },
      },
    },
  });

  if (!adminUser) {
    throw new SystemManagementServiceError(
      "ADMIN_USER_NOT_FOUND",
      "后台用户不存在",
    );
  }

  const roleIds = adminUser.roles.map((role) => role.roleId);
  const storeIds = adminUser.stores.map((store) => store.storeId);

  return {
    adminUser,
    value: adminUserLogValue({
      name: adminUser.name,
      phone: adminUser.phone,
      roleIds,
      status: adminUser.status,
      storeIds,
      username: adminUser.username,
    }),
  };
}

export async function listAdminUsers(input: ListAdminUsersInput = {}) {
  const query = input.query?.trim();
  const where: Prisma.AdminUserWhereInput = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.storeIds
      ? { stores: { some: { storeId: { in: input.storeIds } } } }
      : {}),
    ...(query
      ? {
          OR: [
            { username: { contains: query, mode: "insensitive" } },
            { name: { contains: query, mode: "insensitive" } },
            { phone: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, summaryRows] = await Promise.all([
    prisma.adminUser.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { roleId: "asc" },
        },
        stores: {
          include: {
            store: {
              select: {
                code: true,
                id: true,
                name: true,
                type: true,
              },
            },
          },
          orderBy: { storeId: "asc" },
        },
      },
    }),
    prisma.adminUser.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const summary = summaryRows.reduce(
    (value, row) => {
      value.total += row._count._all;
      if (row.status === "ACTIVE") {
        value.active = row._count._all;
      }
      if (row.status === "DISABLED") {
        value.disabled = row._count._all;
      }
      return value;
    },
    { active: 0, disabled: 0, total: 0 },
  );

  return {
    items: items.map((item) => ({
      createdAt: item.createdAt,
      id: item.id,
      lastLoginAt: item.lastLoginAt,
      name: item.name,
      phone: item.phone,
      roleIds: item.roles.map(({ role }) => role.id),
      roleNames: item.roles.map(({ role }) => role.name),
      status: item.status,
      storeIds: item.stores.map(({ store }) => store.id),
      storeNames: item.stores.map(({ store }) => store.name),
      stores: item.stores.map(({ store }) => store),
      updatedAt: item.updatedAt,
      username: item.username,
    })),
    summary,
  };
}

export async function createAdminUser(input: CreateAdminUserInput) {
  const username = normalizeUsername(input.username);
  const password = normalizePassword(input.password);
  const normalized = normalizeAccountInput(input);

  return prisma.$transaction(async (tx) => {
    const operator = await getActiveOperator(tx, input.operatorId);
    await ensureRolesAndStores(tx, normalized.roleIds, normalized.storeIds);

    const existing = await tx.adminUser.findUnique({ where: { username } });
    if (existing) {
      throw new SystemManagementServiceError(
        "USERNAME_EXISTS",
        "登录账号已存在",
      );
    }

    const created = await tx.adminUser.create({
      data: {
        name: normalized.name,
        passwordHash: await hash(password, 10),
        phone: normalized.phone,
        status: input.status,
        username,
      },
    });

    await replaceAdminUserRelations(
      tx,
      created.id,
      normalized.roleIds,
      normalized.storeIds,
    );

    await tx.adminOperationLog.create({
      data: {
        action: "ADMIN_USER_CREATED",
        afterValue: adminUserLogValue({
          name: created.name,
          phone: created.phone,
          roleIds: normalized.roleIds,
          status: created.status,
          storeIds: normalized.storeIds,
          username: created.username,
        }),
        beforeValue: Prisma.JsonNull,
        operatorId: operator.id,
        resource: "admin_user",
        resourceId: created.id,
        storeId: normalized.storeIds[0] ?? null,
      },
    });

    return created;
  });
}

export async function updateAdminUser(input: UpdateAdminUserInput) {
  const normalized = normalizeAccountInput(input);

  return prisma.$transaction(async (tx) => {
    const operator = await getActiveOperator(tx, input.operatorId);
    await ensureRolesAndStores(tx, normalized.roleIds, normalized.storeIds);
    const before = await adminUserSnapshot(tx, input.adminUserId);

    const updated = await tx.adminUser.update({
      where: { id: input.adminUserId },
      data: {
        name: normalized.name,
        phone: normalized.phone,
        status: input.status,
      },
    });

    await replaceAdminUserRelations(
      tx,
      updated.id,
      normalized.roleIds,
      normalized.storeIds,
    );

    await tx.adminOperationLog.create({
      data: {
        action: "ADMIN_USER_UPDATED",
        afterValue: adminUserLogValue({
          name: updated.name,
          phone: updated.phone,
          roleIds: normalized.roleIds,
          status: updated.status,
          storeIds: normalized.storeIds,
          username: updated.username,
        }),
        beforeValue: before.value,
        operatorId: operator.id,
        resource: "admin_user",
        resourceId: updated.id,
        storeId: normalized.storeIds[0] ?? before.value.storeIds[0] ?? null,
      },
    });

    return updated;
  });
}

export async function resetAdminUserPassword(input: ResetAdminUserPasswordInput) {
  const password = normalizePassword(input.newPassword);

  return prisma.$transaction(async (tx) => {
    const operator = await getActiveOperator(tx, input.operatorId);
    const before = await adminUserSnapshot(tx, input.adminUserId);

    const updated = await tx.adminUser.update({
      where: { id: input.adminUserId },
      data: {
        passwordHash: await hash(password, 10),
      },
    });

    await tx.adminOperationLog.create({
      data: {
        action: "ADMIN_USER_PASSWORD_RESET",
        afterValue: { passwordResetAt: new Date().toISOString() },
        beforeValue: Prisma.JsonNull,
        operatorId: operator.id,
        resource: "admin_user",
        resourceId: updated.id,
        storeId: before.value.storeIds[0] ?? null,
      },
    });

    return updated;
  });
}

export async function listAdminOperationLogs(
  input: ListAdminOperationLogsInput = {},
) {
  const where: Prisma.AdminOperationLogWhereInput = {
    ...(input.operatorId ? { operatorId: input.operatorId } : {}),
    ...(input.resource ? { resource: input.resource } : {}),
    ...(input.storeId ? { storeId: input.storeId } : {}),
  };
  const take = Math.min(Math.max(input.take ?? 50, 1), 200);

  const [items, total] = await Promise.all([
    prisma.adminOperationLog.findMany({
      where,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        operator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        store: {
          select: {
            code: true,
            id: true,
            name: true,
            type: true,
          },
        },
      },
    }),
    prisma.adminOperationLog.count({ where }),
  ]);

  return {
    items: items.map((item) => ({
      action: item.action,
      afterValue: item.afterValue,
      beforeValue: item.beforeValue,
      createdAt: item.createdAt,
      id: item.id,
      ip: item.ip,
      operator: item.operator,
      resource: item.resource,
      resourceId: item.resourceId,
      store: item.store,
      userAgent: item.userAgent,
    })),
    summary: {
      total,
    },
  };
}

export async function listAccessibleStores(adminUserId: string) {
  const adminUser = await prisma.adminUser.findFirst({
    where: {
      id: adminUserId,
      status: "ACTIVE",
    },
    include: {
      roles: {
        include: {
          role: {
            select: {
              code: true,
            },
          },
        },
      },
      stores: {
        select: {
          storeId: true,
        },
      },
    },
  });

  if (!adminUser) {
    throw new SystemManagementServiceError(
      "ADMIN_USER_NOT_FOUND",
      "后台用户不存在",
    );
  }

  const hasAllStoreScope = adminUser.roles.some(
    ({ role }) => role.code === "super_admin",
  );
  const assignedStoreIds = adminUser.stores.map((store) => store.storeId);
  const scope: StoreAccessScope = hasAllStoreScope ? "ALL" : "ASSIGNED";

  const stores = await prisma.store.findMany({
    where: {
      status: "ACTIVE",
      ...(hasAllStoreScope ? {} : { id: { in: assignedStoreIds } }),
    },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    include: {
      franchisee: true,
    },
  });

  return {
    scope,
    stores,
  };
}
