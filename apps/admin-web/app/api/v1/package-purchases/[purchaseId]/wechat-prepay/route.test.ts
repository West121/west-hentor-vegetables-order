import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findAvailableMiniappStore: vi.fn(),
  requireMiniSession: vi.fn(),
  reserveMiniappWechatPrepay: vi.fn(),
}));

vi.mock("@hentor/db", () => ({
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
  reserveMiniappWechatPrepay: mocks.reserveMiniappWechatPrepay,
}));

vi.mock("@/app/lib/mini-auth", () => ({
  requireMiniSession: mocks.requireMiniSession,
}));

function buildPostRequest(storeCode = "lotus-garden") {
  return new Request(
    `http://127.0.0.1/api/v1/package-purchases/purchase-1/wechat-prepay?storeCode=${storeCode}`,
    { method: "POST" },
  );
}

describe("miniapp package purchase wechat prepay route", () => {
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
    mocks.reserveMiniappWechatPrepay.mockResolvedValue({
      id: "purchase-1",
      status: "PAYMENT_NOT_ENABLED",
    });
  });

  it("reserves the WeChat prepay boundary without enabling real payment", async () => {
    const route = await import("./route");

    const response = await route.POST(buildPostRequest(), {
      params: Promise.resolve({ purchaseId: "purchase-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        prepay: {
          id: "purchase-1",
          status: "PAYMENT_NOT_ENABLED",
        },
      },
      success: true,
    });
    expect(mocks.findAvailableMiniappStore).toHaveBeenCalledWith({
      storeCode: "lotus-garden",
      storeId: "store-session-1",
    });
    expect(mocks.reserveMiniappWechatPrepay).toHaveBeenCalledWith({
      purchaseOrderId: "purchase-1",
      storeId: "store-1",
      userId: "user-1",
    });
  });

  it("requires miniapp login before reserving prepay", async () => {
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

    const response = await route.POST(buildPostRequest(), {
      params: Promise.resolve({ purchaseId: "purchase-1" }),
    });

    expect(response.status).toBe(401);
    expect(mocks.findAvailableMiniappStore).not.toHaveBeenCalled();
    expect(mocks.reserveMiniappWechatPrepay).not.toHaveBeenCalled();
  });

  it("rejects invalid store codes before store lookup", async () => {
    const route = await import("./route");

    const response = await route.POST(buildPostRequest("bad code"), {
      params: Promise.resolve({ purchaseId: "purchase-1" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "INVALID_STORE_CODE",
        message: "门店编码不正确",
      },
      success: false,
    });
    expect(mocks.findAvailableMiniappStore).not.toHaveBeenCalled();
    expect(mocks.reserveMiniappWechatPrepay).not.toHaveBeenCalled();
  });

  it("returns STORE_NOT_FOUND when the payment store context is unavailable", async () => {
    const route = await import("./route");
    mocks.findAvailableMiniappStore.mockResolvedValue(null);

    const response = await route.POST(buildPostRequest(), {
      params: Promise.resolve({ purchaseId: "purchase-1" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "STORE_NOT_FOUND",
        message: "当前门店不可用",
      },
      success: false,
    });
    expect(mocks.reserveMiniappWechatPrepay).not.toHaveBeenCalled();
  });

  it("maps missing purchase orders to a not-found prepay response", async () => {
    const route = await import("./route");
    const { MiniappServiceError } = await import("@hentor/db");
    mocks.reserveMiniappWechatPrepay.mockRejectedValue(
      new MiniappServiceError(
        "PACKAGE_PURCHASE_NOT_FOUND",
        "套餐购买意向单不存在",
      ),
    );

    const response = await route.POST(buildPostRequest(), {
      params: Promise.resolve({ purchaseId: "missing-purchase" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "PACKAGE_PURCHASE_NOT_FOUND",
        message: "套餐购买意向单不存在",
      },
      success: false,
    });
  });
});
