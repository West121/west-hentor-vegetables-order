import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createMiniappAddress: vi.fn(),
  createMiniappOperationLog: vi.fn(),
  findAvailableMiniappStore: vi.fn(),
  listMiniappAddresses: vi.fn(),
  requireMiniSession: vi.fn(),
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
  createMiniappAddress: mocks.createMiniappAddress,
  createMiniappOperationLog: mocks.createMiniappOperationLog,
  findAvailableMiniappStore: mocks.findAvailableMiniappStore,
  listMiniappAddresses: mocks.listMiniappAddresses,
}));

vi.mock("@/app/lib/mini-auth", () => ({
  requireMiniSession: mocks.requireMiniSession,
}));

function buildPostRequest(body: unknown) {
  return new Request("http://127.0.0.1/api/v1/addresses", {
    body: JSON.stringify(body),
    method: "POST",
  });
}

describe("miniapp addresses route", () => {
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
    mocks.createMiniappAddress.mockResolvedValue({
      detail: "莲花小区 3 栋 602",
      id: "address-1",
      isDefault: true,
      receiverName: "张建国",
      receiverPhone: "13800007777",
    });
    mocks.listMiniappAddresses.mockResolvedValue({
      defaultAddress: null,
      items: [],
    });
  });

  it("returns a conflict when the user has reached the address limit", async () => {
    const route = await import("./route");
    const { AddressServiceError } = await import("@hentor/db");
    mocks.createMiniappAddress.mockRejectedValue(
      new AddressServiceError(
        "ADDRESS_LIMIT_EXCEEDED",
        "最多只能保存 10 条地址",
      ),
    );

    const response = await route.POST(
      buildPostRequest({
        detail: "莲花小区 3 栋 602",
        receiverName: "张建国",
        receiverPhone: "13800007777",
        storeCode: "lotus-garden",
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "ADDRESS_LIMIT_EXCEEDED",
        message: "最多只能保存 10 条地址",
      },
      success: false,
    });
    expect(mocks.createMiniappAddress).toHaveBeenCalledWith({
      city: undefined,
      detail: "莲花小区 3 栋 602",
      district: undefined,
      isDefault: undefined,
      province: undefined,
      receiverName: "张建国",
      receiverPhone: "13800007777",
      storeId: "store-1",
      userId: "user-1",
    });
    expect(mocks.createMiniappOperationLog).not.toHaveBeenCalled();
  });

  it("records a miniapp operation log when an address is created", async () => {
    const route = await import("./route");

    const response = await route.POST(
      new Request("http://127.0.0.1/api/v1/addresses", {
        body: JSON.stringify({
          detail: "莲花小区 3 栋 602",
          receiverName: "张建国",
          receiverPhone: "13800007777",
          storeCode: "lotus-garden",
        }),
        headers: {
          "user-agent": "miniapp-devtools",
          "x-forwarded-for": "203.0.113.10, 127.0.0.1",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.createMiniappOperationLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "MINIAPP_ADDRESS_CREATED",
        afterValue: expect.objectContaining({
          address: "莲花小区 3 栋 602",
          receiverPhone: "138****7777",
        }),
        durationMs: expect.any(Number),
        ip: "203.0.113.10",
        requestMethod: "POST",
        requestParams: expect.objectContaining({
          detail: "莲花小区 3 栋 602",
          receiverPhone: "138****7777",
          storeCode: "lotus-garden",
        }),
        requestPath: "/api/v1/addresses",
        resource: "address",
        resourceId: "address-1",
        responseData: expect.objectContaining({
          address: expect.objectContaining({
            id: "address-1",
            receiverPhone: "138****7777",
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
