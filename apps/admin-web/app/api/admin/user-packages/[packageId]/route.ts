import { z } from "zod";

import {
  adjustUserPackage,
  deleteUserPackage,
  getUserPackage,
  PackageServiceError,
} from "@hentor/db";

import {
  getPermissionFailure,
  getStoreAccessFailure,
} from "@/app/lib/admin-access";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const adjustSchema = z.object({
  reason: z.string().min(1),
  storeId: z.string().min(1),
  totalTimes: z.coerce.number().int().min(1),
  usedTimes: z.coerce.number().int().min(0),
  weightLimitJin: z.coerce.number().positive(),
});

const querySchema = z.object({
  storeId: z.string().min(1),
});

const deleteSchema = z.object({
  reason: z.string().min(1),
  storeId: z.string().min(1),
});

function statusForPackageError(code: string) {
  return code.endsWith("_NOT_FOUND") ? 404 : 400;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ packageId: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
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

  const { packageId } = await context.params;

  try {
    const userPackage = await getUserPackage({
      storeId: parsed.data.storeId,
      userPackageId: packageId,
    });

    return ok({ userPackage });
  } catch (error) {
    if (error instanceof PackageServiceError) {
      return fail(error.code, error.message, statusForPackageError(error.code));
    }

    throw error;
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ packageId: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const parsed = adjustSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "套餐调整参数不完整");
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

  const { packageId } = await context.params;

  try {
    const userPackage = await adjustUserPackage({
      operatorId: session.adminUserId,
      reason: parsed.data.reason,
      storeId: parsed.data.storeId,
      totalTimes: parsed.data.totalTimes,
      usedTimes: parsed.data.usedTimes,
      userPackageId: packageId,
      weightLimitJin: parsed.data.weightLimitJin,
    });

    return ok({
      userPackage: {
        id: userPackage.id,
        remainingTimes: Math.max(0, userPackage.totalTimes - userPackage.usedTimes),
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

export async function PUT(
  request: Request,
  context: { params: Promise<{ packageId: string }> },
) {
  return PATCH(request, context);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ packageId: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "删除参数不完整");
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

  const { packageId } = await context.params;

  try {
    const userPackage = await deleteUserPackage({
      operatorId: session.adminUserId,
      reason: parsed.data.reason,
      storeId: parsed.data.storeId,
      userPackageId: packageId,
    });

    return ok({
      userPackage: {
        id: userPackage.id,
      },
    });
  } catch (error) {
    if (error instanceof PackageServiceError) {
      return fail(error.code, error.message, statusForPackageError(error.code));
    }

    throw error;
  }
}
