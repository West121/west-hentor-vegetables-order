import { z } from "zod";

import {
  getPackageTemplate,
  PackageTemplateServiceError,
  updatePackageTemplate,
} from "@hentor/db";

import {
  getPermissionFailure,
  getStoreAccessFailure,
} from "@/app/lib/admin-access";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const benefitSchema = z.object({
  kind: z.string().optional(),
  name: z.string().min(1),
  sortOrder: z.coerce.number().int().optional(),
  totalQuantity: z.coerce.number().positive(),
  unit: z.string().min(1),
});

const INTERNAL_VALID_DAYS = 36500;

const updateSchema = z.object({
  benefits: z.array(benefitSchema).optional(),
  name: z.string().min(1),
  sortOrder: z.coerce.number().int().optional(),
  status: z.enum(["ACTIVE", "DISABLED"]),
  storeId: z.string().min(1),
  totalTimes: z.coerce.number().int().min(1),
  validDays: z.coerce.number().int().min(1).optional().default(INTERNAL_VALID_DAYS),
  weightLimitJin: z.coerce.number().positive(),
});

const querySchema = z.object({
  storeId: z.string().min(1),
});

function statusForTemplateError(code: string) {
  return code.endsWith("_NOT_FOUND") ? 404 : 400;
}

function serializeTemplate(
  template: Awaited<ReturnType<typeof updatePackageTemplate>>,
) {
  return {
    benefits: template.benefits.map((benefit) => ({
      id: benefit.id,
      kind: benefit.kind,
      name: benefit.name,
      shipmentGroup: benefit.shipmentGroup,
      sortOrder: benefit.sortOrder,
      totalQuantity: Number(benefit.totalQuantity),
      unit: benefit.unit,
    })),
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

export async function GET(
  request: Request,
  context: { params: Promise<{ templateId: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    storeId: url.searchParams.get("storeId") ?? "",
  });

  if (!parsed.success) {
    return fail("INVALID_PARAMS", "查询参数不完整");
  }

  const permissionFailure = await getPermissionFailure(
    session.adminUserId,
    "packages.read",
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

  const { templateId } = await context.params;

  try {
    const template = await getPackageTemplate({
      storeId: parsed.data.storeId,
      templateId,
    });

    return ok({ template });
  } catch (error) {
    if (error instanceof PackageTemplateServiceError) {
      return fail(error.code, error.message, statusForTemplateError(error.code));
    }

    throw error;
  }
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

  const permissionFailure = await getPermissionFailure(
    session.adminUserId,
    "packages.write",
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

export async function PUT(
  request: Request,
  context: { params: Promise<{ templateId: string }> },
) {
  return PATCH(request, context);
}
