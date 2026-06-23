import { prisma } from "./client";
import { normalizeCutoffTimeValue } from "./cutoff-time";
import {
  Prisma,
  type FranchiseeStatus,
  type StoreStatus,
  type StoreType,
} from "./generated/prisma/client";
import {
  normalizeDeliveryRangeValues,
  readDeliveryRangeValues,
} from "./delivery-range";
import {
  buildPaginationMeta,
  normalizePagination,
  type ListPaginationInput,
} from "./pagination";

export class StoreManagementServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "StoreManagementServiceError";
  }
}

export type ListStoresInput = ListPaginationInput & {
  query?: string;
  status?: StoreStatus;
  storeIds?: string[];
  type?: StoreType;
};

export type GetStoreInput = {
  storeId: string;
};

export type ListFranchiseesInput = ListPaginationInput & {
  query?: string;
  status?: FranchiseeStatus;
};

export type GetFranchiseeInput = {
  franchiseeId: string;
};

export type CreateFranchiseeInput = {
  contactName: string;
  contactPhone: string;
  contractEndsAt?: Date | null;
  name: string;
  operatorId: string;
  remark?: string | null;
  status: FranchiseeStatus;
};

export type UpdateFranchiseeInput = CreateFranchiseeInput & {
  franchiseeId: string;
};

export type CreateStoreInput = {
  address?: string | null;
  city?: string | null;
  code: string;
  contactName: string;
  contactPhone: string;
  customerServiceTel?: string | null;
  cutoffTime: string;
  deliveryCities?: string[] | null;
  deliveryProvinces?: string[] | null;
  district?: string | null;
  franchiseEndsAt?: Date | null;
  franchiseeId?: string | null;
  name: string;
  operatorId: string;
  province?: string | null;
  status: StoreStatus;
  type: StoreType;
};

export type UpdateStoreInput = CreateStoreInput & {
  storeId: string;
};

async function getActiveOperator(
  tx: Prisma.TransactionClient | typeof prisma,
  operatorId: string,
) {
  const operator = await tx.adminUser.findFirst({
    where: {
      id: operatorId,
      status: "ACTIVE",
    },
  });

  if (!operator) {
    throw new StoreManagementServiceError("OPERATOR_NOT_FOUND", "操作员不存在");
  }

  return operator;
}

function normalizeRequiredText(value: string, code: string, message: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new StoreManagementServiceError(code, message);
  }
  return normalized;
}

function normalizeNullableText(value?: string | null) {
  const normalized = value?.trim();
  return normalized || null;
}

function normalizeCutoffTime(value: string) {
  const normalized = normalizeCutoffTimeValue(value);
  if (!normalized) {
    throw new StoreManagementServiceError(
      "CUTOFF_TIME_INVALID",
      "截单时间不正确",
    );
  }
  return normalized;
}

function normalizeFranchiseeInput(input: CreateFranchiseeInput) {
  return {
    contactName: normalizeRequiredText(
      input.contactName,
      "CONTACT_NAME_REQUIRED",
      "请输入联系人",
    ),
    contactPhone: normalizeRequiredText(
      input.contactPhone,
      "CONTACT_PHONE_REQUIRED",
      "请输入联系电话",
    ),
    contractEndsAt: input.contractEndsAt ?? null,
    name: normalizeRequiredText(input.name, "NAME_REQUIRED", "请输入加盟商名称"),
    remark: normalizeNullableText(input.remark),
    status: input.status,
  };
}

function normalizeStoreInput(input: CreateStoreInput) {
  const type = input.type;
  const franchiseeId =
    type === "FRANCHISE" ? (input.franchiseeId?.trim() ?? null) : null;

  if (type === "FRANCHISE" && !franchiseeId) {
    throw new StoreManagementServiceError(
      "FRANCHISEE_REQUIRED",
      "加盟门店必须选择加盟商",
    );
  }

  return {
    address: normalizeNullableText(input.address),
    city: normalizeNullableText(input.city),
    code: normalizeRequiredText(input.code, "CODE_REQUIRED", "请输入门店编码"),
    contactName: normalizeRequiredText(
      input.contactName,
      "CONTACT_NAME_REQUIRED",
      "请输入店长姓名",
    ),
    contactPhone: normalizeRequiredText(
      input.contactPhone,
      "CONTACT_PHONE_REQUIRED",
      "请输入门店电话",
    ),
    customerServiceTel: normalizeNullableText(input.customerServiceTel),
    cutoffTime: normalizeCutoffTime(input.cutoffTime),
    deliveryCities: normalizeDeliveryRangeValues(input.deliveryCities),
    deliveryProvinces: normalizeDeliveryRangeValues(input.deliveryProvinces),
    district: normalizeNullableText(input.district),
    franchiseEndsAt: input.franchiseEndsAt ?? null,
    franchiseeId,
    name: normalizeRequiredText(input.name, "NAME_REQUIRED", "请输入门店名称"),
    province: normalizeNullableText(input.province),
    status: input.status,
    type,
  };
}

