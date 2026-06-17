import { z } from "zod";

export const STORE_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{2,31}$/;

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export const apiResponseSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    success: z.boolean(),
    data: data.optional(),
    error: apiErrorSchema.optional(),
  });

export const storeCodeSchema = z
  .string()
  .min(3)
  .max(32)
  .regex(STORE_CODE_PATTERN, "门店编码只能包含小写字母、数字和短横线");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const reservationItemSchema = z.object({
  dishId: z.string().min(1),
  name: z.string().min(1),
  weightJin: z.number().positive(),
});

export const reservationSummarySchema = z.object({
  totalWeightJin: z.number(),
  remainingWeightJin: z.number(),
  isOverLimit: z.boolean(),
  itemCount: z.number().int(),
});

export function calculateReservationSummary(
  items: Array<z.infer<typeof reservationItemSchema>>,
  weightLimitJin: number,
) {
  const totalWeightJin = Number(
    items.reduce((sum, item) => sum + item.weightJin, 0).toFixed(2),
  );
  const remainingWeightJin = Number(
    Math.max(weightLimitJin - totalWeightJin, 0).toFixed(2),
  );

  return {
    totalWeightJin,
    remainingWeightJin,
    isOverLimit: totalWeightJin > weightLimitJin,
    itemCount: items.length,
  };
}

export type ApiError = z.infer<typeof apiErrorSchema>;
export type ReservationItem = z.infer<typeof reservationItemSchema>;
export type ReservationSummary = z.infer<typeof reservationSummarySchema>;
