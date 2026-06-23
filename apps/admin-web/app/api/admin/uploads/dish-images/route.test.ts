import { describe, expect, it, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDishImageObjectKey: vi.fn(),
  getAdminSession: vi.fn(),
  getPermissionFailure: vi.fn(),
  uploadObject: vi.fn(),
}));

vi.mock("@/app/lib/object-storage", () => ({
  createDishImageObjectKey: mocks.createDishImageObjectKey,
  uploadObject: mocks.uploadObject,
}));

vi.mock("@/app/lib/session", () => ({
  getAdminSession: mocks.getAdminSession,
}));

vi.mock("@/app/lib/admin-access", () => ({
  getPermissionFailure: mocks.getPermissionFailure,
}));

import { POST } from "./route";

const adminSession = {
  adminUserId: "admin-1",
  issuedAt: 1,
  name: "系统管理员",
  username: "admin",
};

function buildUploadRequest(file?: File) {
  const formData = new FormData();
  if (file) {
    formData.set("file", file);
  }

  return new Request("http://127.0.0.1/api/admin/uploads/dish-images", {
    body: formData,
    method: "POST",
  });
}

describe("admin dish image upload route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createDishImageObjectKey.mockReturnValue("dishes/test-image.png");
    mocks.uploadObject.mockResolvedValue({
      bucket: "hentor-assets",
      key: "dishes/test-image.png",
      url: "http://localhost:9000/hentor-assets/dishes/test-image.png",
    });
    mocks.getPermissionFailure.mockResolvedValue(null);
  });

  it("requires an active admin session", async () => {
    mocks.getAdminSession.mockResolvedValue(null);

    const response = await POST(
      buildUploadRequest(
        new File(["image-bytes"], "spinach.png", { type: "image/png" }),
      ),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "UNAUTHORIZED" },
      success: false,
    });
    expect(mocks.uploadObject).not.toHaveBeenCalled();
  });

  it("requires dish write permission before reading upload content", async () => {
    mocks.getAdminSession.mockResolvedValue(adminSession);
    mocks.getPermissionFailure.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: "PERMISSION_FORBIDDEN", message: "无权执行该操作" },
          success: false,
        }),
        { status: 403 },
      ),
    );

    const response = await POST(buildUploadRequest());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "PERMISSION_FORBIDDEN" },
      success: false,
    });
    expect(mocks.getPermissionFailure).toHaveBeenCalledWith(
      "admin-1",
      "dishes.write",
    );
    expect(mocks.uploadObject).not.toHaveBeenCalled();
  });

  it("rejects unsupported image types before uploading", async () => {
    mocks.getAdminSession.mockResolvedValue(adminSession);

    const response = await POST(
      buildUploadRequest(
        new File(["image-bytes"], "spinach.gif", { type: "image/gif" }),
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "IMAGE_TYPE_INVALID" },
      success: false,
    });
    expect(mocks.uploadObject).not.toHaveBeenCalled();
  });

  it("rejects images larger than 3MB before uploading", async () => {
    mocks.getAdminSession.mockResolvedValue(adminSession);
    const tooLarge = new File(
      [new Uint8Array(3 * 1024 * 1024 + 1)],
      "spinach.png",
      { type: "image/png" },
    );

    const response = await POST(buildUploadRequest(tooLarge));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "IMAGE_TOO_LARGE" },
      success: false,
    });
    expect(mocks.uploadObject).not.toHaveBeenCalled();
  });

  it("uploads a supported image and returns the public image reference", async () => {
    mocks.getAdminSession.mockResolvedValue(adminSession);
    const image = new File([new Uint8Array([1, 2, 3])], "菠菜.PNG", {
      type: "image/png",
    });

    const response = await POST(buildUploadRequest(image));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        image: {
          key: "dishes/test-image.png",
          url: "http://localhost:9000/hentor-assets/dishes/test-image.png",
        },
      },
      success: true,
    });
    expect(mocks.createDishImageObjectKey).toHaveBeenCalledWith({
      fileName: "菠菜.PNG",
    });
    expect(mocks.uploadObject).toHaveBeenCalledWith({
      contentType: "image/png",
      key: "dishes/test-image.png",
      value: Buffer.from([1, 2, 3]),
    });
  });
});
