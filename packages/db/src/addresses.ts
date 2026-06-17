import { prisma } from "./client";
import { Prisma } from "./generated/prisma/client";

export class AddressServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AddressServiceError";
  }
}

export type MiniappAddressScope = {
  storeId: string;
  userId: string;
};

export type MiniappAddressInput = MiniappAddressScope & {
  city?: string | null;
  detail: string;
  district?: string | null;
  isDefault?: boolean;
  province?: string | null;
  receiverName: string;
  receiverPhone: string;
};

export type UpdateMiniappAddressInput = MiniappAddressInput & {
  addressId: string;
};

function normalizeRequiredText(value: string, code: string, message: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new AddressServiceError(code, message);
  }

  return normalized;
}

function normalizeNullableText(value?: string | null) {
  const normalized = value?.trim();
  return normalized || null;
}

function normalizeAddressInput(input: MiniappAddressInput) {
  return {
    city: normalizeNullableText(input.city),
    detail: normalizeRequiredText(input.detail, "DETAIL_REQUIRED", "请输入详细地址"),
    district: normalizeNullableText(input.district),
    province: normalizeNullableText(input.province),
    receiverName: normalizeRequiredText(
      input.receiverName,
      "RECEIVER_NAME_REQUIRED",
      "请输入收货人",
    ),
    receiverPhone: normalizeRequiredText(
      input.receiverPhone,
      "RECEIVER_PHONE_REQUIRED",
      "请输入联系电话",
    ),
  };
}

async function ensureActiveMemberBinding(
  tx: Prisma.TransactionClient | typeof prisma,
  input: MiniappAddressScope,
) {
  const binding = await tx.memberStoreBinding.findFirst({
    where: {
      status: "ACTIVE",
      storeId: input.storeId,
      userId: input.userId,
    },
    select: { id: true },
  });

  if (!binding) {
    throw new AddressServiceError(
      "MEMBER_STORE_NOT_FOUND",
      "当前门店会员不存在",
    );
  }
}

function addressView(address: {
  city: string | null;
  createdAt: Date;
  detail: string;
  district: string | null;
  id: string;
  isDefault: boolean;
  province: string | null;
  receiverName: string;
  receiverPhone: string;
  updatedAt: Date;
}) {
  return {
    city: address.city,
    createdAt: address.createdAt,
    detail: address.detail,
    district: address.district,
    fullAddress: [address.province, address.city, address.district, address.detail]
      .filter(Boolean)
      .join(" "),
    id: address.id,
    isDefault: address.isDefault,
    province: address.province,
    receiverName: address.receiverName,
    receiverPhone: address.receiverPhone,
    updatedAt: address.updatedAt,
  };
}

export async function listMiniappAddresses(input: MiniappAddressScope) {
  await ensureActiveMemberBinding(prisma, input);

  const items = await prisma.address.findMany({
    where: {
      storeId: input.storeId,
      userId: input.userId,
    },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });

  const mappedItems = items.map(addressView);

  return {
    defaultAddress: mappedItems.find((item) => item.isDefault) ?? null,
    items: mappedItems,
  };
}

export async function createMiniappAddress(input: MiniappAddressInput) {
  const normalized = normalizeAddressInput(input);

  return prisma.$transaction(async (tx) => {
    await ensureActiveMemberBinding(tx, input);
    const addressCount = await tx.address.count({
      where: {
        storeId: input.storeId,
        userId: input.userId,
      },
    });
    const isDefault = input.isDefault === true || addressCount === 0;

    if (isDefault) {
      await tx.address.updateMany({
        where: {
          storeId: input.storeId,
          userId: input.userId,
        },
        data: { isDefault: false },
      });
    }

    return tx.address.create({
      data: {
        ...normalized,
        isDefault,
        storeId: input.storeId,
        userId: input.userId,
      },
    });
  });
}

export async function updateMiniappAddress(input: UpdateMiniappAddressInput) {
  const normalized = normalizeAddressInput(input);

  return prisma.$transaction(async (tx) => {
    await ensureActiveMemberBinding(tx, input);
    const existing = await tx.address.findFirst({
      where: {
        id: input.addressId,
        storeId: input.storeId,
        userId: input.userId,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new AddressServiceError("ADDRESS_NOT_FOUND", "配送地址不存在");
    }

    if (input.isDefault === true) {
      await tx.address.updateMany({
        where: {
          storeId: input.storeId,
          userId: input.userId,
          NOT: { id: input.addressId },
        },
        data: { isDefault: false },
      });
    }

    return tx.address.update({
      where: { id: input.addressId },
      data: {
        ...normalized,
        ...(input.isDefault === true ? { isDefault: true } : {}),
      },
    });
  });
}
