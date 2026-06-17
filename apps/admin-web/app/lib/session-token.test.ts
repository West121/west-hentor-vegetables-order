import { describe, expect, it } from "vitest";

import {
  createSignedSessionToken,
  verifySignedSessionToken,
  type SessionPayload,
} from "./session-token";

const payload: SessionPayload = {
  adminUserId: "admin-1",
  username: "admin",
  name: "Xu West",
  issuedAt: 1781700000000,
};

describe("signed admin session token", () => {
  it("round-trips a valid payload", () => {
    const token = createSignedSessionToken(payload, "secret");
    expect(verifySignedSessionToken(token, "secret")).toEqual(payload);
  });

  it("rejects tampered signatures", () => {
    const token = createSignedSessionToken(payload, "secret");
    expect(verifySignedSessionToken(`${token}x`, "secret")).toBeNull();
  });

  it("rejects tokens signed with another secret", () => {
    const token = createSignedSessionToken(payload, "secret");
    expect(verifySignedSessionToken(token, "other-secret")).toBeNull();
  });
});
