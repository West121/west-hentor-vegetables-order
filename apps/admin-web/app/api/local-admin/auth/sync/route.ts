import { z } from "zod";

import { fail, ok } from "@/app/lib/api";
import { setAdminSession } from "@/app/lib/session";

const syncSchema = z.object({
  token: z.string().min(1),
});

type SpringAdminSessionResponse = {
  success?: boolean;
  data?: {
    adminUserId?: unknown;
    name?: unknown;
    username?: unknown;
  };
  error?: {
    message?: unknown;
  };
};

function getSpringApiBaseUrl() {
  return (process.env.SPRING_API_BASE_URL || "http://127.0.0.1:8080").replace(
    /\/+$/,
    "",
  );
}

export async function POST(request: Request) {
  const parsed = syncSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "登录态参数不完整");
  }

  const response = await fetch(`${getSpringApiBaseUrl()}/api/spring/admin/auth/me`, {
    cache: "no-store",
    headers: {
      authorization: `Bearer ${parsed.data.token}`,
    },
  }).catch(() => null);

  if (!response?.ok) {
    return fail("SESSION_SYNC_FAILED", "登录态校验失败", 401);
  }

  const payload = (await response.json().catch(() => null)) as
    | SpringAdminSessionResponse
    | null;

  if (!payload?.success) {
    const message =
      typeof payload?.error?.message === "string"
        ? payload.error.message
        : "登录态校验失败";
    return fail("SESSION_SYNC_FAILED", message, 401);
  }

  const session = payload.data;
  if (
    typeof session?.adminUserId !== "string" ||
    typeof session.username !== "string" ||
    typeof session.name !== "string"
  ) {
    return fail("SESSION_SYNC_FAILED", "登录态返回数据不完整", 502);
  }

  await setAdminSession({
    adminUserId: session.adminUserId,
    issuedAt: Date.now(),
    name: session.name,
    username: session.username,
  });

  return ok({ synced: true });
}
