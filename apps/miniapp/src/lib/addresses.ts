export type DefaultAddressSwitchInput = {
  addressCount: number;
  editingIsDefault?: boolean;
};

export type SetDefaultAddressUrlInput = {
  addressId: string;
  apiBaseUrl: string;
  storeCode: string;
};

export type AddressListUrlInput = {
  apiBaseUrl: string;
  storeCode: string;
};

export type AddressResourceUrlInput = {
  addressId: string;
  apiBaseUrl: string;
  storeCode?: string;
};

export type AddressSubmitPayloadInput = {
  city?: string | null;
  detail: string;
  district?: string | null;
  isDefault: boolean;
  province?: string | null;
  receiverName: string;
  receiverPhone: string;
  storeCode: string;
};

export type AddressReceiverLineInput = {
  receiverName: string;
  receiverPhone: string;
};

export type AddressRegionInput = {
  city?: string | null;
  district?: string | null;
  province?: string | null;
};

export type AddressFullAddressInput = AddressRegionInput & {
  detail?: string | null;
  fullAddress?: string | null;
};

const MIN_ADDRESS_DETAIL_LENGTH = 8;

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized || null;
}

export function buildAddressListUrl({
  apiBaseUrl,
  storeCode,
}: AddressListUrlInput) {
  return `${apiBaseUrl}/api/v1/addresses?storeCode=${encodeURIComponent(storeCode)}`;
}

export function buildAddressResourceUrl({
  addressId,
  apiBaseUrl,
  storeCode,
}: AddressResourceUrlInput) {
  const url = `${apiBaseUrl}/api/v1/addresses/${encodeURIComponent(addressId)}`;
  return storeCode ? `${url}?storeCode=${encodeURIComponent(storeCode)}` : url;
}

export function buildSetDefaultAddressUrl({
  addressId,
  apiBaseUrl,
  storeCode,
}: SetDefaultAddressUrlInput) {
  return `${apiBaseUrl}/api/v1/addresses/${encodeURIComponent(
    addressId,
  )}/default?storeCode=${encodeURIComponent(storeCode)}`;
}

export function getDefaultAddressSwitchState({
  addressCount,
  editingIsDefault,
}: DefaultAddressSwitchInput) {
  if (addressCount === 0) {
    return {
      checked: true,
      disabled: true,
      hint: "第一个地址会自动设为默认地址",
    };
  }

  if (editingIsDefault) {
    return {
      checked: true,
      disabled: true,
      hint: "当前默认地址，内容可直接修改",
    };
  }

  return {
    checked: false,
    disabled: false,
    hint: "下单优先使用",
  };
}

export function getAddressDetailError(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return "请输入详细地址";
  }

  if (normalized.length < MIN_ADDRESS_DETAIL_LENGTH) {
    return "详细地址至少 8 个字";
  }

  return null;
}

export function getAddressRegionError({
  city,
  district,
  province,
}: AddressRegionInput) {
  if (!province?.trim() || !city?.trim() || !district?.trim()) {
    return "请选择所在地区";
  }

  return null;
}

export function formatAddressRegion(input: AddressRegionInput) {
  return [input.province, input.city, input.district]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" / ");
}

export function buildAddressRegionPickerValue(input: AddressRegionInput) {
  const parts = [input.province, input.city, input.district]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return parts.length === 3 ? parts : [];
}

export function parseAddressRegionPickerValue(value?: string[]) {
  const [province = "", city = "", district = ""] = value ?? [];

  return {
    city: city.trim(),
    district: district.trim(),
    province: province.trim(),
  };
}

export function isValidReceiverPhone(value: string) {
  return /^1[3-9]\d{9}$/.test(value.trim());
}

export function maskReceiverPhone(value: string) {
  const normalized = value.trim();
  return normalized.length >= 7
    ? `${normalized.slice(0, 3)}****${normalized.slice(-4)}`
    : normalized;
}

export function formatAddressReceiverLine({
  receiverName,
  receiverPhone,
}: AddressReceiverLineInput) {
  return `${receiverName.trim()} ${maskReceiverPhone(receiverPhone)}`.trim();
}

export function formatAddressFullAddress(input: AddressFullAddressInput) {
  const explicit = input.fullAddress?.trim();
  if (explicit) {
    return explicit;
  }

  return [input.province, input.city, input.district, input.detail]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ");
}

export function buildAddressSubmitPayload(input: AddressSubmitPayloadInput) {
  return {
    city: normalizeOptionalText(input.city),
    detail: input.detail.trim(),
    district: normalizeOptionalText(input.district),
    isDefault: input.isDefault,
    province: normalizeOptionalText(input.province),
    receiverName: input.receiverName.trim(),
    receiverPhone: input.receiverPhone.trim(),
    storeCode: input.storeCode,
  };
}
