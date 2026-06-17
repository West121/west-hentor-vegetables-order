import { z } from "zod";

import {
  createMiniappPackagePurchase,
  findAvailableMiniappStore,
  MiniappServiceError,
} from "@hentor/db";
import { storeCodeSchema } from "@hentor/shared";

import { fail, ok } from "@/app/lib/api";
import { requireMiniSession } from "@/app/lib/mini-auth";

const packagePurchaseSchema = z.object({
  storeCode: storeCodeSchema.optional(),
  templateId: z.string().min(1),
});

function statusForMiniappError(code: string) {
  return code.endsWith("_NOT_FOUND") ? 404 : 400;
}

export async function POST(request: Request) {
  const auth = requireMiniSession(request);
  if (!auth.session) {
    return auth.response;
  }

  const parsed = packagePurchaseSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return fail("INVALID_PARAMS", "套餐购买参数不完整");
  }

  const store = await findAvailableMiniappStore({
    storeCode: parsed.data.storeCode,
    storeId: auth.session.storeId,
  });

  if (!store) {
    return fail("STORE_NOT_FOUND", "当前门店不可用", 404);
  }

  try {
    const purchaseOrder = await createMiniappPackagePurchase({
      storeId: store.id,
      templateId: parsed.data.templateId,
      userId: auth.session.userId,
    });

    return ok({
      purchaseOrder: {
        amountFen: purchaseOrder.amountFen,
        id: purchaseOrder.id,
        payChannel: purchaseOrder.payChannel,
        status: purchaseOrder.status,
        templateId: purchaseOrder.templateId,
      },
    });
  } catch (error) {
    if (error instanceof MiniappServiceError) {
      return fail(error.code, error.message, statusForMiniappError(error.code));
    }

    throw error;
  }
}
