import { z } from "zod";

import {
  PackageTemplateServiceError,
  updatePackageTemplate,
} from "@hentor/db";

import { getStoreAccessFailure } from "@/app/lib/admin-access";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const updateSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.coerce.number().int().optional(),
  status: z.enum(["ACTIVE", "DISABLED"]),
  storeId: z.string().min(1),
  totalTimes: z.coerce.number().int().min(1),
  validDays: z.coerce.number().int().min(1),
  weightLimitJin: z.coerce.number().positive(),
});

function statusForTemplateError(code: string) {
  return code.endsWith("_NOT_FOUND") ? 404 : 400;
}

function serializeTemplate(
  template: Awaited<ReturnType<typeof updatePackageTemplate>>,
) {
  return {
    createdAt: template.createdAt,
    id: template.id,
    name: template.name,
    sortOrder: template.sortOrder,
    status: template.status,
    totalTimes: template.totalTimes,
    updatedAt: template.updatedAt,
    validDays: template.validDays,
    weightLimitJin: Number(template.weightLimitJin),
  };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ templateId: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("INVALID_PARAMS", "套餐模板参数不完整");
  }

  const accessFailure = await getStoreAccessFailure(
    session.adminUserId,
    parsed.data.storeId,
  );
  if (accessFailure) {
    return accessFailure;
  }

  const { templateId } = await context.params;

  try {
    const template = await updatePackageTemplate({
      ...parsed.data,
      id: templateId,
      operatorId: session.adminUserId,
    });

    return ok({ template: serializeTemplate(template) });
  } catch (error) {
    if (error instanceof PackageTemplateServiceError) {
      return fail(error.code, error.message, statusForTemplateError(error.code));
    }

    throw error;
  }
}
