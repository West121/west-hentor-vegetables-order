import {
  getMiniappStorePublicSettings,
  MiniappServiceError,
} from "@hentor/db";
import { storeCodeSchema } from "@hentor/shared";

import { fail, ok } from "@/app/lib/api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeCode = searchParams.get("storeCode") ?? "lotus-garden";
  const parsedStoreCode = storeCodeSchema.safeParse(storeCode);

  if (!parsedStoreCode.success) {
    return fail("INVALID_STORE_CODE", "门店编码不正确");
  }

  try {
    return ok(
      await getMiniappStorePublicSettings({
        storeCode: parsedStoreCode.data,
      }),
    );
  } catch (error) {
    if (error instanceof MiniappServiceError) {
      return fail(error.code, error.message, 404);
    }

    throw error;
  }
}
