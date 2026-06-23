import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createMiniappOperationLog: vi.fn(),
  findAvailableMiniappStore: vi.fn(),
  requireMiniSession: vi.fn(),
  setDefaultMiniappAddress: vi.fn(),
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
  findAvailableMiniappStore: mocks.findAvailableMiniappStore,
  setDefaultMiniappAddress: mocks.setDefaultMiniappAddress,
}));

vi.mock("@/app/lib/mini-auth", () => ({
  requireMiniSession: mocks.requireMiniSession,
}));

describe("miniapp set-default address route", () => {
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
    mocks.setDefaultMiniappAddress.mockResolvedValue({
      city: null,
      detail: "南京市六合区龙池街道1",
      district: null,
      id: "address-1",
      isDefault: true,
      province: null,
      receiverName: "徐竹西",
      receiverPhone: "15295081992",
    });
  });

  it("records a miniapp operation log when an address is set as default", async () => {
    const route = await import("./route");

    const response = await route.POST(
      new Request(
        "http://127.0.0.1/api/v1/addresses/address-1/default?storeCode=lotus-garden",
        {
          headers: {
            "user-agent": "miniapp-devtools",
            "x-real-ip": "203.0.113.22",
          },
          method: "POST",
        },
      ),
      { params: Promise.resolve({ addressId: "address-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.setDefaultMiniappAddress).toHaveBeenCalledWith({
      addressId: "address-1",
      storeId: "store-1",
      userId: "user-1",
    });
    expect(mocks.createMiniappOperationLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "MINIAPP_ADDRESS_DEFAULT_SET",
        afterValue: expect.objectContaining({
          address: "南京市六合区龙池街道1",
          isDefault: true,
          receiverPhone: "152****1992",
        }),
        durationMs: expect.any(Number),
        ip: "203.0.113.22",
        requestMethod: "POST",
        requestParams: {
          addressId: "address-1",
          storeCode: "lotus-garden",
        },
        requestPath: "/api/v1/addresses/address-1/default",
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
});
