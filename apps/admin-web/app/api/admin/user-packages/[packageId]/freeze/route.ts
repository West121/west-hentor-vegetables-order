import { z } from "zod";

import { freezeUserPackage, PackageServiceError } from "@hentor/db";

import { getStoreAccessFailure } from "@/app/lib/admin-access";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const operationSchema = z.object({
  reason: z.string().min(1),
  storeId: z.string().min(1),
});

function statusForPackageError(code: string) {
  return code.endsWith("_NOT_FOUND") ? 404 : 400;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ packageId: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const parsed = operationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "冻结参数不完整");
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
    const userPackage = await freezeUserPackage({
      operatorId: session.adminUserId,
      reason: parsed.data.reason,
      storeId: parsed.data.storeId,
      userPackageId: packageId,
    });

    return ok({
      userPackage: {
        frozenReason: userPackage.frozenReason,
        id: userPackage.id,
        status: userPackage.status,
      },
    });
  } catch (error) {
    if (error instanceof PackageServiceError) {
      return fail(error.code, error.message, statusForPackageError(error.code));
    }

    throw error;
  }
}
