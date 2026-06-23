import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createMiniToken: vi.fn(),
  createMiniappOperationLog: vi.fn(),
  exchangeWechatLoginCode: vi.fn(),
  exchangeWechatPhoneCode: vi.fn(),
  findAvailableMiniappStore: vi.fn(),
  memberStoreBindingUpsert: vi.fn(),
  userCreate: vi.fn(),
  userFindFirst: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
}));

vi.mock("@hentor/db", () => ({
  createMiniappOperationLog: mocks.createMiniappOperationLog,
  findAvailableMiniappStore: mocks.findAvailableMiniappStore,
  prisma: {
    memberStoreBinding: {
      upsert: mocks.memberStoreBindingUpsert,
    },
    user: {
      create: mocks.userCreate,
      findFirst: mocks.userFindFirst,
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
    },
  },
}));

vi.mock("@/app/lib/mini-auth", () => ({
  createMiniToken: mocks.createMiniToken,
}));

vi.mock("@/app/lib/wechat", () => ({
  exchangeWechatLoginCode: mocks.exchangeWechatLoginCode,
  exchangeWechatPhoneCode: mocks.exchangeWechatPhoneCode,
}));

describe("miniapp wx phone login route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.exchangeWechatLoginCode.mockResolvedValue({
      openid: "openid-1",
      unionid: "unionid-1",
    });
    mocks.exchangeWechatPhoneCode.mockResolvedValue({
      phone: "15295081992",
    });
    mocks.findAvailableMiniappStore.mockResolvedValue({
      code: "lotus-garden",
      id: "store-1",
      name: "莲花小区店",
    });
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.userFindFirst.mockResolvedValue(null);
    mocks.userCreate.mockResolvedValue({
      defaultStoreId: "store-1",
      id: "user-1",
      nickname: null,
      openid: "openid-1",
      phone: "15295081992",
      status: "ACTIVE",
    });
    mocks.memberStoreBindingUpsert.mockResolvedValue({ id: "binding-1" });
    mocks.createMiniToken.mockReturnValue("mini-session-token");
  });

  it("records a miniapp operation log after phone login succeeds", async () => {
    const route = await import("./route");

    const response = await route.POST(
      new Request("http://127.0.0.1/api/v1/auth/wx-phone", {
        body: JSON.stringify({
          loginCode: "login-code",
          phoneCode: "phone-code",
          storeCode: "lotus-garden",
        }),
        headers: {
          "user-agent": "wechat-devtools",
          "x-forwarded-for": "203.0.113.11",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.createMiniappOperationLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "MINIAPP_PHONE_LOGIN",
        afterValue: {
          phone: "152****1992",
          storeCode: "lotus-garden",
        },
        durationMs: expect.any(Number),
        ip: "203.0.113.11",
        requestMethod: "POST",
        requestParams: {
          loginCode: "[provided]",
          phoneCode: "[provided]",
          storeCode: "lotus-garden",
        },
        requestPath: "/api/v1/auth/wx-phone",
        resource: "miniapp_session",
        resourceId: "user-1",
        responseData: expect.objectContaining({
          store: expect.objectContaining({ code: "lotus-garden" }),
          success: true,
          token: "[issued]",
          user: expect.objectContaining({ phone: "152****1992" }),
        }),
        storeId: "store-1",
        statusCode: 200,
        userAgent: "wechat-devtools",
        userId: "user-1",
      }),
    );
    await expect(response.json()).resolves.toMatchObject({
      data: {
        token: "mini-session-token",
      },
      success: true,
    });
  });

  it("merges a phone-login user into an imported member placeholder", async () => {
    mocks.userFindFirst.mockResolvedValue({
      defaultStoreId: "store-1",
      id: "imported-user-1",
      nickname: "导入会员",
      openid: "imported-phone:15295081992",
      phone: "15295081992",
      status: "ACTIVE",
    });
    mocks.userUpdate.mockResolvedValue({
      defaultStoreId: "store-1",
      id: "imported-user-1",
      nickname: "导入会员",
      openid: "openid-1",
      phone: "15295081992",
      status: "ACTIVE",
    });

    const route = await import("./route");

    const response = await route.POST(
      new Request("http://127.0.0.1/api/v1/auth/wx-phone", {
        body: JSON.stringify({
          loginCode: "login-code",
          phoneCode: "phone-code",
          storeCode: "lotus-garden",
        }),
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.userCreate).not.toHaveBeenCalled();
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      data: {
        defaultStoreId: "store-1",
        openid: "openid-1",
        phone: "15295081992",
        unionid: "unionid-1",
      },
      where: { id: "imported-user-1" },
    });
  });
});
