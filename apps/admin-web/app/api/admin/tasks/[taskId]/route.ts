import { z } from "zod";

import {
  TaskServiceError,
  updateTask,
} from "@hentor/db";

import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const taskSchema = z.object({
  cutoffTime: z.string().regex(/^\d{2}:\d{2}$/),
  dishIds: z.array(z.string().min(1)).min(1),
  endsAt: z.coerce.date(),
  name: z.string().min(1),
  startsAt: z.coerce.date(),
  status: z.enum(["DRAFT", "ACTIVE", "DISABLED"]),
  storeId: z.string().min(1),
  tag: z.string().nullable().optional(),
});

function statusForTaskError(code: string) {
  return code.endsWith("_NOT_FOUND") ? 404 : 400;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const parsed = taskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "任务参数不完整");
  }

  const { taskId } = await context.params;

  try {
    const task = await updateTask({
      ...parsed.data,
      id: taskId,
      operatorId: session.adminUserId,
    });

    return ok({ task });
  } catch (error) {
    if (error instanceof TaskServiceError) {
      return fail(error.code, error.message, statusForTaskError(error.code));
    }

    throw error;
  }
}
