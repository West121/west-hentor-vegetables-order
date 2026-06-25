import {
  getChinaCityRegion,
  getChinaProvinceRegionsForDeliveryRange,
} from "@hentor/shared";

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

export type DeliveryRangeInput = {
  deliveryCities?: Array<string | null | undefined> | null;
  deliveryProvinces?: Array<string | null | undefined> | null;
};

export type AddressRegionPickerValue = [number, number, number];

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

function normalizeRangeValues(values?: Array<string | null | undefined> | null) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

export function normalizeDeliveryRange(range?: DeliveryRangeInput | null) {
  return {
    deliveryCities: normalizeRangeValues(range?.deliveryCities),
    deliveryProvinces: normalizeRangeValues(range?.deliveryProvinces),
  };
}

export function hasDeliveryRangeLimit(range?: DeliveryRangeInput | null) {
  const normalized = normalizeDeliveryRange(range);
  return (
    normalized.deliveryCities.length > 0 ||
    normalized.deliveryProvinces.length > 0
  );
}

export function formatDeliveryRangeText(range?: DeliveryRangeInput | null) {
  const normalized = normalizeDeliveryRange(range);
  const scopes = [
    ...normalized.deliveryProvinces.map((province) => `${province}全省`),
    ...normalized.deliveryCities,
  ];

  return scopes.length > 0 ? scopes.join("、") : "全国不限";
}

export function isAddressInDeliveryRange(
  region: Pick<AddressRegionInput, "city" | "province">,
  range?: DeliveryRangeInput | null,
) {
  const normalized = normalizeDeliveryRange(range);
  if (
    normalized.deliveryCities.length === 0 &&
    normalized.deliveryProvinces.length === 0
  ) {
    return true;
  }

  const province = region.province?.trim();
  const city = region.city?.trim();
  return Boolean(
    (province && normalized.deliveryProvinces.includes(province)) ||
      (city && normalized.deliveryCities.includes(city)),
  );
}

export function getAddressDeliveryRangeError(
  region: Pick<AddressRegionInput, "city" | "province">,
  range?: DeliveryRangeInput | null,
) {
  if (!region.province?.trim() || !region.city?.trim()) {
    return null;
  }

  return isAddressInDeliveryRange(region, range)
    ? null
    : `该地区暂不配送，仅配送：${formatDeliveryRangeText(range)}`;
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

function clampPickerIndex(index: number | undefined, length: number) {
  if (length <= 0) {
    return 0;
  }

  if (typeof index !== "number" || Number.isNaN(index)) {
    return 0;
  }

  return Math.min(Math.max(index, 0), length - 1);
}

export function buildAddressRegionMultiPickerModel(
  input: AddressRegionInput,
  deliveryRange?: DeliveryRangeInput | null,
) {
  const provinces = getChinaProvinceRegionsForDeliveryRange(deliveryRange);
  const provinceNames = provinces.map((province) => province.province);
  const selectedProvince = input.province?.trim();
  const provinceIndex = clampPickerIndex(
    selectedProvince
      ? provinceNames.findIndex((province) => province === selectedProvince)
      : 0,
    provinceNames.length,
  );
  const province = provinces[provinceIndex] ?? { cities: [], province: "" };
  const cityNames = province.cities;
  const selectedCity = input.city?.trim();
  const cityIndex = clampPickerIndex(
    selectedCity ? cityNames.findIndex((city) => city === selectedCity) : 0,
    cityNames.length,
  );
  const city = cityNames[cityIndex] ?? "";
  const districtNames =
    getChinaCityRegion(province.province, city)?.districtNames ?? [];
  const selectedDistrict = input.district?.trim();
  const districtIndex = clampPickerIndex(
    selectedDistrict
      ? districtNames.findIndex((district) => district === selectedDistrict)
      : 0,
    districtNames.length,
  );

  return {
    range: [provinceNames, cityNames, districtNames] as [
      string[],
      string[],
      string[],
    ],
    region: {
      city,
      district: districtNames[districtIndex] ?? "",
      province: province.province,
    },
    value: [provinceIndex, cityIndex, districtIndex] as AddressRegionPickerValue,
  };
}

export function parseAddressRegionMultiPickerValue(
  value?: number[],
  deliveryRange?: DeliveryRangeInput | null,
) {
  const provinces = getChinaProvinceRegionsForDeliveryRange(deliveryRange);
  const provinceIndex = clampPickerIndex(value?.[0], provinces.length);
  const province = provinces[provinceIndex] ?? { cities: [], province: "" };
  const cityIndex = clampPickerIndex(value?.[1], province.cities.length);
  const city = province.cities[cityIndex] ?? "";
  const districtNames =
    getChinaCityRegion(province.province, city)?.districtNames ?? [];
  const districtIndex = clampPickerIndex(value?.[2], districtNames.length);

  return {
    city,
    district: districtNames[districtIndex] ?? "",
    province: province.province,
  };
}

export function parseAddressRegionMultiPickerColumnChange({
  column,
  current,
  deliveryRange,
  value,
}: {
  column: number;
  current: AddressRegionInput;
  deliveryRange?: DeliveryRangeInput | null;
  value: number;
}) {
  const model = buildAddressRegionMultiPickerModel(current, deliveryRange);
  const nextValue: AddressRegionPickerValue = [...model.value];
  const columnIndex = clampPickerIndex(column, nextValue.length);

  nextValue[columnIndex] = value;

  if (columnIndex === 0) {
    nextValue[1] = 0;
    nextValue[2] = 0;
  } else if (columnIndex === 1) {
    nextValue[2] = 0;
  }

  return parseAddressRegionMultiPickerValue(nextValue, deliveryRange);
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