function franchiseeLogValue(input: ReturnType<typeof normalizeFranchiseeInput>) {
  return {
    contactName: input.contactName,
    contactPhone: input.contactPhone,
    contractEndsAt: input.contractEndsAt?.toISOString() ?? null,
    name: input.name,
    remark: input.remark,
    status: input.status,
  };
}

function storeLogValue(input: ReturnType<typeof normalizeStoreInput>) {
  return {
    address: input.address,
    city: input.city,
    code: input.code,
    contactName: input.contactName,
    contactPhone: input.contactPhone,
    customerServiceTel: input.customerServiceTel,
    cutoffTime: input.cutoffTime,
    deliveryCities: input.deliveryCities,
    deliveryProvinces: input.deliveryProvinces,
    district: input.district,
    franchiseEndsAt: input.franchiseEndsAt?.toISOString() ?? null,
    franchiseeId: input.franchiseeId,
    name: input.name,
    province: input.province,
    status: input.status,
    type: input.type,
  };
}

function storeSnapshot(store: {
  address: string | null;
  city: string | null;
  code: string;
  contactName: string;
  contactPhone: string;
  customerServiceTel: string | null;
  cutoffTime: string;
  deliveryCities: unknown;
  deliveryProvinces: unknown;
  district: string | null;
  franchiseEndsAt: Date | null;
  franchiseeId: string | null;
  name: string;
  province: string | null;
  status: StoreStatus;
  type: StoreType;
}) {
  return storeLogValue({
    address: store.address,
    city: store.city,
    code: store.code,
    contactName: store.contactName,
    contactPhone: store.contactPhone,
    customerServiceTel: store.customerServiceTel,
    cutoffTime: store.cutoffTime,
    deliveryCities: readDeliveryRangeValues(store.deliveryCities),
    deliveryProvinces: readDeliveryRangeValues(store.deliveryProvinces),
    district: store.district,
    franchiseEndsAt: store.franchiseEndsAt,
    franchiseeId: store.franchiseeId,
    name: store.name,
    province: store.province,
    status: store.status,
    type: store.type,
  });
}

function franchiseeSnapshot(franchisee: {
  contactName: string;
  contactPhone: string;
  contractEndsAt: Date | null;
  name: string;
  remark: string | null;
  status: FranchiseeStatus;
}) {
  return franchiseeLogValue({
    contactName: franchisee.contactName,
    contactPhone: franchisee.contactPhone,
    contractEndsAt: franchisee.contractEndsAt,
    name: franchisee.name,
    remark: franchisee.remark,
    status: franchisee.status,
  });
}

async function ensureFranchisee(
  tx: Prisma.TransactionClient,
  franchiseeId: string | null,
) {
  if (!franchiseeId) {
    return;
  }

  const franchisee = await tx.franchisee.findUnique({
    where: { id: franchiseeId },
    select: { id: true },
  });

  if (!franchisee) {
    throw new StoreManagementServiceError("FRANCHISEE_NOT_FOUND", "加盟商不存在");
  }
}

function buildStoreWhere(input: ListStoresInput) {
  const query = input.query?.trim();
  const where: Prisma.StoreWhereInput = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.type ? { type: input.type } : {}),
    ...(input.storeIds ? { id: { in: input.storeIds } } : {}),
    ...(query
      ? {
          OR: [
            { code: { contains: query } },
            { name: { contains: query } },
            { contactName: { contains: query } },
            { contactPhone: { contains: query } },
            {
              franchisee: {
                name: { contains: query },
              },
            },
          ],
        }
      : {}),
  };

  return where;
}

