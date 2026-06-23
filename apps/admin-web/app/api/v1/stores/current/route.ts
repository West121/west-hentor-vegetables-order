import { listMiniappMemberStores } from "@hentor/db";

import { fail, ok } from "@/app/lib/api";
import { requireMiniSession } from "@/app/lib/mini-auth";

export async function GET(request: Request) {
  const auth = requireMiniSession(request);
  if (!auth.session) {
    return auth.response;
  }

  const stores = await listMiniappMemberStores({
    storeId: auth.session.storeId,
    userId: auth.session.userId,
  });

  if (!stores.currentStore) {
    return fail("STORE_NOT_FOUND", "当前门店不可用", 404);
  }

  return ok(stores);
}
