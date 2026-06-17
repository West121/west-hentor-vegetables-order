import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  return ok(session);
}
