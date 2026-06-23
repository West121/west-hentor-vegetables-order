import { z } from "zod";

import { OrderServiceError, shipOrder } from "@hentor/db";

import {
  getPermissionFailure,
  getStoreAccessFailure,
} from "@/app/lib/admin-access";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const shipOrderSchema = z.object({
  logisticsNo: z.string().optional(),
  shipments: z
    .array(
      z.object({
        logisticsNo: z.string().min(1, "请输入运单号"),
        packageName: z.string().min(1, "请输入包裹名称"),
        packageType: z.string().optional(),
      }),
    )
    .optional(),
  storeId: z.string().min(1),
});

function statusForOrderError(code: string) {
  if (code.endsWith("_NOT_FOUND")) {
    return 404;
  }

  if (code === "ORDER_NOT_SHIPPABLE") {
    return 409;
  }

  return 400;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const parsed = shipOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "发货参数不完整");
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
    const order = await shipOrder({
      logisticsNo: parsed.data.logisticsNo,
      operatorId: session.adminUserId,
      orderId,
      shipments: parsed.data.shipments,
      storeId: parsed.data.storeId,
    });

	    return ok({
	      order: {
	        id: order.id,
	        logisticsNo: order.logisticsNo,
	        shippedAt: order.shippedAt?.toISOString(),
	        shipments:
	          parsed.data.shipments?.map((shipment) => ({
	            logisticsNo: shipment.logisticsNo,
	            packageName: shipment.packageName,
	            packageType: shipment.packageType ?? "EXTRA",
	            shippedAt: order.shippedAt?.toISOString(),
	            status: "SHIPPED",
	          })) ??
	          (order.logisticsNo
	            ? [
	                {
	                  logisticsNo: order.logisticsNo,
	                  packageName: "蔬菜包裹",
	                  packageType: "VEGETABLE",
	                  shippedAt: order.shippedAt?.toISOString(),
	                  status: "SHIPPED",
	                },
	              ]
	            : []),
	        status: order.status,
	      },
	    });
  } catch (error) {
    if (error instanceof OrderServiceError) {
      return fail(error.code, error.message, statusForOrderError(error.code));
    }

    throw error;
  }
}
