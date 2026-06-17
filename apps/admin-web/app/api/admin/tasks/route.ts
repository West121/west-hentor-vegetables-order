import { z } from "zod";

import {
  createTask,
  listTasks,
  TaskServiceError,
} from "@hentor/db";

import { getStoreAccessFailure } from "@/app/lib/admin-access";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const querySchema = z.object({
  query: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "DISABLED"]).optional(),
  storeId: z.string().min(1),
});

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

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    query: url.searchParams.get("query") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    storeId: url.searchParams.get("storeId") ?? "",
  });

  if (!parsed.success) {
    return fail("INVALID_PARAMS", "查询参数不完整");
  }

  const accessFailure = await getStoreAccessFailure(
    session.adminUserId,
    parsed.data.storeId,
  );
  if (accessFailure) {
    return accessFailure;
  }

  return ok(await listTasks(parsed.data));
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const parsed = taskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "任务参数不完整");
  }

  const accessFailure = await getStoreAccessFailure(
    session.adminUserId,
    parsed.data.storeId,
  );
  if (accessFailure) {
    return accessFailure;
  }

  try {
    const task = await createTask({
      ...parsed.data,
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