export async function listStores(input: ListStoresInput = {}) {
  const where = buildStoreWhere(input);
  const paginationInput = normalizePagination(input);
  const [items, total, statusRows, typeRows] = await Promise.all([
    prisma.store.findMany({
      where,
      skip: paginationInput.skip,
      take: paginationInput.take,
      orderBy: [{ status: "asc" }, { type: "asc" }, { createdAt: "desc" }],
      include: {
        franchisee: true,
        _count: {
          select: {
            adminUserStores: true,
            memberBindings: true,
            orders: true,
            packageTemplates: true,
          },
        },
      },
    }),
    prisma.store.count({ where }),
    prisma.store.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    prisma.store.groupBy({
      by: ["type"],
      where,
      _count: { _all: true },
    }),
  ]);

  const summary = {
    active: 0,
    direct: 0,
    disabled: 0,
    franchise: 0,
    total: 0,
  };

  for (const row of statusRows) {
    summary.total += row._count._all;
    if (row.status === "ACTIVE") {
      summary.active = row._count._all;
    }
    if (row.status === "DISABLED") {
      summary.disabled = row._count._all;
    }
  }

  for (const row of typeRows) {
    if (row.type === "DIRECT") {
      summary.direct = row._count._all;
    }
    if (row.type === "FRANCHISE") {
      summary.franchise = row._count._all;
    }
  }

  return {
    items: items.map((item) => ({
      address: [item.province, item.city, item.district, item.address]
        .filter(Boolean)
        .join(" "),
      addressDetail: item.address,
      adminUserCount: item._count.adminUserStores,
      city: item.city,
      code: item.code,
      contactName: item.contactName,
      contactPhone: item.contactPhone,
      createdAt: item.createdAt,
      customerServiceTel: item.customerServiceTel,
      cutoffTime: item.cutoffTime,
      deliveryCities: readDeliveryRangeValues(item.deliveryCities),
      deliveryProvinces: readDeliveryRangeValues(item.deliveryProvinces),
      district: item.district,
      franchiseEndsAt: item.franchiseEndsAt,
      franchisee: item.franchisee,
      franchiseeId: item.franchiseeId,
      franchiseeName: item.franchisee?.name ?? "总部直营",
      id: item.id,
      memberCount: item._count.memberBindings,
      name: item.name,
      operatorVisible: true,
      orderCount: item._count.orders,
      packageTemplateCount: item._count.packageTemplates,
      province: item.province,
      status: item.status,
      type: item.type,
      updatedAt: item.updatedAt,
    })),
    pagination: buildPaginationMeta(paginationInput, total),
    summary,
  };
}

export async function getStore(input: GetStoreInput) {
  const store = await prisma.store.findUnique({
    where: { id: input.storeId },
    include: {
      franchisee: true,
      _count: {
        select: {
          adminUserStores: true,
          memberBindings: true,
          orders: true,
          packageTemplates: true,
        },
      },
    },
  });

  if (!store) {
    throw new StoreManagementServiceError("STORE_NOT_FOUND", "门店不存在");
  }

  return {
    address: [store.province, store.city, store.district, store.address]
      .filter(Boolean)
      .join(" "),
    addressDetail: store.address,
    adminUserCount: store._count.adminUserStores,
    city: store.city,
    code: store.code,
    contactName: store.contactName,
    contactPhone: store.contactPhone,
    createdAt: store.createdAt,
    customerServiceTel: store.customerServiceTel,
    cutoffTime: store.cutoffTime,
    deliveryCities: readDeliveryRangeValues(store.deliveryCities),
    deliveryProvinces: readDeliveryRangeValues(store.deliveryProvinces),
    district: store.district,
    franchiseEndsAt: store.franchiseEndsAt,
    franchisee: store.franchisee,
    franchiseeId: store.franchiseeId,
    franchiseeName: store.franchisee?.name ?? "总部直营",
    id: store.id,
    memberCount: store._count.memberBindings,
    name: store.name,
    operatorVisible: true,
    orderCount: store._count.orders,
    packageTemplateCount: store._count.packageTemplates,
    province: store.province,
    status: store.status,
    type: store.type,
    updatedAt: store.updatedAt,
  };
}

export async function listFranchisees(input: ListFranchiseesInput = {}) {
  const query = input.query?.trim();
  const where: Prisma.FranchiseeWhereInput = {
    ...(input.status ? { status: input.status } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query } },
            { contactName: { contains: query } },
            { contactPhone: { contains: query } },
          ],
        }
      : {}),
  };

  const paginationInput = normalizePagination(input);

  const [items, total, summaryRows] = await Promise.all([
    prisma.franchisee.findMany({
      where,
      skip: paginationInput.skip,
      take: paginationInput.take,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        _count: {
          select: { stores: true },
        },
      },
    }),
    prisma.franchisee.count({ where }),
    prisma.franchisee.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
  ]);

  const summary = {
    active: 0,
    expired: 0,
    suspended: 0,
    total: 0,
  };

  for (const row of summaryRows) {
    summary.total += row._count._all;
    if (row.status === "ACTIVE") {
      summary.active = row._count._all;
    }
    if (row.status === "SUSPENDED") {
      summary.suspended = row._count._all;
    }
    if (row.status === "EXPIRED") {
      summary.expired = row._count._all;
    }
  }

  return {
    items: items.map((item) => ({
      contactName: item.contactName,
      contactPhone: item.contactPhone,
      contractEndsAt: item.contractEndsAt,
      createdAt: item.createdAt,
      id: item.id,
      name: item.name,
      remark: item.remark,
      status: item.status,
      storeCount: item._count.stores,
      updatedAt: item.updatedAt,
    })),
    pagination: buildPaginationMeta(paginationInput, total),
    summary,
  };
}

