import { prisma } from "./client";
import { getDeliveryRangeFailure } from "./delivery-range";
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

export type DeleteMiniappAddressInput = MiniappAddressScope & {
  addressId: string;
};

export type SetDefaultMiniappAddressInput = MiniappAddressScope & {
  addressId: string;
};

const MAX_ADDRESS_COUNT = 10;
const MAINLAND_PHONE_PATTERN = /^1[3-9]\d{9}$/;

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
  const receiverPhone = normalizeRequiredText(
    input.receiverPhone,
    "RECEIVER_PHONE_REQUIRED",
    "请输入联系电话",
  );

  if (!MAINLAND_PHONE_PATTERN.test(receiverPhone)) {
    throw new AddressServiceError(
      "RECEIVER_PHONE_INVALID",
      "请输入正确的手机号",
    );
  }

  const detail = normalizeRequiredText(
    input.detail,
    "DETAIL_REQUIRED",
    "请输入详细地址",
  );

  return {
    city: normalizeNullableText(input.city),
    detail,
    district: normalizeNullableText(input.district),
    province: normalizeNullableText(input.province),
    receiverName: normalizeRequiredText(
      input.receiverName,
      "RECEIVER_NAME_REQUIRED",
      "请输入收货人",
    ),
    receiverPhone,
  };
}

async function ensureActiveMemberBinding(
  tx: Prisma.TransactionClient | typeof prisma,
  input: MiniappAddressScope,
) {
  const binding = await tx.memberStoreBinding.findFirst({
    where: {
      storeId: input.storeId,
      userId: input.userId,
    },
    include: {
      user: {
        select: {
          disabledReason: true,
        },
      },
    },
  });

  if (!binding) {
    throw new AddressServiceError(
      "MEMBER_STORE_NOT_FOUND",
      "当前门店会员不存在",
    );
  }

  if (binding.status !== "ACTIVE") {
    const reason = binding.user.disabledReason?.trim();
    throw new AddressServiceError(
      "MEMBER_DISABLED",
      reason ? `会员已停用：${reason}` : "会员已停用，暂不能维护地址",
    );
  }
}

async function ensureAddressInDeliveryRange(
  tx: Prisma.TransactionClient | typeof prisma,
  input: MiniappAddressScope,
  address: {
    city: string | null;
    province: string | null;
  },
) {
  const store = await tx.store.findUnique({
    where: { id: input.storeId },
    select: {
      deliveryCities: true,
      deliveryProvinces: true,
    },
  });

  if (!store) {
    throw new AddressServiceError("STORE_NOT_FOUND", "门店不存在");
  }

  const failure = getDeliveryRangeFailure(address, store);
  if (failure) {
    throw new AddressServiceError(failure.code, failure.message);
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
    await ensureAddressInDeliveryRange(tx, input, normalized);
    const addressCount = await tx.address.count({
      where: {
        storeId: input.storeId,
        userId: input.userId,
      },
    });

    if (addressCount >= MAX_ADDRESS_COUNT) {
      throw new AddressServiceError(
        "ADDRESS_LIMIT_EXCEEDED",
        "最多只能保存 10 条地址",
      );
    }

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
    await ensureAddressInDeliveryRange(tx, input, normalized);
    const existing = await tx.address.findFirst({
      where: {
        id: input.addressId,
        storeId: input.storeId,
        userId: input.userId,
      },
      select: { city: true, id: true, province: true },
    });

    if (!existing) {
      throw new AddressServiceError("ADDRESS_NOT_FOUND", "配送地址不存在");
    }

    await ensureAddressInDeliveryRange(tx, input, existing);

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

export async function setDefaultMiniappAddress(
  input: SetDefaultMiniappAddressInput,
) {
  return prisma.$transaction(async (tx) => {
    await ensureActiveMemberBinding(tx, input);

    const existing = await tx.address.findFirst({
      where: {
        id: input.addressId,
        storeId: input.storeId,
        userId: input.userId,
      },
      select: { city: true, id: true, province: true },
    });

    if (!existing) {
      throw new AddressServiceError("ADDRESS_NOT_FOUND", "配送地址不存在");
    }

    await ensureAddressInDeliveryRange(tx, input, existing);

    await tx.address.updateMany({
      where: {
        storeId: input.storeId,
        userId: input.userId,
        NOT: { id: input.addressId },
      },
      data: { isDefault: false },
    });

    return tx.address.update({
      where: { id: input.addressId },
      data: { isDefault: true },
    });
  });
}

export async function deleteMiniappAddress(input: DeleteMiniappAddressInput) {
  return prisma.$transaction(async (tx) => {
    await ensureActiveMemberBinding(tx, input);

    const existing = await tx.address.findFirst({
      where: {
        id: input.addressId,
        storeId: input.storeId,
        userId: input.userId,
      },
      select: {
        id: true,
        isDefault: true,
      },
    });

    if (!existing) {
      throw new AddressServiceError("ADDRESS_NOT_FOUND", "配送地址不存在");
    }

    const deleted = await tx.address.delete({
      where: { id: existing.id },
      select: { id: true },
    });

    if (existing.isDefault) {
      const nextDefault = await tx.address.findFirst({
        where: {
          storeId: input.storeId,
          userId: input.userId,
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        select: { id: true },
      });

      if (nextDefault) {
        await tx.address.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
    }

    return deleted;
  });
}
