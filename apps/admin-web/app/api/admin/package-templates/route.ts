import { z } from "zod";

import {
  createPackageTemplate,
  listPackageTemplates,
  PackageTemplateServiceError,
} from "@hentor/db";

import {
  getPermissionFailure,
  getStoreAccessFailure,
} from "@/app/lib/admin-access";
import { getAdminPaginationParams } from "@/app/lib/admin-pagination";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const querySchema = z.object({
  query: z.string().optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
  storeId: z.string().min(1),
});

const benefitSchema = z.object({
  kind: z.string().optional(),
  name: z.string().min(1),
  sortOrder: z.coerce.number().int().optional(),
  totalQuantity: z.coerce.number().positive(),
  unit: z.string().min(1),
});

const INTERNAL_VALID_DAYS = 36500;

const createSchema = z.object({
  benefits: z.array(benefitSchema).optional(),
  name: z.string().min(1),
  sortOrder: z.coerce.number().int().optional(),
  storeId: z.string().min(1),
  totalTimes: z.coerce.number().int().min(1),
  validDays: z.coerce.number().int().min(1).optional().default(INTERNAL_VALID_DAYS),
  weightLimitJin: z.coerce.number().positive(),
});

function statusForTemplateError(code: string) {
  return code.endsWith("_NOT_FOUND") ? 404 : 400;
}

function serializeTemplate(template: Awaited<ReturnType<typeof createPackageTemplate>>) {
  return {
    createdAt: template.createdAt,
    benefits: template.benefits.map((benefit) => ({
      id: benefit.id,
      kind: benefit.kind,
      name: benefit.name,
      shipmentGroup: benefit.shipmentGroup,
      sortOrder: benefit.sortOrder,
      totalQuantity: Number(benefit.totalQuantity),
      unit: benefit.unit,
    })),
    id: template.id,
    name: template.name,
    purchaseOrderCount: 0,
    sortOrder: template.sortOrder,
    status: template.status,
    totalTimes: template.totalTimes,
    updatedAt: template.updatedAt,
    userPackageCount: 0,
    validDays: template.validDays,
    weightLimitJin: Number(template.weightLimitJin),
  };
}

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    query: url.searchParams.get("query") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
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

  return ok(
    await listPackageTemplates({
      ...parsed.data,
      ...getAdminPaginationParams(url.searchParams),
    }),
  );
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
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

  try {
    const template = await createPackageTemplate({
      ...parsed.data,
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
