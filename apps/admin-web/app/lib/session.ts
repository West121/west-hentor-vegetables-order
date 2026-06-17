import "server-only";

import { cookies } from "next/headers";

import {
  createSignedSessionToken,
  verifySignedSessionToken,
  type SessionPayload,
} from "./session-token";

export const ADMIN_SESSION_COOKIE = "hentor_admin_session";

export type AdminSession = SessionPayload;

function getSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ??
    "dev-hentor-admin-session-secret-change-before-production"
  );
}

export function createAdminSessionToken(session: AdminSession) {
  return createSignedSessionToken(session, getSecret());
}

export function verifyAdminSessionToken(token?: string): AdminSession | null {
  return verifySignedSessionToken(token, getSecret());
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function setAdminSession(session: AdminSession) {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}
