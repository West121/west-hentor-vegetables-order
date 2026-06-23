import { z } from "zod";

import {
  CUTOFF_TIME_PATTERN,
  getTask,
  TaskServiceError,
  updateTask,
} from "@hentor/db";

import {
  getPermissionFailure,
  getStoreAccessFailure,
} from "@/app/lib/admin-access";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const taskSchema = z.object({
  cutoffTime: z.string().regex(CUTOFF_TIME_PATTERN),
  dishIds: z.array(z.string().min(1)).min(1),
  endsAt: z.coerce.date(),
  name: z.string().min(1),
  startsAt: z.coerce.date(),
  status: z.enum(["DRAFT", "ACTIVE", "DISABLED"]),
  storeId: z.string().min(1),
  tag: z.string().nullable().optional(),
});

const querySchema = z.object({
  storeId: z.string().min(1),
});

function statusForTaskError(code: string) {
  return code.endsWith("_NOT_FOUND") ? 404 : 400;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
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
    "tasks.read",
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
    const task = await getTask({
      storeId: parsed.data.storeId,
      taskId,
    });

    return ok({ task });
  } catch (error) {
    if (error instanceof TaskServiceError) {
      return fail(error.code, error.message, statusForTaskError(error.code));
    }

    throw error;
  }
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

export async function PUT(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  return PATCH(request, context);
}
