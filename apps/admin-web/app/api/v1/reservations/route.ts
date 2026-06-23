import { z } from "zod";

import {
  findAvailableMiniappStore,
  ReservationServiceError,
  submitReservation,
} from "@hentor/db";
import { storeCodeSchema } from "@hentor/shared";

import { fail, isServiceErrorLike, ok } from "@/app/lib/api";
import { requireMiniSession } from "@/app/lib/mini-auth";

const reservationItemSchema = z.object({
  dishId: z.string().min(1),
  weightJin: z.coerce.number().positive(),
});

const benefitSelectionSchema = z.object({
  quantity: z.coerce.number().positive(),
  userPackageBenefitId: z.string().min(1),
});

const submitReservationSchema = z.object({
  addressId: z.string().min(1),
  benefitSelections: z.array(benefitSelectionSchema).optional(),
  items: z.array(reservationItemSchema).min(1),
  orderId: z.string().optional(),
  storeCode: storeCodeSchema.optional(),
  userPackageId: z.string().min(1),
  userVisibleRemark: z.string().max(200).optional(),
});

function statusForReservationError(code: string) {
  if (code.endsWith("_NOT_FOUND")) {
    return 404;
  }

  if (
    code === "PACKAGE_UNAVAILABLE" ||
    code === "ORDER_ALREADY_EXISTS" ||
    code === "ORDER_NOT_EDITABLE"
  ) {
    return 409;
  }

  return 400;
}

export async function POST(request: Request) {
  const auth = requireMiniSession(request);
  if (!auth.session) {
    return auth.response;
  }

  const parsed = submitReservationSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return fail("INVALID_PARAMS", "预订参数不完整");
  }

  const store = await findAvailableMiniappStore({
    storeCode: parsed.data.storeCode,
    storeId: auth.session.storeId,
  });

  if (!store) {
    return fail("STORE_NOT_FOUND", "当前门店不可用", 404);
  }

  try {
    const reservation = await submitReservation({
      addressId: parsed.data.addressId,
      benefitSelections: parsed.data.benefitSelections,
      items: parsed.data.items,
      orderId: parsed.data.orderId,
      storeId: store.id,
      userId: auth.session.userId,
      userPackageId: parsed.data.userPackageId,
      userVisibleRemark: parsed.data.userVisibleRemark,
    });

    return ok({ reservation });
  } catch (error) {
    if (
      error instanceof ReservationServiceError ||
      isServiceErrorLike(error, "ReservationServiceError")
    ) {
      return fail(
        error.code,
        error.message,
        statusForReservationError(error.code),
      );
    }

    throw error;
  }
}
