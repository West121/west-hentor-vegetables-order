import { describe, expect, it } from "vitest";

import { resolveWechatLoginState } from "./wechat-login-model";

describe("wechat login state", () => {
  it("enters one-time binding mode from the callback query", () => {
    expect(
      resolveWechatLoginState(new URLSearchParams("wechatBindToken=bind-1")),
    ).toEqual({ bindToken: "bind-1", mode: "bind" });
  });

  it("surfaces callback errors and defaults to password login", () => {
    expect(
      resolveWechatLoginState(new URLSearchParams("wechatError=授权取消")),
    ).toEqual({ error: "授权取消", mode: "error" });
    expect(resolveWechatLoginState(new URLSearchParams())).toEqual({
      mode: "password",
    });
  });
});
