import { describe, expect, it } from "vitest";

import {
  createMiniSessionToken,
  verifyMiniSessionToken,
  type MiniSession,
} from "./mini-session";

const session: MiniSession = {
  issuedAt: 1781700000000,
  openid: "openid-1",
  storeId: "store-1",
  userId: "user-1",
};

describe("mini app session token", () => {
  it("round-trips a valid mini app session", () => {
    const token = createMiniSessionToken(session, "secret");

    expect(verifyMiniSessionToken(token, "secret")).toEqual(session);
  });

  it("rejects tampered mini app sessions", () => {
    const token = createMiniSessionToken(session, "secret");

    expect(verifyMiniSessionToken(`${token}x`, "secret")).toBeNull();
  });
});
