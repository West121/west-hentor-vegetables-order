import { z } from "zod";

import {
  createAdminRole,
  listAdminRoles,
  SystemManagementServiceError,
} from "@hentor/db";

import { getPermissionFailure } from "@/app/lib/admin-access";
import { getAdminPaginationParams } from "@/app/lib/admin-pagination";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const querySchema = z.object({
  query: z.string().optional(),
});

const createSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  permissionIds: z.array(z.string().min(1)).min(1),
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

  return ok(
    await listAdminRoles({
      ...parsed.data,
      ...getAdminPaginationParams(url.searchParams),
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
    return fail("INVALID_PARAMS", "角色参数不完整");
  }

  const permissionFailure = await getPermissionFailure(
    session.adminUserId,
    "system.manage",
  );
  if (permissionFailure) {
    return permissionFailure;
  }

  try {
    const role = await createAdminRole({
      ...parsed.data,
      operatorId: session.adminUserId,
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
