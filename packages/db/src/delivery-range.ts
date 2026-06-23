export type DeliveryRangeAddress = {
  city?: string | null;
  province?: string | null;
};

export type DeliveryRangeStore = {
  deliveryCities?: unknown;
  deliveryProvinces?: unknown;
};

export function normalizeDeliveryRangeValues(values?: readonly string[] | null) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values ?? []) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

export function readDeliveryRangeValues(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return normalizeDeliveryRangeValues(
    value.filter((item): item is string => typeof item === "string"),
  );
}

export function getDeliveryRangeFailure(
  address: DeliveryRangeAddress,
  store: DeliveryRangeStore,
) {
  const provinces = readDeliveryRangeValues(store.deliveryProvinces);
  const cities = readDeliveryRangeValues(store.deliveryCities);
  const province = address.province?.trim() ?? "";
  const city = address.city?.trim() ?? "";

  if (provinces.length > 0 && (!province || !provinces.includes(province))) {
    return {
      code: "ADDRESS_OUT_OF_DELIVERY_RANGE",
      message: `当前门店仅配送：${provinces.join("、")}`,
    };
  }

  if (cities.length > 0 && (!city || !cities.includes(city))) {
    return {
      code: "ADDRESS_OUT_OF_DELIVERY_RANGE",
      message: `当前门店仅配送城市：${cities.join("、")}`,
    };
  }

  return null;
}
