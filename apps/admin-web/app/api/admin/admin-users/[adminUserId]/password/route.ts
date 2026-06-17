import { z } from "zod";

import {
  resetAdminUserPassword,
  SystemManagementServiceError,
} from "@hentor/db";

import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const passwordSchema = z.object({
  newPassword: z.string().min(8),
});

function statusForSystemError(code: string) {
  return code.endsWith("_NOT_FOUND") ? 404 : 400;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ adminUserId: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const parsed = passwordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "密码参数不完整");
  }

  const { adminUserId } = await context.params;

  try {
    const adminUser = await resetAdminUserPassword({
      adminUserId,
      newPassword: parsed.data.newPassword,
      operatorId: session.adminUserId,
    });

    return ok({
      adminUser: {
        id: adminUser.id,
        updatedAt: adminUser.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof SystemManagementServiceError) {
      return fail(error.code, error.message, statusForSystemError(error.code));
    }

    throw error;
  }
}
