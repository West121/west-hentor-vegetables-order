import { z } from "zod";

import {
  StoreManagementServiceError,
  updateStore,
} from "@hentor/db";

import { getAllStoresAccessFailure } from "@/app/lib/admin-access";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const storeSchema = z.object({
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  code: z.string().min(1),
  contactName: z.string().min(1),
  contactPhone: z.string().min(1),
  customerServiceTel: z.string().nullable().optional(),
  cutoffTime: z.string().min(1),
  district: z.string().nullable().optional(),
  franchiseEndsAt: z.coerce.date().nullable().optional(),
  franchiseeId: z.string().nullable().optional(),
  name: z.string().min(1),
  province: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "DISABLED"]),
  type: z.enum(["DIRECT", "FRANCHISE"]),
});

function statusForStoreError(code: string) {
  if (code.endsWith("_NOT_FOUND")) {
    return 404;
  }

  if (code.endsWith("_EXISTS")) {
    return 409;
  }

  return 400;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ storeId: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const accessFailure = await getAllStoresAccessFailure(session.adminUserId);
  if (accessFailure) {
    return accessFailure;
  }

  const parsed = storeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "门店参数不完整");
  }

  const { storeId } = await context.params;

  try {
    const store = await updateStore({
      ...parsed.data,
      operatorId: session.adminUserId,
      storeId,
    });

    return ok({
      store: {
        id: store.id,
        name: store.name,
        status: store.status,
        type: store.type,
      },
    });
  } catch (error) {
    if (error instanceof StoreManagementServiceError) {
      return fail(error.code, error.message, statusForStoreError(error.code));
    }

    throw error;
  }
}
