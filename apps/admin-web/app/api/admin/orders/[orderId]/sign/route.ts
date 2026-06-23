import { z } from "zod";

import { OrderServiceError, signOrder } from "@hentor/db";

import {
  getPermissionFailure,
  getStoreAccessFailure,
} from "@/app/lib/admin-access";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const signOrderSchema = z.object({
  storeId: z.string().min(1),
});

function statusForOrderError(code: string) {
  if (code.endsWith("_NOT_FOUND")) {
    return 404;
  }

  if (code === "ORDER_NOT_SIGNABLE") {
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

  const parsed = signOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "签收参数不完整");
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
    const order = await signOrder({
      operatorId: session.adminUserId,
      orderId,
      storeId: parsed.data.storeId,
    });

    return ok({
      order: {
        id: order.id,
        signedAt: order.signedAt?.toISOString(),
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
