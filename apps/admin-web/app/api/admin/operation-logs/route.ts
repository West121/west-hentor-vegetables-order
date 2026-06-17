import { z } from "zod";

import { listAdminOperationLogs } from "@hentor/db";

import {
  getAllStoresAccessFailure,
  getStoreAccessFailure,
} from "@/app/lib/admin-access";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const querySchema = z.object({
  operatorId: z.string().optional(),
  resource: z.string().optional(),
  storeId: z.string().optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
});

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    operatorId: url.searchParams.get("operatorId") ?? undefined,
    resource: url.searchParams.get("resource") ?? undefined,
    storeId: url.searchParams.get("storeId") ?? undefined,
    take: url.searchParams.get("take") ?? undefined,
  });

  if (!parsed.success) {
    return fail("INVALID_PARAMS", "查询参数不完整");
  }

  if (parsed.data.storeId) {
    const accessFailure = await getStoreAccessFailure(
      session.adminUserId,
      parsed.data.storeId,
    );
    if (accessFailure) {
      return accessFailure;
    }
  } else {
    const accessFailure = await getAllStoresAccessFailure(session.adminUserId);
    if (accessFailure) {
      return accessFailure;
    }
  }

  return ok(await listAdminOperationLogs(parsed.data));
}
