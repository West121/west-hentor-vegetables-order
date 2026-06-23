import { z } from "zod";

import {
  buildKuaidi100PrintTasks,
  buildOrderPrintLabels,
  OrderServiceError,
  recordKuaidi100PrintResults,
} from "@hentor/db";

import {
  getPermissionFailure,
  getStoreAccessFailure,
} from "@/app/lib/admin-access";
import { fail } from "@/app/lib/api";
import {
  getKuaidi100MissingConfig,
  submitKuaidi100CloudPrint,
} from "@/app/lib/kuaidi100";
import { getAdminSession } from "@/app/lib/session";

const printQuerySchema = z.object({
  orderIds: z.string().min(1),
  storeId: z.string().min(1),
});

const cloudPrintSchema = z.object({
  includePrinted: z.boolean().optional(),
  orderIds: z.array(z.string().min(1)).min(1),
  storeId: z.string().min(1),
});

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const url = new URL(request.url);
  const parsed = printQuerySchema.safeParse({
    orderIds: url.searchParams.get("orderIds") ?? "",
    storeId: url.searchParams.get("storeId") ?? "",
  });

  if (!parsed.success) {
    return fail("INVALID_PARAMS", "打印参数不完整");
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

  try {
    const result = await buildOrderPrintLabels({
      orderIds: parsed.data.orderIds.split(","),
      storeId: parsed.data.storeId,
    });

    return new Response(result.html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "x-print-label-count": String(result.labels.length),
      },
    });
  } catch (error) {
    if (error instanceof OrderServiceError) {
      return fail(error.code, error.message);
    }

    throw error;
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const parsed = cloudPrintSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "打印参数不完整");
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

  const missingConfig = getKuaidi100MissingConfig();
  if (missingConfig.length > 0) {
    return fail(
      "KUAIDI100_CONFIG_MISSING",
      `快递100配置缺失：${missingConfig.join(", ")}`,
      400,
    );
  }

  try {
    const { tasks } = await buildKuaidi100PrintTasks({
      includePrinted: parsed.data.includePrinted,
      orderIds: parsed.data.orderIds,
      storeId: parsed.data.storeId,
    });
    const successes = [];
    const failures: Array<{
      message: string;
      orderNo: string;
      packageName: string;
      shipmentId: string;
    }> = [];

    for (const task of tasks) {
      try {
        successes.push(await submitKuaidi100CloudPrint(task));
      } catch (error) {
        failures.push({
          message: error instanceof Error ? error.message : "快递100云打印失败",
          orderNo: task.orderNo,
          packageName: task.packageName,
          shipmentId: task.shipmentId,
        });
      }
    }

    const recorded =
      successes.length > 0
        ? await recordKuaidi100PrintResults({
            operatorId: session.adminUserId,
            results: successes.map((success) => ({
              kuaidinum: success.kuaidinum,
              shipmentId: success.shipmentId,
              taskId: success.taskId,
            })),
            storeId: parsed.data.storeId,
          })
        : { updated: [] };

    return Response.json({
      data: {
        failureCount: failures.length,
        failures,
        successCount: successes.length,
        updated: recorded.updated,
      },
      success: failures.length === 0,
    });
  } catch (error) {
    if (error instanceof OrderServiceError) {
      return fail(error.code, error.message);
    }

    throw error;
  }
}
