import { z } from "zod";

import {
  AddressServiceError,
  createMiniappOperationLog,
  createMiniappAddress,
  findAvailableMiniappStore,
  listMiniappAddresses,
} from "@hentor/db";
import { storeCodeSchema } from "@hentor/shared";

import { fail, ok } from "@/app/lib/api";
import {
  addressAuditRequestParams,
  addressAuditResponseData,
  formatAddressAuditSnapshot,
  maskAddressPhone,
} from "@/app/lib/address-audit";
import { requireMiniSession } from "@/app/lib/mini-auth";
import { getRequestAuditMeta } from "@/app/lib/request-audit";

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

type AddressResponseInput = {
  city: string | null;
  detail: string;
  district: string | null;
  province: string | null;
};

function statusForAddressError(code: string) {
  if (code === "ADDRESS_LIMIT_EXCEEDED") {
    return 409;
  }

  return code.endsWith("_NOT_FOUND") ? 404 : 400;
}

function addressResponse<T extends AddressResponseInput>(address: T) {
  return {
    ...address,
    fullAddress: formatAddressAuditSnapshot(address),
  };
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeCode = searchParams.get("storeCode") ?? "lotus-garden";
  const parsedStoreCode = storeCodeSchema.safeParse(storeCode);

  if (!parsedStoreCode.success) {
    return fail("INVALID_STORE_CODE", "门店编码不正确");
  }

  const sessionStore = await getSessionStore(request, parsedStoreCode.data);
  if (sessionStore.response) {
    return sessionStore.response;
  }

  try {
    return ok(
      await listMiniappAddresses({
        storeId: sessionStore.storeId!,
        userId: sessionStore.session!.userId,
      }),
    );
  } catch (error) {
    if (error instanceof AddressServiceError) {
      return fail(error.code, error.message, statusForAddressError(error.code));
    }

    throw error;
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const parsed = addressSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return fail("INVALID_PARAMS", "地址参数不完整");
  }

  const sessionStore = await getSessionStore(request, parsed.data.storeCode);
  if (sessionStore.response) {
    return sessionStore.response;
  }

  try {
    const address = await createMiniappAddress({
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

    await createMiniappOperationLog({
      action: "MINIAPP_ADDRESS_CREATED",
      afterValue: {
        address: formatAddressAuditSnapshot(address),
        isDefault: address.isDefault,
        receiverName: address.receiverName,
        receiverPhone: maskAddressPhone(address.receiverPhone),
      },
      durationMs: Date.now() - startedAt,
      requestParams: addressAuditRequestParams(parsed.data),
      resource: "address",
      resourceId: address.id,
      responseData: addressAuditResponseData(address),
      storeId: sessionStore.storeId!,
      statusCode: 200,
      userId: sessionStore.session!.userId,
      ...getRequestAuditMeta(request),
    });

    return ok({ address: addressResponse(address) });
  } catch (error) {
    if (error instanceof AddressServiceError) {
      return fail(error.code, error.message, statusForAddressError(error.code));
    }

    throw error;
  }
}