export async function getFranchisee(input: GetFranchiseeInput) {
  const franchisee = await prisma.franchisee.findUnique({
    where: { id: input.franchiseeId },
    include: {
      stores: {
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        select: {
          code: true,
          contactName: true,
          contactPhone: true,
          id: true,
          name: true,
          status: true,
          type: true,
        },
      },
    },
  });

  if (!franchisee) {
    throw new StoreManagementServiceError("FRANCHISEE_NOT_FOUND", "加盟商不存在");
  }

  return {
    contactName: franchisee.contactName,
    contactPhone: franchisee.contactPhone,
    contractEndsAt: franchisee.contractEndsAt,
    createdAt: franchisee.createdAt,
    id: franchisee.id,
    name: franchisee.name,
    remark: franchisee.remark,
    status: franchisee.status,
    storeCount: franchisee.stores.length,
    stores: franchisee.stores,
    updatedAt: franchisee.updatedAt,
  };
}

export async function createFranchisee(input: CreateFranchiseeInput) {
  const normalized = normalizeFranchiseeInput(input);

  return prisma.$transaction(async (tx) => {
    const operator = await getActiveOperator(tx, input.operatorId);
    const created = await tx.franchisee.create({
      data: normalized,
    });

    await tx.adminOperationLog.create({
      data: {
        action: "FRANCHISEE_CREATED",
        afterValue: franchiseeLogValue(normalized),
        beforeValue: Prisma.JsonNull,
        operatorId: operator.id,
        resource: "franchisee",
        resourceId: created.id,
      },
    });

    return created;
  });
}

export async function updateFranchisee(input: UpdateFranchiseeInput) {
  const normalized = normalizeFranchiseeInput(input);

  return prisma.$transaction(async (tx) => {
    const operator = await getActiveOperator(tx, input.operatorId);
    const before = await tx.franchisee.findUnique({
      where: { id: input.franchiseeId },
    });

    if (!before) {
      throw new StoreManagementServiceError("FRANCHISEE_NOT_FOUND", "加盟商不存在");
    }

    const updated = await tx.franchisee.update({
      where: { id: input.franchiseeId },
      data: normalized,
    });

    await tx.adminOperationLog.create({
      data: {
        action: "FRANCHISEE_UPDATED",
        afterValue: franchiseeLogValue(normalized),
        beforeValue: franchiseeSnapshot(before),
        operatorId: operator.id,
        resource: "franchisee",
        resourceId: updated.id,
      },
    });

    return updated;
  });
}

export async function createStore(input: CreateStoreInput) {
  const normalized = normalizeStoreInput(input);

  return prisma.$transaction(async (tx) => {
    const operator = await getActiveOperator(tx, input.operatorId);
    await ensureFranchisee(tx, normalized.franchiseeId);

    const existing = await tx.store.findUnique({ where: { code: normalized.code } });
    if (existing) {
      throw new StoreManagementServiceError("STORE_CODE_EXISTS", "门店编码已存在");
    }

    const created = await tx.store.create({
      data: normalized,
    });

    await tx.adminOperationLog.create({
      data: {
        action: "STORE_CREATED",
        afterValue: storeLogValue(normalized),
        beforeValue: Prisma.JsonNull,
        operatorId: operator.id,
        resource: "store",
        resourceId: created.id,
        storeId: created.id,
      },
    });

    return created;
  });
}

export async function updateStore(input: UpdateStoreInput) {
  const normalized = normalizeStoreInput(input);

  return prisma.$transaction(async (tx) => {
    const operator = await getActiveOperator(tx, input.operatorId);
    await ensureFranchisee(tx, normalized.franchiseeId);

    const before = await tx.store.findUnique({
      where: { id: input.storeId },
    });

    if (!before) {
      throw new StoreManagementServiceError("STORE_NOT_FOUND", "门店不存在");
    }

    if (before.code !== normalized.code) {
      const existing = await tx.store.findUnique({
        where: { code: normalized.code },
      });
      if (existing) {
        throw new StoreManagementServiceError(
          "STORE_CODE_EXISTS",
          "门店编码已存在",
        );
      }
    }

    const updated = await tx.store.update({
      where: { id: input.storeId },
      data: normalized,
    });

    await tx.adminOperationLog.create({
      data: {
        action: "STORE_UPDATED",
        afterValue: storeLogValue(normalized),
        beforeValue: storeSnapshot(before),
        operatorId: operator.id,
        resource: "store",
        resourceId: updated.id,
        storeId: updated.id,
      },
    });

    return updated;
  });
}
