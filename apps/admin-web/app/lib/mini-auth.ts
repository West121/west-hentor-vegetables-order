import "server-only";

import { fail } from "@/app/lib/api";
import {
  createMiniSessionToken,
  verifyMiniSessionToken,
  type MiniSession,
} from "@/app/lib/mini-session";

function getSecret() {
  return (
    process.env.MINI_SESSION_SECRET ??
    process.env.ADMIN_SESSION_SECRET ??
    "dev-hentor-mini-session-secret-change-before-production"
  );
}

export function createMiniToken(session: MiniSession) {
  return createMiniSessionToken(session, getSecret());
}

export function getMiniSessionFromRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : undefined;

  return verifyMiniSessionToken(token, getSecret());
}

export function requireMiniSession(request: Request) {
  const session = getMiniSessionFromRequest(request);

  if (!session) {
    return {
      response: fail("UNAUTHORIZED", "请先登录", 401),
      session: null,
    };
  }

  return {
    response: null,
    session,
  };
}
