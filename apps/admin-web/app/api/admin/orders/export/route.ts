import { z } from "zod";

import { exportStoreOrders } from "@hentor/db";

import {
  getPermissionFailure,
  getStoreAccessFailure,
} from "@/app/lib/admin-access";
import { fail } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const exportQuerySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  query: z.string().optional(),
  status: z
    .enum(["PENDING_SHIPMENT", "SHIPPED", "SIGNED", "CANCELED", "VOIDED"])
    .optional(),
  storeId: z.string().min(1),
});

function parseDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const url = new URL(request.url);
  const parsed = exportQuerySchema.safeParse({
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
    query: url.searchParams.get("query") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    storeId: url.searchParams.get("storeId") ?? "",
  });

  if (!parsed.success) {
    return fail("INVALID_PARAMS", "导出参数不完整");
  }

  const permissionFailure = await getPermissionFailure(
    session.adminUserId,
    "orders.read",
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

  const exported = await exportStoreOrders({
    dateFrom: parseDate(parsed.data.dateFrom),
    dateTo: parseDate(parsed.data.dateTo),
    query: parsed.data.query,
    status: parsed.data.status,
    storeId: parsed.data.storeId,
  });

  return new Response(`\uFEFF${exported.csvText}`, {
    headers: {
      "content-disposition": `attachment; filename="orders-${Date.now()}.csv"`,
      "content-type": "text/csv; charset=utf-8",
      "x-export-row-count": String(exported.rowCount),
    },
  });
}
