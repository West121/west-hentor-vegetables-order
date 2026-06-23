import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findAdminUser: vi.fn(),
  findRoles: vi.fn(),
  listAccessibleStores: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@hentor/db", () => ({
  listAccessibleStores: mocks.listAccessibleStores,
  prisma: {
    adminUser: {
      findFirst: mocks.findAdminUser,
    },
    adminRole: {
      findMany: mocks.findRoles,
    },
  },
}));

import {
  getAdminPermissionCodes,
  getPermissionFailure,
  getRoleAssignmentFailure,
} from "./admin-access";

describe("admin role assignment access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listAccessibleStores.mockResolvedValue({
      scope: "ASSIGNED",
      stores: [{ id: "store-1" }],
    });
    mocks.findRoles.mockResolvedValue([]);
    mocks.findAdminUser.mockResolvedValue(null);
  });

  it("rejects super admin role assignment from store-scoped operators", async () => {
    mocks.findRoles.mockResolvedValue([
      {
        code: "super_admin",
        id: "role-super",
        name: "超级管理员",
      },
    ]);

    const response = await getRoleAssignmentFailure("operator-1", [
      "role-super",
    ]);

    expect(response?.status).toBe(403);
    await expect(response?.json()).resolves.toMatchObject({
      error: {
        code: "ROLE_FORBIDDEN",
        message: "无权分配超级管理员角色",
      },
      success: false,
    });
  });

  it("allows all-store operators to assign super admin roles", async () => {
    mocks.listAccessibleStores.mockResolvedValue({
      scope: "ALL",
      stores: [],
    });
    mocks.findRoles.mockResolvedValue([
      {
        code: "super_admin",
        id: "role-super",
        name: "超级管理员",
      },
    ]);

    await expect(
      getRoleAssignmentFailure("operator-1", ["role-super"]),
    ).resolves.toBeNull();
    expect(mocks.findRoles).not.toHaveBeenCalled();
  });

  it("allows store-scoped operators to assign non-super roles", async () => {
    mocks.findRoles.mockResolvedValue([
      {
        code: "store_operator",
        id: "role-store",
        name: "门店运营",
      },
    ]);

    await expect(
      getRoleAssignmentFailure("operator-1", ["role-store"]),
    ).resolves.toBeNull();
    expect(mocks.findRoles).toHaveBeenCalledWith({
      select: {
        code: true,
        id: true,
        name: true,
      },
      where: { id: { in: ["role-store"] } },
    });
  });
});

describe("admin permission access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects operators without the required permission", async () => {
    mocks.findAdminUser.mockResolvedValue({
      roles: [
        {
          role: {
            permissions: [
              { permission: { code: "orders.read" } },
            ],
          },
        },
      ],
    });

    const response = await getPermissionFailure(
      "operator-1",
      "system.manage",
    );

    expect(response?.status).toBe(403);
    await expect(response?.json()).resolves.toMatchObject({
      error: {
        code: "PERMISSION_FORBIDDEN",
        message: "无权执行该操作",
      },
      success: false,
    });
  });

  it("allows operators with the required permission", async () => {
    mocks.findAdminUser.mockResolvedValue({
      roles: [
        {
          role: {
            permissions: [
              { permission: { code: "system.manage" } },
            ],
          },
        },
      ],
    });

    await expect(
      getPermissionFailure("operator-1", "system.manage"),
    ).resolves.toBeNull();
    expect(mocks.findAdminUser).toHaveBeenCalledWith({
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
      where: {
        id: "operator-1",
        status: "ACTIVE",
      },
    });
  });

  it("returns unique permission codes for active operators", async () => {
    mocks.findAdminUser.mockResolvedValue({
      roles: [
        {
          role: {
            permissions: [
              { permission: { code: "system.manage" } },
              { permission: { code: "orders.read" } },
            ],
          },
        },
        {
          role: {
            permissions: [
              { permission: { code: "orders.read" } },
            ],
          },
        },
      ],
    });

    await expect(getAdminPermissionCodes("operator-1")).resolves.toEqual([
      "system.manage",
      "orders.read",
    ]);
  });
});
