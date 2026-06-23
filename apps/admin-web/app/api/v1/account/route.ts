import { z } from "zod";

import {
  cancelMiniappAccount,
  createMiniappOperationLog,
  findAvailableMiniappStore,
  MiniappServiceError,
  prisma,
} from "@hentor/db";
import { storeCodeSchema } from "@hentor/shared";

import { fail, ok } from "@/app/lib/api";
import { requireMiniSession } from "@/app/lib/mini-auth";
import { getRequestAuditMeta } from "@/app/lib/request-audit";

const cancelAccountSchema = z.object({
  reason: z.string().min(1).optional(),
  storeCode: storeCodeSchema.optional(),
});

const updateAccountSchema = z.object({
  nickname: z.string().trim().min(1).max(24),
  storeCode: storeCodeSchema.optional(),
});

function statusForMiniappError(code: string) {
  return code.endsWith("_NOT_FOUND") || code === "STORE_REQUIRED" ? 404 : 400;
}

export async function PATCH(request: Request) {
  const startedAt = Date.now();
  const auth = requireMiniSession(request);
  if (!auth.session) {
    return auth.response;
  }

  const parsed = updateAccountSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "昵称不能为空，最多 24 个字符");
  }

  const store = await findAvailableMiniappStore({
    storeCode: parsed.data.storeCode,
    storeId: auth.session.storeId,
  });

  if (!store) {
    return fail("STORE_NOT_FOUND", "当前门店不可用", 404);
  }

  const before = await prisma.user.findUnique({
    select: { nickname: true },
    where: { id: auth.session.userId },
  });

  if (!before) {
    return fail("USER_NOT_FOUND", "会员不存在", 404);
  }

  const user = await prisma.user.update({
    data: { nickname: parsed.data.nickname },
    select: {
      id: true,
      nickname: true,
      phone: true,
    },
    where: { id: auth.session.userId },
  });

  await createMiniappOperationLog({
    action: "MINIAPP_PROFILE_UPDATED",
    afterValue: { nickname: user.nickname },
    beforeValue: { nickname: before.nickname },
    durationMs: Date.now() - startedAt,
    requestParams: {
      nickname: parsed.data.nickname,
      storeCode: parsed.data.storeCode ?? null,
    },
    resource: "miniapp_profile",
    resourceId: user.id,
    responseData: {
      member: {
        id: user.id,
        nickname: user.nickname,
      },
    },
    statusCode: 200,
    storeId: store.id,
    userId: user.id,
    ...getRequestAuditMeta(request),
  });

  return ok({
    member: {
      id: user.id,
      nickname: user.nickname,
      phone: user.phone,
    },
  });
}

export async function DELETE(request: Request) {
  const auth = requireMiniSession(request);
  if (!auth.session) {
    return auth.response;
  }

  const parsed = cancelAccountSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "注销参数不完整");
  }

  const store = await findAvailableMiniappStore({
    storeCode: parsed.data.storeCode,
    storeId: auth.session.storeId,
  });

  if (!store) {
    return fail("STORE_NOT_FOUND", "当前门店不可用", 404);
  }

  try {
    return ok({
      account: await cancelMiniappAccount({
        reason: parsed.data.reason ?? "用户主动注销",
        storeId: store.id,
        userId: auth.session.userId,
      }),
    });
  } catch (error) {
    if (error instanceof MiniappServiceError) {
      return fail(error.code, error.message, statusForMiniappError(error.code));
    }

    throw error;
  }
}
