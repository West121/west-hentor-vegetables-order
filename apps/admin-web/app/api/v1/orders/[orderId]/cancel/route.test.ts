import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cancelMiniappOrder: vi.fn(),
  findAvailableMiniappStore: vi.fn(),
  requireMiniSession: vi.fn(),
}));

vi.mock("@hentor/db", () => ({
  cancelMiniappOrder: mocks.cancelMiniappOrder,
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
  return new Request("http://127.0.0.1/api/v1/orders/order-1/cancel", {
    body: JSON.stringify(body),
    method: "POST",
  });
}

describe("miniapp order cancel route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireMiniSession.mockReturnValue({
      response: null,
      session: {
        issuedAt: 1,
        openid: "openid-1",
        storeId: "store-1",
        userId: "user-1",
      },
    });
    mocks.findAvailableMiniappStore.mockResolvedValue({ id: "store-1" });
    mocks.cancelMiniappOrder.mockResolvedValue({
      cancelReason: "临时不需要了",
      canceledAt: new Date("2026-06-18T09:30:00.000Z"),
      id: "order-1",
      status: "CANCELED",
    });
  });

  it("cancels a pending miniapp order with a concrete reason", async () => {
    const route = await import("./route");

    const response = await route.POST(
      buildPostRequest({
        reason: "临时不需要了",
        storeCode: "lotus-garden",
      }),
      { params: Promise.resolve({ orderId: "order-1" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        order: {
          cancelReason: "临时不需要了",
          canceledAt: "2026-06-18T09:30:00.000Z",
          id: "order-1",
          status: "CANCELED",
        },
      },
      success: true,
    });
    expect(mocks.findAvailableMiniappStore).toHaveBeenCalledWith({
      storeCode: "lotus-garden",
      storeId: "store-1",
    });
    expect(mocks.cancelMiniappOrder).toHaveBeenCalledWith({
      orderId: "order-1",
      reason: "临时不需要了",
      storeId: "store-1",
      userId: "user-1",
    });
  });

  it("rejects a blank cancellation reason before touching store or order state", async () => {
    const route = await import("./route");

    const response = await route.POST(
      buildPostRequest({
        reason: "   ",
        storeCode: "lotus-garden",
      }),
      { params: Promise.resolve({ orderId: "order-1" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "INVALID_PARAMS",
      },
      success: false,
    });
    expect(mocks.findAvailableMiniappStore).not.toHaveBeenCalled();
    expect(mocks.cancelMiniappOrder).not.toHaveBeenCalled();
  });
});
