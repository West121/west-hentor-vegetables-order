/// <reference path="./china-area-data.d.ts" />

import rawAreaData from "china-area-data";

type ChinaAreaData = Record<string, Record<string, string> | undefined>;

export type ChinaProvinceRegion = {
  cities: string[];
  province: string;
};

export type ChinaCityRegion = {
  city: string;
  cityCode: string;
  districtNames: string[];
  province: string;
  provinceCode: string;
};

export type ChinaDeliveryRangeInput = {
  deliveryCities?: Array<string | null | undefined> | null;
  deliveryProvinces?: Array<string | null | undefined> | null;
};

const COUNTRY_CODE = "86";
const DIRECT_CITY_PROVINCES = new Set([
  "北京市",
  "天津市",
  "上海市",
  "重庆市",
]);
const OMITTED_DISTRICT_NAMES = new Set(["市辖区", "县"]);
const areaData = rawAreaData as ChinaAreaData;

function normalizeText(value?: string | null) {
  const normalized = value?.trim();
  return normalized || "";
}

function normalizeRangeValues(values?: Array<string | null | undefined> | null) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => normalizeText(value))
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function normalizeCityName(province: string, city: string) {
  if (DIRECT_CITY_PROVINCES.has(province) && city === "市辖区") {
    return province;
  }

  return city;
}

function getProvinceEntries() {
  return Object.entries(areaData[COUNTRY_CODE] ?? {});
}

function getCityEntries(provinceCode: string, province: string) {
  const entries = Object.entries(areaData[provinceCode] ?? {});

  if (DIRECT_CITY_PROVINCES.has(province)) {
    const directCity =
      entries.find(([, city]) => city === "市辖区") ?? entries[0] ?? null;
    return directCity
      ? [
          {
            city: province,
            cityCode: directCity[0],
          },
        ]
      : [];
  }

  return entries.map(([cityCode, city]) => ({
    city: normalizeCityName(province, city),
    cityCode,
  }));
}

function getDistrictNames(cityCode: string, city: string) {
  const districts = Object.values(areaData[cityCode] ?? {}).filter(
    (district) => !OMITTED_DISTRICT_NAMES.has(district),
  );

  return districts.length > 0 ? districts : [city];
}

export const CHINA_PROVINCE_REGIONS: ChinaProvinceRegion[] =
  getProvinceEntries().map(([provinceCode, province]) => ({
    cities: getCityEntries(provinceCode, province).map((city) => city.city),
    province,
  }));

export function getChinaCityRegion(
  provinceName?: string | null,
  cityName?: string | null,
): ChinaCityRegion | null {
  const normalizedProvince = normalizeText(provinceName);
  const normalizedCity = normalizeText(cityName);
  if (!normalizedProvince || !normalizedCity) {
    return null;
  }

  const provinceEntry = getProvinceEntries().find(
    ([, province]) => province === normalizedProvince,
  );
  if (!provinceEntry) {
    return null;
  }

  const [provinceCode, province] = provinceEntry;
  const cityEntry = getCityEntries(provinceCode, province).find(
    (item) => item.city === normalizedCity,
  );
  if (!cityEntry) {
    return null;
  }

  return {
    city: cityEntry.city,
    cityCode: cityEntry.cityCode,
    districtNames: getDistrictNames(cityEntry.cityCode, cityEntry.city),
    province,
    provinceCode,
  };
}

export function getChinaProvinceRegionsForDeliveryRange(
  range?: ChinaDeliveryRangeInput | null,
) {
  const deliveryCities = normalizeRangeValues(range?.deliveryCities);
  const deliveryProvinces = normalizeRangeValues(range?.deliveryProvinces);

  if (deliveryCities.length === 0 && deliveryProvinces.length === 0) {
    return CHINA_PROVINCE_REGIONS;
  }

  return CHINA_PROVINCE_REGIONS.flatMap((region) => {
    if (deliveryProvinces.includes(region.province)) {
      return [region];
    }

    const cities = region.cities.filter((city) => deliveryCities.includes(city));
    return cities.length > 0 ? [{ ...region, cities }] : [];
  });
}
