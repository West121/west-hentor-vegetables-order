import { z } from "zod";

import { listAdminOperationLogs } from "@hentor/db";

import {
  getAllStoresAccessFailure,
  getPermissionFailure,
  getStoreAccessFailure,
} from "@/app/lib/admin-access";
import { getAdminPaginationParams } from "@/app/lib/admin-pagination";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const querySchema = z.object({
  action: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  operatorId: z.string().optional(),
  query: z.string().optional(),
  resource: z.string().optional(),
  statusCode: z.coerce.number().int().optional(),
  storeId: z.string().optional(),
});

function endOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(23, 59, 59, 999);
  return nextDate;
}

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    action: url.searchParams.get("action") ?? undefined,
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
    operatorId: url.searchParams.get("operatorId") ?? undefined,
    query: url.searchParams.get("query") ?? undefined,
    resource: url.searchParams.get("resource") ?? undefined,
    statusCode: url.searchParams.get("statusCode") ?? undefined,
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

  return ok(
    await listAdminOperationLogs({
      ...parsed.data,
      dateTo: parsed.data.dateTo ? endOfDay(parsed.data.dateTo) : undefined,
      ...getAdminPaginationParams(url.searchParams, { defaultPageSize: 20 }),
    }),
  );
}
