import { z } from "zod";

import { OrderServiceError, voidOrder } from "@hentor/db";

import {
  getPermissionFailure,
  getStoreAccessFailure,
} from "@/app/lib/admin-access";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const voidOrderSchema = z.object({
  reason: z.string().min(1, "请输入作废原因"),
  storeId: z.string().min(1),
});

function statusForOrderError(code: string) {
  if (code.endsWith("_NOT_FOUND")) {
    return 404;
  }

  if (code === "ORDER_NOT_VOIDABLE") {
    return 409;
  }

  return 400;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const parsed = voidOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "作废参数不完整");
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

  const { orderId } = await context.params;

  try {
    const order = await voidOrder({
      operatorId: session.adminUserId,
      orderId,
      reason: parsed.data.reason,
      storeId: parsed.data.storeId,
    });

    return ok({
      order: {
        canceledAt: order.canceledAt?.toISOString(),
        cancelReason: order.cancelReason,
        id: order.id,
        status: order.status,
      },
    });
  } catch (error) {
    if (error instanceof OrderServiceError) {
      return fail(error.code, error.message, statusForOrderError(error.code));
    }

    throw error;
  }
}
