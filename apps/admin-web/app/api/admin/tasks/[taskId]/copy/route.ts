import { z } from "zod";

import {
  copyTask,
  TaskServiceError,
} from "@hentor/db";

import { getStoreAccessFailure } from "@/app/lib/admin-access";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const copySchema = z.object({
  name: z.string().min(1),
  storeId: z.string().min(1),
});

function statusForTaskError(code: string) {
  return code.endsWith("_NOT_FOUND") ? 404 : 400;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const parsed = copySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "复制参数不完整");
  }

  const accessFailure = await getStoreAccessFailure(
    session.adminUserId,
    parsed.data.storeId,
  );
  if (accessFailure) {
    return accessFailure;
  }

  const { taskId } = await context.params;

  try {
    const task = await copyTask({
      id: taskId,
      name: parsed.data.name,
      operatorId: session.adminUserId,
      storeId: parsed.data.storeId,
    });

    return ok({ task });
  } catch (error) {
    if (error instanceof TaskServiceError) {
      return fail(error.code, error.message, statusForTaskError(error.code));
    }

    throw error;
  }
}
