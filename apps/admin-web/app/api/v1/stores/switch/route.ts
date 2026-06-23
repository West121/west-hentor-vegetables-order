import { z } from "zod";

import { MiniappServiceError, switchMiniappStore } from "@hentor/db";

import { fail, ok } from "@/app/lib/api";
import { createMiniToken, requireMiniSession } from "@/app/lib/mini-auth";

const switchStoreSchema = z.object({
  storeId: z.string().min(1),
});

function statusForSwitchStoreError(code: string) {
  if (code === "STORE_BINDING_NOT_FOUND" || code.endsWith("_NOT_FOUND")) {
    return 404;
  }

  if (code === "STORE_NOT_AVAILABLE") {
    return 409;
  }

  return 400;
}

export async function POST(request: Request) {
  const auth = requireMiniSession(request);
  if (!auth.session) {
    return auth.response;
  }

  const parsed = switchStoreSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "门店参数不完整");
  }

  try {
    const store = await switchMiniappStore({
      storeId: parsed.data.storeId,
      userId: auth.session.userId,
    });

    return ok({
      store,
      token: createMiniToken({
        issuedAt: Date.now(),
        openid: auth.session.openid,
        storeId: store.id,
        userId: auth.session.userId,
      }),
    });
  } catch (error) {
    if (error instanceof MiniappServiceError) {
      return fail(
        error.code,
        error.message,
        statusForSwitchStoreError(error.code),
      );
    }

    throw error;
  }
}
