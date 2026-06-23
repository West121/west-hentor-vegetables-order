import { z } from "zod";

import {
  createAdminUser,
  listAccessibleStores,
  listAdminUsers,
  SystemManagementServiceError,
} from "@hentor/db";

import {
  getPermissionFailure,
  getRoleAssignmentFailure,
  getStoreAccessFailure,
  getStoreAssignmentFailure,
} from "@/app/lib/admin-access";
import { getAdminPaginationParams } from "@/app/lib/admin-pagination";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const querySchema = z.object({
  query: z.string().optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
  storeId: z.string().optional(),
});

const createSchema = z.object({
  name: z.string().min(1),
  password: z.string().min(8),
  phone: z.string().nullable().optional(),
  roleIds: z.array(z.string().min(1)).min(1),
  status: z.enum(["ACTIVE", "DISABLED"]),
  storeIds: z.array(z.string().min(1)),
  username: z.string().min(1),
});

function statusForSystemError(code: string) {
  return code.endsWith("_NOT_FOUND") ? 404 : 400;
}

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    query: url.searchParams.get("query") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    storeId: url.searchParams.get("storeId") ?? undefined,
  });

  if (!parsed.success) {
    return fail("INVALID_PARAMS", "查询参数不完整");
  }

  const permissionFailure = await getPermissionFailure(
    session.adminUserId,
    "system.manage",
  );
  if (permissionFailure) {
    return permissionFailure;
  }

  const access = await listAccessibleStores(session.adminUserId);
  if (parsed.data.storeId) {
    const accessFailure = await getStoreAccessFailure(
      session.adminUserId,
      parsed.data.storeId,
    );
    if (accessFailure) {
      return accessFailure;
    }
  }

  const { storeId, ...listFilters } = parsed.data;

  return ok(
    await listAdminUsers({
      ...listFilters,
      ...getAdminPaginationParams(url.searchParams),
      ...(storeId
        ? { storeIds: [storeId] }
        : access.scope === "ALL"
          ? {}
          : { storeIds: access.stores.map((store) => store.id) }),
    }),
  );
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "后台用户参数不完整");
  }

  const permissionFailure = await getPermissionFailure(
    session.adminUserId,
    "system.manage",
  );
  if (permissionFailure) {
    return permissionFailure;
  }

  const accessFailure = await getStoreAssignmentFailure(
    session.adminUserId,
    parsed.data.storeIds,
  );
  if (accessFailure) {
    return accessFailure;
  }

  const roleAccessFailure = await getRoleAssignmentFailure(
    session.adminUserId,
    parsed.data.roleIds,
  );
  if (roleAccessFailure) {
    return roleAccessFailure;
  }

  try {
    const adminUser = await createAdminUser({
      ...parsed.data,
      operatorId: session.adminUserId,
    });

    return ok({
      adminUser: {
        createdAt: adminUser.createdAt,
        id: adminUser.id,
        lastLoginAt: adminUser.lastLoginAt,
        name: adminUser.name,
        phone: adminUser.phone,
        status: adminUser.status,
        updatedAt: adminUser.updatedAt,
        username: adminUser.username,
      },
    });
  } catch (error) {
    if (error instanceof SystemManagementServiceError) {
      return fail(error.code, error.message, statusForSystemError(error.code));
    }

    throw error;
  }
}
