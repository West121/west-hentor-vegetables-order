import { z } from "zod";

import {
  prisma,
  ReservationServiceError,
  submitReservation,
} from "@hentor/db";
import { storeCodeSchema } from "@hentor/shared";

import { fail, ok } from "@/app/lib/api";
import { requireMiniSession } from "@/app/lib/mini-auth";

const reservationItemSchema = z.object({
  dishId: z.string().min(1),
  weightJin: z.coerce.number().positive(),
});

const submitReservationSchema = z.object({
  addressId: z.string().min(1),
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

  if (code === "PACKAGE_UNAVAILABLE" || code === "ORDER_NOT_EDITABLE") {
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

  const storeId = (
    await prisma.store.findFirst({
      where: parsed.data.storeCode
        ? {
            code: parsed.data.storeCode,
            id: auth.session.storeId,
            status: "ACTIVE",
          }
        : { id: auth.session.storeId, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    })
  )?.id;

  if (!storeId) {
    return fail("STORE_NOT_FOUND", "当前门店不可用", 404);
  }

  try {
    const reservation = await submitReservation({
      addressId: parsed.data.addressId,
      items: parsed.data.items,
      orderId: parsed.data.orderId,
      storeId,
      userId: auth.session.userId,
      userPackageId: parsed.data.userPackageId,
      userVisibleRemark: parsed.data.userVisibleRemark,
    });

    return ok({ reservation });
  } catch (error) {
    if (error instanceof ReservationServiceError) {
      return fail(
        error.code,
        error.message,
        statusForReservationError(error.code),
      );
    }

    throw error;
  }
}
