import { z } from "zod";

import { batchShipOrders, OrderServiceError } from "@hentor/db";

import {
  getPermissionFailure,
  getStoreAccessFailure,
} from "@/app/lib/admin-access";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const batchShipSchema = z.object({
  shipments: z
    .array(
      z.object({
        logisticsNo: z.string().min(1, "请输入运单号"),
        orderId: z.string().min(1),
      }),
    )
    .min(1),
  storeId: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const parsed = batchShipSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "批量发货参数不完整");
  }

  const permissionFailure = await getPermissionFailure(
    session.adminUserId,
    "orders.write",
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
    const result = await batchShipOrders({
      operatorId: session.adminUserId,
      shipments: parsed.data.shipments,
      storeId: parsed.data.storeId,
    });

    return ok(result);
  } catch (error) {
    if (error instanceof OrderServiceError) {
      return fail(error.code, error.message);
    }

    throw error;
  }
}
