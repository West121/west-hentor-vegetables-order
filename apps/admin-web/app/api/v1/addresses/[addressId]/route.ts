import { z } from "zod";

import {
  AddressServiceError,
  findAvailableMiniappStore,
  updateMiniappAddress,
} from "@hentor/db";
import { storeCodeSchema } from "@hentor/shared";

import { fail, ok } from "@/app/lib/api";
import { requireMiniSession } from "@/app/lib/mini-auth";

const addressSchema = z.object({
  city: z.string().nullable().optional(),
  detail: z.string().min(1),
  district: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
  province: z.string().nullable().optional(),
  receiverName: z.string().min(1),
  receiverPhone: z.string().min(1),
  storeCode: storeCodeSchema.optional(),
});

function statusForAddressError(code: string) {
  return code.endsWith("_NOT_FOUND") ? 404 : 400;
}

async function getSessionStore(request: Request, storeCode?: string) {
  const auth = requireMiniSession(request);
  if (!auth.session) {
    return { response: auth.response, session: null, storeId: null };
  }

  const store = await findAvailableMiniappStore({
    storeCode,
    storeId: auth.session.storeId,
  });

  if (!store) {
    return {
      response: fail("STORE_NOT_FOUND", "当前门店不可用", 404),
      session: auth.session,
      storeId: null,
    };
  }

  return {
    response: null,
    session: auth.session,
    storeId: store.id,
  };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ addressId: string }> },
) {
  const parsed = addressSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return fail("INVALID_PARAMS", "地址参数不完整");
  }

  const sessionStore = await getSessionStore(request, parsed.data.storeCode);
  if (sessionStore.response) {
    return sessionStore.response;
  }

  const { addressId } = await context.params;

  try {
    const address = await updateMiniappAddress({
      addressId,
      city: parsed.data.city,
      detail: parsed.data.detail,
      district: parsed.data.district,
      isDefault: parsed.data.isDefault,
      province: parsed.data.province,
      receiverName: parsed.data.receiverName,
      receiverPhone: parsed.data.receiverPhone,
      storeId: sessionStore.storeId!,
      userId: sessionStore.session!.userId,
    });

    return ok({ address });
  } catch (error) {
    if (error instanceof AddressServiceError) {
      return fail(error.code, error.message, statusForAddressError(error.code));
    }

    throw error;
  }
}
