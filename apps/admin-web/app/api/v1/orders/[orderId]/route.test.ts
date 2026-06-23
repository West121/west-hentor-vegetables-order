import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findAvailableMiniappStore: vi.fn(),
  requireMiniSession: vi.fn(),
  submitReservation: vi.fn(),
}));

vi.mock("@hentor/db", () => ({
  findAvailableMiniappStore: mocks.findAvailableMiniappStore,
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

function buildPutRequest(body: unknown) {
  return new Request("http://127.0.0.1/api/v1/orders/order-edit-1", {
    body: JSON.stringify(body),
    method: "PUT",
  });
}

describe("miniapp order detail route", () => {
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
      id: "order-edit-1",
      items: [{ dishId: "dish-1", dishNameSnapshot: "菠菜", weightJin: 1.5 }],
      orderNo: "OD202606180001",
      status: "PENDING_SHIPMENT",
      totalWeightJin: 1.5,
    });
  });

  it("updates a pending reservation through PUT /api/v1/orders/:id", async () => {
    const route = await import("./route");

    expect(route.PUT).toBeTypeOf("function");

    const response = await route.PUT(
      buildPutRequest({
        addressId: "address-1",
        benefitSelections: [
          { quantity: "1", userPackageBenefitId: "benefit-egg-1" },
        ],
        items: [{ dishId: "dish-1", weightJin: "1.5" }],
        storeCode: "lotus-garden",
        userPackageId: "package-1",
        userVisibleRemark: "少放根茎类",
      }),
      { params: Promise.resolve({ orderId: "order-edit-1" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        reservation: {
          id: "order-edit-1",
          items: [{ dishId: "dish-1", dishNameSnapshot: "菠菜", weightJin: 1.5 }],
          orderNo: "OD202606180001",
          status: "PENDING_SHIPMENT",
          totalWeightJin: 1.5,
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
      benefitSelections: [
        { quantity: 1, userPackageBenefitId: "benefit-egg-1" },
      ],
      items: [{ dishId: "dish-1", weightJin: 1.5 }],
      orderId: "order-edit-1",
      storeId: "store-1",
      userId: "user-1",
      userPackageId: "package-1",
      userVisibleRemark: "少放根茎类",
    });
  });

  it("returns a business error when service error identity is not preserved", async () => {
    const route = await import("./route");
    mocks.submitReservation.mockRejectedValueOnce({
      code: "STORE_REQUIRED",
      message: "请先绑定当前门店后再预订",
      name: "ReservationServiceError",
    });

    const response = await route.PUT(
      buildPutRequest({
        addressId: "address-1",
        items: [{ dishId: "dish-1", weightJin: "1.5" }],
        storeCode: "lotus-garden",
        userPackageId: "package-1",
      }),
      { params: Promise.resolve({ orderId: "order-edit-1" }) },
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
