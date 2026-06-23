import { z } from "zod";

import {
  SystemManagementServiceError,
  updateAdminRole,
} from "@hentor/db";

import { getPermissionFailure } from "@/app/lib/admin-access";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const updateSchema = z.object({
  name: z.string().min(1),
  permissionIds: z.array(z.string().min(1)).min(1),
});

function statusForSystemError(code: string) {
  return code.endsWith("_NOT_FOUND") ? 404 : 400;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roleId: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const permissionFailure = await getPermissionFailure(
    session.adminUserId,
    "system.manage",
  );
  if (permissionFailure) {
    return permissionFailure;
  }

  const { roleId } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!roleId || !parsed.success) {
    return fail("INVALID_PARAMS", "角色参数不完整");
  }

  try {
    const role = await updateAdminRole({
      ...parsed.data,
      operatorId: session.adminUserId,
      roleId,
    });

    return ok({
      role: {
        code: role.code,
        createdAt: role.createdAt,
        id: role.id,
        name: role.name,
        updatedAt: role.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof SystemManagementServiceError) {
      return fail(error.code, error.message, statusForSystemError(error.code));
    }

    throw error;
  }
}
