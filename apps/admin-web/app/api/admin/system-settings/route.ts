import { z } from "zod";

import {
  CUTOFF_TIME_PATTERN,
  getSystemSettings,
  SystemSettingsServiceError,
  updateSystemSettings,
} from "@hentor/db";

import {
  getPermissionFailure,
  getStoreAccessFailure,
} from "@/app/lib/admin-access";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const querySchema = z.object({
  storeId: z.string().min(1),
});

const settingsSchema = z.object({
  aboutText: z.string(),
  cutoffTime: z.string().regex(CUTOFF_TIME_PATTERN),
  customerServiceTel: z.string(),
  deliveryCities: z.array(z.string()).optional(),
  deliveryProvinces: z.array(z.string()).optional(),
  loginImageUrl: z.string(),
  loginSubtitle: z.string(),
  loginTitle: z.string(),
  loginWelcome: z.string(),
  privacyPolicyUrl: z.string(),
  storeId: z.string().min(1),
  userAgreementUrl: z.string(),
});

function statusForSettingsError(code: string) {
  if (code.endsWith("_NOT_FOUND")) {
    return 404;
  }

  return 400;
}

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    storeId: url.searchParams.get("storeId") ?? "",
  });
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "系统设置查询参数不完整");
  }

  const permissionFailure = await getPermissionFailure(
    session.adminUserId,
    "system.manage",
  );
  if (permissionFailure) {
    return permissionFailure;
  }

  const accessFailure = await getStoreAccessFailure(
    session.adminUserId,
    parsed.data.storeId,
  );
  if (accessFailure) {
    return accessFailure;
  }

  try {
    return ok({
      settings: await getSystemSettings({ storeId: parsed.data.storeId }),
    });
  } catch (error) {
    if (error instanceof SystemSettingsServiceError) {
      return fail(error.code, error.message, statusForSettingsError(error.code));
    }

    throw error;
  }
}

export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "系统设置参数不完整");
  }

  const permissionFailure = await getPermissionFailure(
    session.adminUserId,
    "system.manage",
  );
  if (permissionFailure) {
    return permissionFailure;
  }

  const accessFailure = await getStoreAccessFailure(
    session.adminUserId,
    parsed.data.storeId,
  );
  if (accessFailure) {
    return accessFailure;
  }

  try {
    return ok({
      settings: await updateSystemSettings({
        ...parsed.data,
        operatorId: session.adminUserId,
      }),
    });
  } catch (error) {
    if (error instanceof SystemSettingsServiceError) {
      return fail(error.code, error.message, statusForSettingsError(error.code));
    }

    throw error;
  }
}

export async function PUT(request: Request) {
  return PATCH(request);
}
