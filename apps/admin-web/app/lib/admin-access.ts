import "server-only";

import { listAccessibleStores, prisma } from "@hentor/db";

import { fail } from "./api";

export async function getAdminPermissionCodes(adminUserId: string) {
  const adminUser = await prisma.adminUser.findFirst({
    where: {
      id: adminUserId,
      status: "ACTIVE",
    },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const permissionCodes =
    adminUser?.roles.flatMap(({ role }) =>
      role.permissions.map(({ permission }) => permission.code),
    ) ?? [];

  return [...new Set(permissionCodes)];
}

export async function getPermissionFailure(
  adminUserId: string,
  permissionCode: string,
) {
  const permissionCodes = await getAdminPermissionCodes(adminUserId);

  if (permissionCodes.includes(permissionCode)) {
    return null;
  }

  return fail("PERMISSION_FORBIDDEN", "无权执行该操作", 403);
}

export async function getStoreAccessFailure(
  adminUserId: string,
  storeId: string,
) {
  const access = await listAccessibleStores(adminUserId);

  if (
    access.scope === "ALL" ||
    access.stores.some((store) => store.id === storeId)
  ) {
    return null;
  }

  return fail("STORE_FORBIDDEN", "无权访问该数据范围", 403);
}

export async function getStoreAssignmentFailure(
  adminUserId: string,
  storeIds: string[],
) {
  const access = await listAccessibleStores(adminUserId);

  if (access.scope === "ALL") {
    return null;
  }

  if (storeIds.length === 0) {
    return fail("STORE_FORBIDDEN", "无权分配全部数据账号", 403);
  }

  const accessibleStoreIds = new Set(access.stores.map((store) => store.id));
  const hasForbiddenStore = storeIds.some(
    (storeId) => !accessibleStoreIds.has(storeId),
  );

  if (!hasForbiddenStore) {
    return null;
  }

  return fail("STORE_FORBIDDEN", "无权分配该数据范围", 403);
}

export async function getRoleAssignmentFailure(
  adminUserId: string,
  roleIds: string[],
) {
  const access = await listAccessibleStores(adminUserId);

  if (access.scope === "ALL") {
    return null;
  }

  const roles = await prisma.adminRole.findMany({
    where: { id: { in: roleIds } },
    select: {
      code: true,
      id: true,
      name: true,
    },
  });
  const hasSuperAdminRole = roles.some((role) => role.code === "super_admin");

  if (!hasSuperAdminRole) {
    return null;
  }

  return fail("ROLE_FORBIDDEN", "无权分配超级管理员角色", 403);
}

export async function getAllStoresAccessFailure(adminUserId: string) {
  const access = await listAccessibleStores(adminUserId);

  if (access.scope === "ALL") {
    return null;
  }

  return fail("STORE_FORBIDDEN", "无权访问全部数据", 403);
}
