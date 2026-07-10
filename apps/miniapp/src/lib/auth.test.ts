import { beforeEach, describe, expect, it, vi } from "vitest";

const taro = vi.hoisted(() => ({
  getStorageSync: vi.fn(),
  login: vi.fn(),
  navigateTo: vi.fn(),
  removeStorageSync: vi.fn(),
  request: vi.fn(),
  setStorageSync: vi.fn(),
}));

vi.mock("@tarojs/taro", () => ({
  default: taro,
}));

import {
  buildWxSessionLoginUrl,
  getMiniSessionToken,
  MINI_SESSION_LOGGED_OUT_KEY,
  MINI_SESSION_TOKEN_KEY,
  rememberMiniSessionLogout,
  refreshMiniSessionToken,
  requestWithMiniSession,
} from "./auth";
import { ACTIVE_STORE_CODE_KEY } from "./stores";

describe("miniapp auth session helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds the Spring WeChat session refresh URL", () => {
    expect(buildWxSessionLoginUrl("https://mmprd.hentor.com:8203")).toBe(
      "https://mmprd.hentor.com:8203/api/v1/auth/wx-session",
    );
  });

  it("uses wx.login to refresh and remember a miniapp session token", async () => {
    taro.login.mockResolvedValue({ code: "wx-code-1" });
    taro.request.mockResolvedValue({
      data: {
        data: {
          store: { code: "lotus-garden" },
          token: "fresh-token",
        },
        success: true,
      },
      statusCode: 200,
    });

    await expect(
      refreshMiniSessionToken({
        apiBaseUrl: "https://mmprd.hentor.com:8203",
        storeCode: "lotus-garden",
      }),
    ).resolves.toBe("fresh-token");

    expect(taro.request).toHaveBeenCalledWith({
      data: {
        loginCode: "wx-code-1",
        storeCode: "lotus-garden",
      },
      method: "POST",
      url: "https://mmprd.hentor.com:8203/api/v1/auth/wx-session",
    });
    expect(taro.setStorageSync).toHaveBeenCalledWith(
      MINI_SESSION_TOKEN_KEY,
      "fresh-token",
    );
    expect(taro.setStorageSync).toHaveBeenCalledWith(
      ACTIVE_STORE_CODE_KEY,
      "lotus-garden",
    );
    expect(taro.removeStorageSync).toHaveBeenCalledWith(
      MINI_SESSION_LOGGED_OUT_KEY,
    );
  });

  it("remembers explicit logout and blocks silent WeChat session refresh", async () => {
    taro.getStorageSync.mockImplementation((key: string) => {
      if (key === MINI_SESSION_LOGGED_OUT_KEY) {
        return "1";
      }
      return "";
    });

    await expect(
      getMiniSessionToken({
        apiBaseUrl: "https://mmprd.hentor.com:8203",
        storeCode: "lotus-garden",
      }),
    ).rejects.toThrow("请先登录");

    expect(taro.login).not.toHaveBeenCalled();
    expect(taro.request).not.toHaveBeenCalled();
  });

  it("marks explicit logout without deleting the selected store", () => {
    rememberMiniSessionLogout();

    expect(taro.removeStorageSync).toHaveBeenCalledWith(MINI_SESSION_TOKEN_KEY);
    expect(taro.setStorageSync).toHaveBeenCalledWith(
      MINI_SESSION_LOGGED_OUT_KEY,
      "1",
    );
    expect(taro.removeStorageSync).not.toHaveBeenCalledWith(
      ACTIVE_STORE_CODE_KEY,
    );
  });

  it("retries the original request once when the stored token expires", async () => {
    taro.getStorageSync.mockReturnValue("stale-token");
    taro.login.mockResolvedValue({ code: "wx-code-2" });
    taro.request.mockResolvedValue({
      data: {
        data: {
          store: { code: "lotus-garden" },
          token: "refreshed-token",
        },
        success: true,
      },
      statusCode: 200,
    });
    const authedRequest = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          error: { code: "UNAUTHORIZED", message: "登录已过期" },
          success: false,
        },
        statusCode: 401,
      })
      .mockResolvedValueOnce({
        data: { data: { ok: true }, success: true },
        statusCode: 200,
      });

    await expect(
      requestWithMiniSession({
        apiBaseUrl: "https://mmprd.hentor.com:8203",
        request: authedRequest,
        storeCode: "lotus-garden",
      }),
    ).resolves.toMatchObject({
      data: { data: { ok: true }, success: true },
    });

    expect(authedRequest).toHaveBeenNthCalledWith(1, "stale-token");
    expect(authedRequest).toHaveBeenNthCalledWith(2, "refreshed-token");
    expect(taro.navigateTo).not.toHaveBeenCalled();
  });

  it("redirects to login only when the WeChat session cannot be rebound", async () => {
    taro.getStorageSync.mockReturnValue("");
    taro.login.mockResolvedValue({ code: "wx-code-3" });
    taro.request.mockResolvedValue({
      data: {
        error: { code: "WECHAT_SESSION_UNBOUND", message: "请先使用手机号登录" },
        success: false,
      },
      statusCode: 401,
    });

    await expect(
      requestWithMiniSession({
        apiBaseUrl: "https://mmprd.hentor.com:8203",
        request: vi.fn(),
        storeCode: "lotus-garden",
      }),
    ).rejects.toThrow("请先使用手机号登录");

    expect(taro.removeStorageSync).toHaveBeenCalledWith(MINI_SESSION_TOKEN_KEY);
    expect(taro.navigateTo).toHaveBeenCalledWith({
      url: "/pages/login/index",
    });
  });
});
