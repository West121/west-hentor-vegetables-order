import { z } from "zod";

import { getShipmentStats } from "@hentor/db";

import {
  getPermissionFailure,
  getStoreAccessFailure,
} from "@/app/lib/admin-access";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const querySchema = z.object({
  addressKeyword: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  dishCategory: z
    .enum(["LEAFY", "FRUIT", "ROOT", "MUSHROOM", "ACTIVITY"])
    .optional(),
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
  const parsed = querySchema.safeParse({
    addressKeyword: url.searchParams.get("addressKeyword") ?? undefined,
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
    dishCategory: url.searchParams.get("dishCategory") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    storeId: url.searchParams.get("storeId") ?? "",
  });

  if (!parsed.success) {
    return fail("INVALID_PARAMS", "发货统计参数不完整");
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

  return ok(
    await getShipmentStats({
      addressKeyword: parsed.data.addressKeyword,
      dateFrom: parseDate(parsed.data.dateFrom),
      dateTo: parseDate(parsed.data.dateTo),
      dishCategory: parsed.data.dishCategory,
      status: parsed.data.status,
      storeId: parsed.data.storeId,
    }),
  );
}
