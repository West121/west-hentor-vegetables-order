import { z } from "zod";

import {
  createUserPackage,
  listUserPackages,
  PackageServiceError,
} from "@hentor/db";

import {
  getPermissionFailure,
  getStoreAccessFailure,
} from "@/app/lib/admin-access";
import { getAdminPaginationParams } from "@/app/lib/admin-pagination";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const querySchema = z.object({
  query: z.string().optional(),
  status: z
    .enum(["ACTIVE", "FROZEN", "EXPIRED", "USED_UP"])
    .optional(),
  storeId: z.string().min(1),
});

const createSchema = z.object({
  reason: z.string().min(1),
  status: z.enum(["ACTIVE", "FROZEN", "EXPIRED", "USED_UP"]).optional(),
  storeId: z.string().min(1),
  templateId: z.string().min(1),
  totalTimes: z.coerce.number().int().min(1).optional(),
  usedTimes: z.coerce.number().int().min(0).optional(),
  userId: z.string().min(1),
  weightLimitJin: z.coerce.number().positive().optional(),
});

function statusForPackageError(code: string) {
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
    storeId: url.searchParams.get("storeId") ?? "",
  });

  if (!parsed.success) {
    return fail("INVALID_PARAMS", "查询参数不完整");
  }

  const permissionFailure = await getPermissionFailure(
    session.adminUserId,
    "members.read",
  );
  if (permissionFailure) {
    return permissionFailure;
  }

  const accessFailure = await getStoreAccessFailure(
    session.adminUserId,
    parsed.data.storeId,
  );
  if (accessFailure) {
    return accessFailure;
  }

  return ok(
    await listUserPackages({
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
    return fail("INVALID_PARAMS", "用户套餐参数不完整");
  }

  const permissionFailure = await getPermissionFailure(
    session.adminUserId,
    "members.write",
  );
  if (permissionFailure) {
    return permissionFailure;
  }

  const accessFailure = await getStoreAccessFailure(
    session.adminUserId,
    parsed.data.storeId,
  );
  if (accessFailure) {
    return accessFailure;
  }

  try {
    const userPackage = await createUserPackage({
      operatorId: session.adminUserId,
      reason: parsed.data.reason,
      status: parsed.data.status,
      storeId: parsed.data.storeId,
      templateId: parsed.data.templateId,
      totalTimes: parsed.data.totalTimes,
      usedTimes: parsed.data.usedTimes,
      userId: parsed.data.userId,
      weightLimitJin: parsed.data.weightLimitJin,
    });

    return ok({
      userPackage: {
        id: userPackage.id,
        nameSnapshot: userPackage.nameSnapshot,
        remainingTimes: Math.max(0, userPackage.totalTimes - userPackage.usedTimes),
        status: userPackage.status,
        totalTimes: userPackage.totalTimes,
        usedTimes: userPackage.usedTimes,
        usagePercent:
          userPackage.totalTimes > 0
            ? Math.round((userPackage.usedTimes / userPackage.totalTimes) * 100)
            : 0,
        weightLimitJin: Number(userPackage.weightLimitJin),
      },
    });
  } catch (error) {
    if (error instanceof PackageServiceError) {
      return fail(error.code, error.message, statusForPackageError(error.code));
    }

    throw error;
  }
}
