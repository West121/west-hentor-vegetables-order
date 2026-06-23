import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { exchangeWechatLoginCode, exchangeWechatPhoneCode } from "./wechat";

describe("wechat api client", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
  });

  it("uses a configurable api base url for local login smoke tests", async () => {
    process.env.WECHAT_APP_ID = "wx-test-app";
    process.env.WECHAT_APP_SECRET = "wx-test-secret";
    process.env.WECHAT_API_BASE_URL = "http://127.0.0.1:18080/wechat";
    const requestedUrls: string[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: URL | string, init?: RequestInit) => {
        const url = String(input);
        requestedUrls.push(url);

        if (url.includes("/sns/jscode2session")) {
          return Response.json({
            openid: "openid-smoke",
            session_key: "session-key",
            unionid: "unionid-smoke",
          });
        }

        if (url.includes("/cgi-bin/token")) {
          return Response.json({
            access_token: "access-token-smoke",
            expires_in: 7200,
          });
        }

        if (url.includes("/wxa/business/getuserphonenumber")) {
          expect(init?.method).toBe("POST");
          expect(init?.body).toBe(JSON.stringify({ code: "phone-code" }));
          return Response.json({
            errcode: 0,
            phone_info: {
              countryCode: "86",
              purePhoneNumber: "13800007521",
            },
          });
        }

        return Response.json({ errmsg: "unexpected url" }, { status: 404 });
      }),
    );

    await expect(exchangeWechatLoginCode("login-code")).resolves.toMatchObject({
      openid: "openid-smoke",
      unionid: "unionid-smoke",
    });
    await expect(exchangeWechatPhoneCode("phone-code")).resolves.toEqual({
      countryCode: "86",
      phone: "13800007521",
    });

    expect(requestedUrls).toEqual([
      "http://127.0.0.1:18080/wechat/sns/jscode2session?appid=wx-test-app&secret=wx-test-secret&js_code=login-code&grant_type=authorization_code",
      "http://127.0.0.1:18080/wechat/cgi-bin/token?grant_type=client_credential&appid=wx-test-app&secret=wx-test-secret",
      "http://127.0.0.1:18080/wechat/wxa/business/getuserphonenumber?access_token=access-token-smoke",
    ]);
  });
});
