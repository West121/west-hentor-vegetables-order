import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createMiniappPackagePurchase: vi.fn(),
  findAvailableMiniappStore: vi.fn(),
  requireMiniSession: vi.fn(),
}));

vi.mock("@hentor/db", () => ({
  createMiniappPackagePurchase: mocks.createMiniappPackagePurchase,
  findAvailableMiniappStore: mocks.findAvailableMiniappStore,
  MiniappServiceError: class MiniappServiceError extends Error {
    constructor(
      public readonly code: string,
      message: string,
    ) {
      super(message);
      this.name = "MiniappServiceError";
    }
  },
}));

vi.mock("@/app/lib/mini-auth", () => ({
  requireMiniSession: mocks.requireMiniSession,
}));

function buildPostRequest(body: unknown) {
  return new Request("http://127.0.0.1/api/v1/package-purchases", {
    body: JSON.stringify(body),
    method: "POST",
  });
}

describe("miniapp package purchases route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireMiniSession.mockReturnValue({
      response: null,
      session: {
        issuedAt: 1,
        openid: "openid-1",
        storeId: "store-session-1",
        userId: "user-1",
      },
    });
    mocks.findAvailableMiniappStore.mockResolvedValue({ id: "store-1" });
    mocks.createMiniappPackagePurchase.mockResolvedValue({
      amountFen: 0,
      id: "purchase-1",
      payChannel: "WECHAT",
      status: "PAYMENT_NOT_ENABLED",
      templateId: "template-1",
    });
  });

  it("creates a payment-disabled package purchase intent for the current member", async () => {
    const route = await import("./route");

    const response = await route.POST(
      buildPostRequest({
        storeCode: "lotus-garden",
        templateId: "template-1",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        purchaseOrder: {
          amountFen: 0,
          id: "purchase-1",
          payChannel: "WECHAT",
          status: "PAYMENT_NOT_ENABLED",
          templateId: "template-1",
        },
      },
      success: true,
    });
    expect(mocks.findAvailableMiniappStore).toHaveBeenCalledWith({
      storeCode: "lotus-garden",
      storeId: "store-session-1",
    });
    expect(mocks.createMiniappPackagePurchase).toHaveBeenCalledWith({
      storeId: "store-1",
      templateId: "template-1",
      userId: "user-1",
    });
  });

  it("requires miniapp login before creating purchase intents", async () => {
    const route = await import("./route");
    const authResponse = new Response(
      JSON.stringify({
        error: { code: "UNAUTHORIZED", message: "请先登录" },
        success: false,
      }),
      { status: 401 },
    );
    mocks.requireMiniSession.mockReturnValue({
      response: authResponse,
      session: null,
    });

    const response = await route.POST(
      buildPostRequest({
        storeCode: "lotus-garden",
        templateId: "template-1",
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.findAvailableMiniappStore).not.toHaveBeenCalled();
    expect(mocks.createMiniappPackagePurchase).not.toHaveBeenCalled();
  });

  it("rejects invalid purchase intent payloads before resolving store context", async () => {
    const route = await import("./route");

    const response = await route.POST(buildPostRequest({ storeCode: "lotus-garden" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "INVALID_PARAMS",
        message: "套餐购买参数不完整",
      },
      success: false,
    });
    expect(mocks.findAvailableMiniappStore).not.toHaveBeenCalled();
    expect(mocks.createMiniappPackagePurchase).not.toHaveBeenCalled();
  });

  it("returns STORE_NOT_FOUND when the requested miniapp store is unavailable", async () => {
    const route = await import("./route");
    mocks.findAvailableMiniappStore.mockResolvedValue(null);

    const response = await route.POST(
      buildPostRequest({
        storeCode: "lotus-garden",
        templateId: "template-1",
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "STORE_NOT_FOUND",
        message: "当前门店不可用",
      },
      success: false,
    });
    expect(mocks.createMiniappPackagePurchase).not.toHaveBeenCalled();
  });

  it("maps package template service errors without creating a false payment flow", async () => {
    const route = await import("./route");
    const { MiniappServiceError } = await import("@hentor/db");
    mocks.createMiniappPackagePurchase.mockRejectedValue(
      new MiniappServiceError(
        "PACKAGE_TEMPLATE_NOT_FOUND",
        "套餐模板不存在或已停用",
      ),
    );

    const response = await route.POST(
      buildPostRequest({
        storeCode: "lotus-garden",
        templateId: "disabled-template",
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "PACKAGE_TEMPLATE_NOT_FOUND",
        message: "套餐模板不存在或已停用",
      },
      success: false,
    });
  });
});
