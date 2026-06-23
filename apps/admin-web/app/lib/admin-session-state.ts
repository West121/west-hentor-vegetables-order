import type { SessionPayload } from "./session-token";

export type AdminSessionAccountState = {
  status: "ACTIVE" | "DISABLED";
};

export async function validateActiveAdminSession(
  session: SessionPayload | null,
  loadAccountState: (
    adminUserId: string,
  ) => Promise<AdminSessionAccountState | null>,
) {
  if (!session?.adminUserId) {
    return null;
  }

  const account = await loadAccountState(session.adminUserId);
  return account?.status === "ACTIVE" ? session : null;
}
