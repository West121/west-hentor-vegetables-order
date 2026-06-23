import { z } from "zod";

import {
  adjustDishInventory,
  DishServiceError,
  type Dish,
} from "@hentor/db";

import {
  getPermissionFailure,
  getStoreAccessFailure,
} from "@/app/lib/admin-access";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const inventorySchema = z.object({
  changeJin: z.coerce.number().finite(),
  reason: z.string().trim().min(1),
  storeId: z.string().min(1),
});

function statusForDishError(code: string) {
  return code.endsWith("_NOT_FOUND") ? 404 : 400;
}

function serializeDish(dish: Dish) {
  return {
    id: dish.id,
    status: dish.status,
    stockJin: Number(dish.stockJin),
    updatedAt: dish.updatedAt,
  };
}

function inventoryValidationMessage(
  error: z.ZodError<z.infer<typeof inventorySchema>>,
) {
  const fields = error.flatten().fieldErrors;
  if (fields.changeJin?.length) {
    return "请输入有效的库存调整斤数";
  }
  if (fields.reason?.length) {
    return "请输入库存调整原因";
  }
  if (fields.storeId?.length) {
    return "库存调整参数不完整";
  }

  return "库存调整参数不完整";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ dishId: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const parsed = inventorySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("INVALID_PARAMS", inventoryValidationMessage(parsed.error));
  }

  const permissionFailure = await getPermissionFailure(
    session.adminUserId,
    "dishes.write",
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

  const { dishId } = await context.params;

  try {
    const dish = await adjustDishInventory({
      changeJin: parsed.data.changeJin,
      dishId,
      operatorId: session.adminUserId,
      reason: parsed.data.reason,
      storeId: parsed.data.storeId,
    });

    return ok({ dish: serializeDish(dish) });
  } catch (error) {
    if (error instanceof DishServiceError) {
      return fail(error.code, error.message, statusForDishError(error.code));
    }

    throw error;
  }
}
