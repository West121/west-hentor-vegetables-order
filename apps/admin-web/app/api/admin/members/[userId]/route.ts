import { z } from "zod";

import { MemberServiceError, updateStoreMember } from "@hentor/db";

import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const updateSchema = z.object({
  disabledReason: z.string().nullable().optional(),
  remark: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "DISABLED"]),
  storeId: z.string().min(1),
});

function statusForMemberError(code: string) {
  return code.endsWith("_NOT_FOUND") ? 404 : 400;
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

  const { userId } = await context.params;

  try {
    const member = await updateStoreMember({
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
