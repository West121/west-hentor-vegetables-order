import { prisma } from "./client";
import { Prisma } from "./generated/prisma/client";

export type MiniappOperationLogInput = {
  action: string;
  afterValue?: Prisma.InputJsonValue;
  beforeValue?: Prisma.InputJsonValue;
  durationMs?: number | null;
  ip?: string | null;
  requestMethod?: string | null;
  requestParams?: Prisma.InputJsonValue;
  requestPath?: string | null;
  resource: string;
  resourceId?: string | null;
  responseData?: Prisma.InputJsonValue;
  storeId: string;
  statusCode?: number | null;
  userAgent?: string | null;
  userId: string;
};

export async function createMiniappOperationLog(
  input: MiniappOperationLogInput,
) {
  return prisma.adminOperationLog.create({
    data: {
      action: input.action,
      afterValue: input.afterValue ?? Prisma.JsonNull,
      beforeValue: input.beforeValue ?? Prisma.JsonNull,
      durationMs: input.durationMs ?? null,
      ip: input.ip ?? null,
      requestMethod: input.requestMethod ?? null,
      requestParams: input.requestParams ?? Prisma.JsonNull,
      requestPath: input.requestPath ?? null,
      resource: input.resource,
      resourceId: input.resourceId ?? null,
      responseData: input.responseData ?? Prisma.JsonNull,
      storeId: input.storeId,
      statusCode: input.statusCode ?? null,
      userAgent: input.userAgent ?? null,
      userId: input.userId,
    },
  });
}
