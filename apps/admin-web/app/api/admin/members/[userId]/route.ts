import { z } from "zod";

import { getStoreMember, MemberServiceError, updateStoreMember } from "@hentor/db";

import {
  getPermissionFailure,
  getStoreAccessFailure,
} from "@/app/lib/admin-access";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const updateSchema = z.object({
  defaultAddress: z
    .object({
      city: z.string().nullable().optional(),
      detail: z.string().nullable().optional(),
      district: z.string().nullable().optional(),
      id: z.string().nullable().optional(),
      province: z.string().nullable().optional(),
      receiverName: z.string().nullable().optional(),
      receiverPhone: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  disabledReason: z.string().nullable().optional(),
  remark: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "DISABLED"]),
  storeId: z.string().min(1),
});

const querySchema = z.object({
  storeId: z.string().min(1),
});

function statusForMemberError(code: string) {
  return code.endsWith("_NOT_FOUND") ? 404 : 400;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    storeId: url.searchParams.get("storeId") ?? "",
  });

  if (!parsed.success) {
    return fail("INVALID_PARAMS", "查询参数不完整");
  }

  const permissionFailure = await getPermissionFailure(
    session.adminUserId,
    "members.read",
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

  const { userId } = await context.params;

  try {
    const member = await getStoreMember({
      storeId: parsed.data.storeId,
      userId,
    });

    return ok({ member });
  } catch (error) {
    if (error instanceof MemberServiceError) {
      return fail(error.code, error.message, statusForMemberError(error.code));
    }

    throw error;
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "会员参数不完整");
  }

  const permissionFailure = await getPermissionFailure(
    session.adminUserId,
    "members.write",
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

  const { userId } = await context.params;

  try {
    const member = await updateStoreMember({
      defaultAddress: parsed.data.defaultAddress,
      disabledReason: parsed.data.disabledReason ?? null,
      operatorId: session.adminUserId,
      remark: parsed.data.remark ?? null,
      status: parsed.data.status,
      storeId: parsed.data.storeId,
      userId,
    });

    return ok({ member });
  } catch (error) {
    if (error instanceof MemberServiceError) {
      return fail(error.code, error.message, statusForMemberError(error.code));
    }

    throw error;
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  return PATCH(request, context);
}
