import { describe, expect, it } from "vitest";

import { validateActiveAdminSession } from "./admin-session-state";
import type { SessionPayload } from "./session-token";

const session: SessionPayload = {
  adminUserId: "admin-1",
  issuedAt: 1781700000000,
  name: "Xu West",
  username: "admin",
};

describe("active admin session validation", () => {
  it("keeps an active backend account session", async () => {
    await expect(
      validateActiveAdminSession(session, async () => ({ status: "ACTIVE" })),
    ).resolves.toEqual(session);
  });

  it("rejects disabled and deleted backend account sessions", async () => {
    await expect(
      validateActiveAdminSession(session, async () => ({ status: "DISABLED" })),
    ).resolves.toBeNull();

    await expect(
      validateActiveAdminSession(session, async () => null),
    ).resolves.toBeNull();
  });

  it("keeps missing or malformed session payloads empty", async () => {
    await expect(
      validateActiveAdminSession(null, async () => ({ status: "ACTIVE" })),
    ).resolves.toBeNull();
  });
});
