import { findAvailableMiniappStore, getMiniappProfile } from "@hentor/db";
import { storeCodeSchema } from "@hentor/shared";

import { fail, ok } from "@/app/lib/api";
import { requireMiniSession } from "@/app/lib/mini-auth";

export async function GET(request: Request) {
  const auth = requireMiniSession(request);
  if (!auth.session) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const storeCode = searchParams.get("storeCode") ?? "lotus-garden";
  const parsedStoreCode = storeCodeSchema.safeParse(storeCode);

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

  return ok(
    await getMiniappProfile({
      storeId: store.id,
      userId: auth.session.userId,
    }),
  );
}
