import {
  findAvailableMiniappStore,
  hideMiniappOrder,
  MiniappServiceError,
} from "@hentor/db";
import { storeCodeSchema } from "@hentor/shared";

import { fail, ok } from "@/app/lib/api";
import { requireMiniSession } from "@/app/lib/mini-auth";

function statusForMiniappError(code: string) {
  if (code.endsWith("_NOT_FOUND")) {
    return 404;
  }

  if (code === "ORDER_NOT_HIDEABLE") {
    return 409;
  }

  return 400;
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const auth = requireMiniSession(request);
  if (!auth.session) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const storeCode = searchParams.get("storeCode") ?? undefined;
  const parsedStoreCode = storeCode
    ? storeCodeSchema.safeParse(storeCode)
    : { data: undefined, success: true as const };

  if (!parsedStoreCode.success) {
    return fail("INVALID_STORE_CODE", "门店编码不正确");
  }

  const store = await findAvailableMiniappStore({
    storeCode: parsedStoreCode.data,
    storeId: auth.session.storeId,
  });

  if (!store) {
    return fail("STORE_NOT_FOUND", "当前门店不可用", 404);
  }

  const { orderId } = await context.params;

  try {
    const order = await hideMiniappOrder({
      orderId,
      storeId: store.id,
      userId: auth.session.userId,
    });

    return ok({
      order: {
        deletedByUserAt: order.deletedByUserAt,
        id: order.id,
      },
    });
  } catch (error) {
    if (error instanceof MiniappServiceError) {
      return fail(error.code, error.message, statusForMiniappError(error.code));
    }

    throw error;
  }
}
