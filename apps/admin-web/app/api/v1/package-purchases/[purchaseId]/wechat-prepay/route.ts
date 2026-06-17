import {
  findAvailableMiniappStore,
  MiniappServiceError,
  reserveMiniappWechatPrepay,
} from "@hentor/db";
import { storeCodeSchema } from "@hentor/shared";

import { fail, ok } from "@/app/lib/api";
import { requireMiniSession } from "@/app/lib/mini-auth";

function statusForMiniappError(code: string) {
  return code.endsWith("_NOT_FOUND") ? 404 : 400;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ purchaseId: string }> },
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

  const { purchaseId } = await context.params;

  try {
    return ok({
      prepay: await reserveMiniappWechatPrepay({
        purchaseOrderId: purchaseId,
        storeId: store.id,
        userId: auth.session.userId,
      }),
    });
  } catch (error) {
    if (error instanceof MiniappServiceError) {
      return fail(error.code, error.message, statusForMiniappError(error.code));
    }

    throw error;
  }
}
