import { z } from "zod";

import {
  getAdminUser,
  listAccessibleStores,
  SystemManagementServiceError,
  updateAdminUser,
} from "@hentor/db";

import {
  getPermissionFailure,
  getRoleAssignmentFailure,
  getStoreAssignmentFailure,
} from "@/app/lib/admin-access";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const updateSchema = z.object({
  name: z.string().min(1),
  phone: z.string().nullable().optional(),
  roleIds: z.array(z.string().min(1)).min(1),
  status: z.enum(["ACTIVE", "DISABLED"]),
  storeIds: z.array(z.string().min(1)),
});

function statusForSystemError(code: string) {
  return code.endsWith("_NOT_FOUND") ? 404 : 400;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ adminUserId: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const access = await listAccessibleStores(session.adminUserId);
  const { adminUserId } = await context.params;

  try {
    const adminUser = await getAdminUser({
      adminUserId,
      ...(access.scope === "ALL"
        ? {}
        : { storeIds: access.stores.map((store) => store.id) }),
    });

    return ok({ adminUser });
  } catch (error) {
    if (error instanceof SystemManagementServiceError) {
      return fail(error.code, error.message, statusForSystemError(error.code));
    }

    throw error;
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ adminUserId: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
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

  const { adminUserId } = await context.params;
  const access = await listAccessibleStores(session.adminUserId);

  try {
    await getAdminUser({
      adminUserId,
      ...(access.scope === "ALL"
        ? {}
        : { storeIds: access.stores.map((store) => store.id) }),
    });

    const adminUser = await updateAdminUser({
      ...parsed.data,
      adminUserId,
      operatorId: session.adminUserId,
    });

    return ok({
      adminUser: {
        id: adminUser.id,
        name: adminUser.name,
        phone: adminUser.phone,
        status: adminUser.status,
        updatedAt: adminUser.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof SystemManagementServiceError) {
      return fail(error.code, error.message, statusForSystemError(error.code));
    }

    throw error;
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ adminUserId: string }> },
) {
  return PATCH(request, context);
}
