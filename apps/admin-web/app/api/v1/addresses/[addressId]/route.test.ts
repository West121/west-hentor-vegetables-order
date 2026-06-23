import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createMiniappOperationLog: vi.fn(),
  deleteMiniappAddress: vi.fn(),
  findAvailableMiniappStore: vi.fn(),
  requireMiniSession: vi.fn(),
  updateMiniappAddress: vi.fn(),
}));

vi.mock("@hentor/db", () => ({
  AddressServiceError: class AddressServiceError extends Error {
    constructor(
      public readonly code: string,
      message: string,
    ) {
      super(message);
      this.name = "AddressServiceError";
    }
  },
  createMiniappOperationLog: mocks.createMiniappOperationLog,
  deleteMiniappAddress: mocks.deleteMiniappAddress,
  findAvailableMiniappStore: mocks.findAvailableMiniappStore,
  updateMiniappAddress: mocks.updateMiniappAddress,
}));

vi.mock("@/app/lib/mini-auth", () => ({
  requireMiniSession: mocks.requireMiniSession,
}));

function params() {
  return { params: Promise.resolve({ addressId: "address-1" }) };
}

describe("miniapp address resource route", () => {
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
    mocks.updateMiniappAddress.mockResolvedValue({
      city: null,
      detail: "南京市六合区龙池街道1",
      district: null,
      id: "address-1",
      isDefault: true,
      province: null,
      receiverName: "徐竹西",
      receiverPhone: "15295081992",
    });
    mocks.deleteMiniappAddress.mockResolvedValue({ id: "address-1" });
  });

  it("records a miniapp operation log when an address is updated", async () => {
    const route = await import("./route");

    const response = await route.PATCH(
      new Request("http://127.0.0.1/api/v1/addresses/address-1", {
        body: JSON.stringify({
          detail: "南京市六合区龙池街道1",
          isDefault: true,
          receiverName: "徐竹西",
          receiverPhone: "15295081992",
          storeCode: "lotus-garden",
        }),
        headers: {
          "user-agent": "miniapp-devtools",
          "x-real-ip": "203.0.113.20",
        },
        method: "PATCH",
      }),
      params(),
    );

    expect(response.status).toBe(200);
    expect(mocks.updateMiniappAddress).toHaveBeenCalledWith({
      addressId: "address-1",
      city: undefined,
      detail: "南京市六合区龙池街道1",
      district: undefined,
      isDefault: true,
      province: undefined,
      receiverName: "徐竹西",
      receiverPhone: "15295081992",
      storeId: "store-1",
      userId: "user-1",
    });
    expect(mocks.createMiniappOperationLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "MINIAPP_ADDRESS_UPDATED",
        afterValue: expect.objectContaining({
          address: "南京市六合区龙池街道1",
          receiverPhone: "152****1992",
        }),
        durationMs: expect.any(Number),
        ip: "203.0.113.20",
        requestMethod: "PATCH",
        requestParams: expect.objectContaining({
          addressId: "address-1",
          detail: "南京市六合区龙池街道1",
          receiverPhone: "152****1992",
          storeCode: "lotus-garden",
        }),
        requestPath: "/api/v1/addresses/address-1",
        resource: "address",
        resourceId: "address-1",
        responseData: expect.objectContaining({
          address: expect.objectContaining({
            id: "address-1",
            receiverPhone: "152****1992",
          }),
          success: true,
        }),
        storeId: "store-1",
        statusCode: 200,
        userAgent: "miniapp-devtools",
        userId: "user-1",
      }),
    );
  });

  it("records a miniapp operation log when an address is deleted", async () => {
    const route = await import("./route");

    const response = await route.DELETE(
      new Request(
        "http://127.0.0.1/api/v1/addresses/address-1?storeCode=lotus-garden",
        {
          headers: {
            "user-agent": "miniapp-devtools",
            "x-forwarded-for": "203.0.113.21, 127.0.0.1",
          },
          method: "DELETE",
        },
      ),
      params(),
    );

    expect(response.status).toBe(200);
    expect(mocks.createMiniappOperationLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "MINIAPP_ADDRESS_DELETED",
        durationMs: expect.any(Number),
        ip: "203.0.113.21",
        requestMethod: "DELETE",
        requestParams: {
          addressId: "address-1",
          storeCode: "lotus-garden",
        },
        requestPath: "/api/v1/addresses/address-1",
        resource: "address",
        resourceId: "address-1",
        responseData: {
          address: {
            id: "address-1",
          },
          success: true,
        },
        storeId: "store-1",
        statusCode: 200,
        userAgent: "miniapp-devtools",
        userId: "user-1",
      }),
    );
  });
});
