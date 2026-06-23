import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findAvailableMiniappStore: vi.fn(),
  listMiniappOrders: vi.fn(),
  requireMiniSession: vi.fn(),
  submitReservation: vi.fn(),
}));

vi.mock("@hentor/db", () => ({
  findAvailableMiniappStore: mocks.findAvailableMiniappStore,
  listMiniappOrders: mocks.listMiniappOrders,
  ReservationServiceError: class ReservationServiceError extends Error {
    constructor(
      public readonly code: string,
      message: string,
    ) {
      super(message);
      this.name = "ReservationServiceError";
    }
  },
  submitReservation: mocks.submitReservation,
}));

vi.mock("@/app/lib/mini-auth", () => ({
  requireMiniSession: mocks.requireMiniSession,
}));

function buildPostRequest(body: unknown) {
  return new Request("http://127.0.0.1/api/v1/orders", {
    body: JSON.stringify(body),
    method: "POST",
  });
}

describe("miniapp orders route", () => {
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
    mocks.submitReservation.mockResolvedValue({
      id: "order-1",
      items: [{ dishId: "dish-1", dishNameSnapshot: "菠菜", weightJin: 1 }],
      orderNo: "OD202606180001",
      status: "PENDING_SHIPMENT",
      totalWeightJin: 1,
    });
  });

  it("creates or updates an order through the reservation transaction", async () => {
    const route = await import("./route");

    expect(route.POST).toBeTypeOf("function");

    const response = await route.POST(
      buildPostRequest({
        addressId: "address-1",
        items: [{ dishId: "dish-1", weightJin: "1" }],
        orderId: "order-edit-1",
        storeCode: "lotus-garden",
        userPackageId: "package-1",
        userVisibleRemark: "不要香菜",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        reservation: {
          id: "order-1",
          items: [{ dishId: "dish-1", dishNameSnapshot: "菠菜", weightJin: 1 }],
          orderNo: "OD202606180001",
          status: "PENDING_SHIPMENT",
          totalWeightJin: 1,
        },
      },
      success: true,
    });
    expect(mocks.findAvailableMiniappStore).toHaveBeenCalledWith({
      storeCode: "lotus-garden",
      storeId: "store-1",
    });
    expect(mocks.submitReservation).toHaveBeenCalledWith({
      addressId: "address-1",
      items: [{ dishId: "dish-1", weightJin: 1 }],
      orderId: "order-edit-1",
      storeId: "store-1",
      userId: "user-1",
      userPackageId: "package-1",
      userVisibleRemark: "不要香菜",
    });
  });

  it("returns a business error when service error identity is not preserved", async () => {
    const route = await import("./route");
    mocks.submitReservation.mockRejectedValueOnce({
      code: "STORE_REQUIRED",
      message: "请先绑定当前门店后再预订",
      name: "ReservationServiceError",
    });

    const response = await route.POST(
      buildPostRequest({
        addressId: "address-1",
        items: [{ dishId: "dish-1", weightJin: "1" }],
        storeCode: "lotus-garden",
        userPackageId: "package-1",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "STORE_REQUIRED",
        message: "请先绑定当前门店后再预订",
      },
      success: false,
    });
  });
});
