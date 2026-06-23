import { z } from "zod";

import {
  getStoreOrder,
  OrderServiceError,
  updateOrderInternalRemark,
} from "@hentor/db";

import {
  getPermissionFailure,
  getStoreAccessFailure,
} from "@/app/lib/admin-access";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const updateSchema = z.object({
  internalRemark: z.string(),
  storeId: z.string().min(1),
});

const detailSchema = z.object({
  storeId: z.string().min(1),
});

function statusForOrderError(code: string) {
  return code.endsWith("_NOT_FOUND") ? 404 : 400;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const url = new URL(request.url);
  const parsed = detailSchema.safeParse({
    storeId: url.searchParams.get("storeId") ?? undefined,
  });

  if (!parsed.success) {
    return fail("INVALID_PARAMS", "订单参数不完整");
  }

  const permissionFailure = await getPermissionFailure(
    session.adminUserId,
    "orders.read",
  );
  if (permissionFailure) {
    return permissionFailure;
  }

  const accessFailure = await getStoreAccessFailure(
    session.adminUserId,
    parsed.data.storeId,
  );
  if (accessFailure) {
    return accessFailure;
  }

  const { orderId } = await context.params;

  try {
    return ok({
      order: await getStoreOrder({
        orderId,
        storeId: parsed.data.storeId,
      }),
    });
  } catch (error) {
    if (error instanceof OrderServiceError) {
      return fail(error.code, error.message, statusForOrderError(error.code));
    }

    throw error;
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "订单参数不完整");
  }

  const permissionFailure = await getPermissionFailure(
    session.adminUserId,
    "orders.write",
  );
  if (permissionFailure) {
    return permissionFailure;
  }

  const accessFailure = await getStoreAccessFailure(
    session.adminUserId,
    parsed.data.storeId,
  );
  if (accessFailure) {
    return accessFailure;
  }

  const { orderId } = await context.params;

  try {
    const order = await updateOrderInternalRemark({
      internalRemark: parsed.data.internalRemark,
      operatorId: session.adminUserId,
      orderId,
      storeId: parsed.data.storeId,
    });

    return ok({
      order: {
        id: order.id,
        internalRemark: order.internalRemark,
      },
    });
  } catch (error) {
    if (error instanceof OrderServiceError) {
      return fail(error.code, error.message, statusForOrderError(error.code));
    }

    throw error;
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  return PATCH(request, context);
}
