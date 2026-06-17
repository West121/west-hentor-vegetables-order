import { z } from "zod";

import {
  createStore,
  listAccessibleStores,
  listStores,
  StoreManagementServiceError,
} from "@hentor/db";

import { getAllStoresAccessFailure } from "@/app/lib/admin-access";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const querySchema = z.object({
  query: z.string().optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
  type: z.enum(["DIRECT", "FRANCHISE"]).optional(),
});

const storeSchema = z.object({
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  code: z.string().min(1),
  contactName: z.string().min(1),
  contactPhone: z.string().min(1),
  customerServiceTel: z.string().nullable().optional(),
  cutoffTime: z.string().min(1),
  district: z.string().nullable().optional(),
  franchiseEndsAt: z.coerce.date().nullable().optional(),
  franchiseeId: z.string().nullable().optional(),
  name: z.string().min(1),
  province: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "DISABLED"]),
  type: z.enum(["DIRECT", "FRANCHISE"]),
});

function statusForStoreError(code: string) {
  if (code.endsWith("_NOT_FOUND")) {
    return 404;
  }

  if (code.endsWith("_EXISTS")) {
    return 409;
  }

  return 400;
}

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const access = await listAccessibleStores(session.adminUserId);
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    query: url.searchParams.get("query") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
  });

  if (!parsed.success) {
    return fail("INVALID_PARAMS", "门店查询参数不正确");
  }

  const result = await listStores({
    ...parsed.data,
    ...(access.scope === "ALL"
      ? {}
      : { storeIds: access.stores.map((store) => store.id) }),
  });

  return ok({
    stores: result.items.map((store) => ({
      address: store.address,
      addressDetail: store.addressDetail,
      adminUserCount: store.adminUserCount,
      city: store.city,
      code: store.code,
      contactName: store.contactName,
      contactPhone: store.contactPhone,
      createdAt: store.createdAt,
      customerServiceTel: store.customerServiceTel,
      cutoffTime: store.cutoffTime,
      district: store.district,
      franchiseEndsAt: store.franchiseEndsAt,
      franchiseeId: store.franchiseeId,
      franchiseeName: store.franchisee?.name ?? "总部直营",
      id: store.id,
      memberCount: store.memberCount,
      name: store.name,
      orderCount: store.orderCount,
      packageTemplateCount: store.packageTemplateCount,
      province: store.province,
      status: store.status,
      type: store.type,
      updatedAt: store.updatedAt,
    })),
    summary: result.summary,
  });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const accessFailure = await getAllStoresAccessFailure(session.adminUserId);
  if (accessFailure) {
    return accessFailure;
  }

  const parsed = storeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "门店参数不完整");
  }

  try {
    const store = await createStore({
      ...parsed.data,
      operatorId: session.adminUserId,
    });

    return ok({
      store: {
        id: store.id,
        name: store.name,
        status: store.status,
        type: store.type,
      },
    });
  } catch (error) {
    if (error instanceof StoreManagementServiceError) {
      return fail(error.code, error.message, statusForStoreError(error.code));
    }

    throw error;
  }
}
