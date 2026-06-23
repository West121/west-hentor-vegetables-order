import {
  AddressServiceError,
  createMiniappOperationLog,
  findAvailableMiniappStore,
  setDefaultMiniappAddress,
} from "@hentor/db";
import { storeCodeSchema } from "@hentor/shared";

import { fail, ok } from "@/app/lib/api";
import {
  addressAuditResponseData,
  formatAddressAuditSnapshot,
  maskAddressPhone,
} from "@/app/lib/address-audit";
import { requireMiniSession } from "@/app/lib/mini-auth";
import { getRequestAuditMeta } from "@/app/lib/request-audit";

function statusForAddressError(code: string) {
  return code.endsWith("_NOT_FOUND") ? 404 : 400;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ addressId: string }> },
) {
  const startedAt = Date.now();
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

  const { addressId } = await context.params;

  try {
    const address = await setDefaultMiniappAddress({
      addressId,
      storeId: store.id,
      userId: auth.session.userId,
    });

    await createMiniappOperationLog({
      action: "MINIAPP_ADDRESS_DEFAULT_SET",
      afterValue: {
        address: formatAddressAuditSnapshot(address),
        isDefault: address.isDefault,
        receiverName: address.receiverName,
        receiverPhone: maskAddressPhone(address.receiverPhone),
      },
      durationMs: Date.now() - startedAt,
      requestParams: {
        addressId,
        storeCode: parsedStoreCode.data,
      },
      resource: "address",
      resourceId: address.id,
      responseData: addressAuditResponseData(address),
      storeId: store.id,
      statusCode: 200,
      userId: auth.session.userId,
      ...getRequestAuditMeta(request),
    });

    return ok({ address });
  } catch (error) {
    if (error instanceof AddressServiceError) {
      return fail(error.code, error.message, statusForAddressError(error.code));
    }

    throw error;
  }
}
