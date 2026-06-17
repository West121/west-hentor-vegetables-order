import { z } from "zod";

import {
  StoreManagementServiceError,
  updateFranchisee,
} from "@hentor/db";

import { getAllStoresAccessFailure } from "@/app/lib/admin-access";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const franchiseeSchema = z.object({
  contactName: z.string().min(1),
  contactPhone: z.string().min(1),
  contractEndsAt: z.coerce.date().nullable().optional(),
  name: z.string().min(1),
  remark: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "EXPIRED"]),
});

function statusForStoreError(code: string) {
  return code.endsWith("_NOT_FOUND") ? 404 : 400;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ franchiseeId: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const accessFailure = await getAllStoresAccessFailure(session.adminUserId);
  if (accessFailure) {
    return accessFailure;
  }

  const parsed = franchiseeSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "加盟商参数不完整");
  }

  const { franchiseeId } = await context.params;

  try {
    const franchisee = await updateFranchisee({
      ...parsed.data,
      franchiseeId,
      operatorId: session.adminUserId,
    });

    return ok({
      franchisee: {
        id: franchisee.id,
        name: franchisee.name,
        status: franchisee.status,
      },
    });
  } catch (error) {
    if (error instanceof StoreManagementServiceError) {
      return fail(error.code, error.message, statusForStoreError(error.code));
    }

    throw error;
  }
}
