import { z } from "zod";

import {
  copyTask,
  TaskServiceError,
} from "@hentor/db";

import {
  getPermissionFailure,
  getStoreAccessFailure,
} from "@/app/lib/admin-access";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const copySchema = z.object({
  cutoffTime: z.string().min(1),
  dishIds: z.array(z.string().min(1)).min(1),
  endsAt: z.coerce.date(),
  name: z.string().min(1),
  startsAt: z.coerce.date(),
  storeId: z.string().min(1),
  tag: z.string().nullable().optional(),
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

  const permissionFailure = await getPermissionFailure(
    session.adminUserId,
    "tasks.write",
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

  const { taskId } = await context.params;

  try {
    const task = await copyTask({
      cutoffTime: parsed.data.cutoffTime,
      dishIds: parsed.data.dishIds,
      endsAt: parsed.data.endsAt,
      id: taskId,
      name: parsed.data.name,
      operatorId: session.adminUserId,
      startsAt: parsed.data.startsAt,
      storeId: parsed.data.storeId,
      tag: parsed.data.tag,
    });

    return ok({ task });
  } catch (error) {
    if (error instanceof TaskServiceError) {
      return fail(error.code, error.message, statusForTaskError(error.code));
    }

    throw error;
  }
}
