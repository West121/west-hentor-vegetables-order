import { z } from "zod";

import { createStoreOrder, listStoreOrders, OrderServiceError } from "@hentor/db";

import { getStoreAccessFailure } from "@/app/lib/admin-access";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const querySchema = z.object({
  query: z.string().optional(),
  status: z
    .enum(["PENDING_SHIPMENT", "SHIPPED", "SIGNED", "CANCELED", "VOIDED"])
    .optional(),
  storeId: z.string().min(1),
});

const createSchema = z.object({
  addressId: z.string().min(1),
  internalRemark: z.string().optional(),
  items: z
    .array(
      z.object({
        dishId: z.string().min(1),
        weightJin: z.coerce.number().positive(),
      }),
    )
    .min(1),
  storeId: z.string().min(1),
  userId: z.string().min(1),
  userPackageId: z.string().min(1),
  userVisibleRemark: z.string().optional(),
});

function statusForOrderError(code: string) {
  if (code.endsWith("_NOT_FOUND")) {
    return 404;
  }

  if (
    code === "DISH_STOCK_NOT_ENOUGH" ||
    code === "PACKAGE_UNAVAILABLE" ||
    code === "PACKAGE_USED_UP" ||
    code === "WEIGHT_LIMIT_EXCEEDED"
  ) {
    return 409;
  }

  return 400;
}

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    query: url.searchParams.get("query") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    storeId: url.searchParams.get("storeId") ?? "",
  });

  if (!parsed.success) {
    return fail("INVALID_PARAMS", "查询参数不完整");
  }

  const accessFailure = await getStoreAccessFailure(
    session.adminUserId,
    parsed.data.storeId,
  );
  if (accessFailure) {
    return accessFailure;
  }

  return ok(await listStoreOrders(parsed.data));
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "订单参数不完整");
  }

  const accessFailure = await getStoreAccessFailure(
    session.adminUserId,
    parsed.data.storeId,
  );
  if (accessFailure) {
    return accessFailure;
  }

  try {
    return ok({
      order: await createStoreOrder({
        ...parsed.data,
        operatorId: session.adminUserId,
      }),
    });
  } catch (error) {
    if (error instanceof OrderServiceError) {
      return fail(error.code, error.message, statusForOrderError(error.code));
    }

    throw error;
  }
}
