import { z } from "zod";

import {
  cancelMiniappOrder,
  findAvailableMiniappStore,
  MiniappServiceError,
} from "@hentor/db";
import { storeCodeSchema } from "@hentor/shared";

import { fail, ok } from "@/app/lib/api";
import { requireMiniSession } from "@/app/lib/mini-auth";

const cancelSchema = z.object({
  reason: z.string().trim().min(1),
  storeCode: storeCodeSchema.optional(),
});

function statusForMiniappError(code: string) {
  if (code.endsWith("_NOT_FOUND")) {
    return 404;
  }

  if (code === "ORDER_NOT_CANCELABLE") {
    return 409;
  }

  return 400;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const auth = requireMiniSession(request);
  if (!auth.session) {
    return auth.response;
  }

  const parsed = cancelSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "取消参数不完整");
  }

  const store = await findAvailableMiniappStore({
    storeCode: parsed.data.storeCode,
    storeId: auth.session.storeId,
  });

  if (!store) {
    return fail("STORE_NOT_FOUND", "当前门店不可用", 404);
  }

  const { orderId } = await context.params;

  try {
    const order = await cancelMiniappOrder({
      orderId,
      reason: parsed.data.reason,
      storeId: store.id,
      userId: auth.session.userId,
    });

    return ok({
      order: {
        cancelReason: order.cancelReason,
        canceledAt: order.canceledAt,
        id: order.id,
        status: order.status,
      },
    });
  } catch (error) {
    if (error instanceof MiniappServiceError) {
      return fail(error.code, error.message, statusForMiniappError(error.code));
    }

    throw error;
  }
}
