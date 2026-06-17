import { z } from "zod";

import {
  adjustDishInventory,
  DishServiceError,
  type Dish,
} from "@hentor/db";

import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const inventorySchema = z.object({
  changeJin: z.coerce.number(),
  reason: z.string().min(1),
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
    return fail("INVALID_PARAMS", "库存调整参数不完整");
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
