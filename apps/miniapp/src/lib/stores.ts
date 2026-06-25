export const ACTIVE_STORE_CODE_KEY = "active_store_code";

const STORE_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{2,31}$/;
const LAUNCH_STORE_CODE_KEYS = ["storeCode", "store", "s"] as const;

export type StoreSwitcherItemLike = {
  id: string;
};

export type StoreCodeUrlInput = {
  apiBaseUrl: string;
  storeCode: string;
};

export type MiniappLaunchQuery = Partial<Record<string, unknown>>;

function normalizeStoreCode(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const storeCode = value.trim();
  return STORE_CODE_PATTERN.test(storeCode) ? storeCode : undefined;
}

function decodeScene(scene: string) {
  try {
    return decodeURIComponent(scene.trim());
  } catch {
    return scene.trim();
  }
}

function findStoreCodeInQueryText(queryText: string) {
  const normalizedQueryText = queryText.replace(/^\?/, "");
  for (const pair of normalizedQueryText.split("&")) {
    const [rawKey, rawValue] = pair.split("=");
    if (!rawKey || rawValue === undefined) {
      continue;
    }

    const key = decodeScene(rawKey);
    if (!LAUNCH_STORE_CODE_KEYS.includes(key as (typeof LAUNCH_STORE_CODE_KEYS)[number])) {
      continue;
    }

    const storeCode = normalizeStoreCode(decodeScene(rawValue));
    if (storeCode) {
      return storeCode;
    }
  }

  return undefined;
}

export function resolveLaunchStoreCode(query?: MiniappLaunchQuery) {
  for (const key of LAUNCH_STORE_CODE_KEYS) {
    const storeCode = normalizeStoreCode(query?.[key]);
    if (storeCode) {
      return storeCode;
    }
  }

  const scene = typeof query?.scene === "string" ? decodeScene(query.scene) : "";
  if (!scene) {
    return undefined;
  }

  return findStoreCodeInQueryText(scene) ?? normalizeStoreCode(scene);
}

export function getActiveStoreCode(
  storedStoreCode: string | undefined,
  fallbackStoreCode: string,
) {
  return storedStoreCode?.trim() || fallbackStoreCode;
}

export function shouldShowStoreSwitcher(stores: StoreSwitcherItemLike[]) {
  return stores.length > 1;
}

export function getStoreSwitchToast(storeName: string) {
  return "服务已切换";
}

export function buildStoreSettingsUrl({
  apiBaseUrl,
  storeCode,
}: StoreCodeUrlInput) {
  return `${apiBaseUrl}/api/v1/stores/settings?storeCode=${encodeURIComponent(storeCode)}`;
}

export function buildMiniappMeUrl({ apiBaseUrl, storeCode }: StoreCodeUrlInput) {
  return `${apiBaseUrl}/api/v1/me?storeCode=${encodeURIComponent(storeCode)}`;
}

export function buildMiniappAccountUrl(apiBaseUrl: string) {
  return `${apiBaseUrl}/api/v1/account`;
}

export function buildMiniappAccountAvatarUrl(apiBaseUrl: string) {
  return `${buildMiniappAccountUrl(apiBaseUrl)}/avatar`;
}
