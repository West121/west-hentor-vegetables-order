import { z } from "zod";

import {
  createDish,
  DishServiceError,
  listDishes,
  type Dish,
} from "@hentor/db";

import { getStoreAccessFailure } from "@/app/lib/admin-access";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const querySchema = z.object({
  category: z
    .enum(["LEAFY", "FRUIT", "ROOT", "MUSHROOM", "ACTIVITY"])
    .optional(),
  query: z.string().optional(),
  status: z.enum(["ON_SALE", "OFF_SALE"]).optional(),
  storeId: z.string().min(1),
});

const createSchema = z.object({
  category: z.enum(["LEAFY", "FRUIT", "ROOT", "MUSHROOM", "ACTIVITY"]),
  description: z.string().nullable().optional(),
  imageKey: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  name: z.string().min(1),
  sortOrder: z.coerce.number().int().optional(),
  status: z.enum(["ON_SALE", "OFF_SALE"]).optional(),
  stepJin: z.coerce.number().positive(),
  stockJin: z.coerce.number().min(0),
  storeId: z.string().min(1),
});

function statusForDishError(code: string) {
  return code.endsWith("_NOT_FOUND") ? 404 : 400;
}

function serializeDish(dish: Dish) {
  return {
    category: dish.category,
    createdAt: dish.createdAt,
    deletedAt: dish.deletedAt,
    description: dish.description,
    id: dish.id,
    imageKey: dish.imageKey,
    imageUrl: dish.imageUrl,
    name: dish.name,
    sortOrder: dish.sortOrder,
    status: dish.status,
    stepJin: Number(dish.stepJin),
    stockJin: Number(dish.stockJin),
    updatedAt: dish.updatedAt,
  };
}

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    category: url.searchParams.get("category") ?? undefined,
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

  return ok(await listDishes(parsed.data));
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "菜品参数不完整");
  }

  const accessFailure = await getStoreAccessFailure(
    session.adminUserId,
    parsed.data.storeId,
  );
  if (accessFailure) {
    return accessFailure;
  }

  try {
    const dish = await createDish({
      ...parsed.data,
      operatorId: session.adminUserId,
    });

    return ok({ dish: serializeDish(dish) });
  } catch (error) {
    if (error instanceof DishServiceError) {
      return fail(error.code, error.message, statusForDishError(error.code));
    }

    throw error;
  }
}
