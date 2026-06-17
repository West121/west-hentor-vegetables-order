import { z } from "zod";

import { OrderServiceError, shipOrder } from "@hentor/db";

import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const shipOrderSchema = z.object({
  logisticsNo: z.string().min(1, "请输入运单号"),
  storeId: z.string().min(1),
});

function statusForOrderError(code: string) {
  if (code.endsWith("_NOT_FOUND")) {
    return 404;
  }

  if (code === "ORDER_NOT_SHIPPABLE") {
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

  const parsed = shipOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "发货参数不完整");
  }

  const { orderId } = await context.params;

  try {
    const order = await shipOrder({
      logisticsNo: parsed.data.logisticsNo,
      operatorId: session.adminUserId,
      orderId,
      storeId: parsed.data.storeId,
    });

    return ok({
      order: {
        id: order.id,
        logisticsNo: order.logisticsNo,
        shippedAt: order.shippedAt?.toISOString(),
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
