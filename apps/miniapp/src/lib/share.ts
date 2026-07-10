import Taro, {
  useDidShow,
  useShareAppMessage,
  useShareTimeline,
} from "@tarojs/taro";

import { ACTIVE_STORE_CODE_KEY, getActiveStoreCode } from "./stores";

const SHARE_TITLE = "涵氧轻康蔬菜预订";
const SHARE_SUMMARY = "每周新鲜蔬菜预订，按需选择，按时配送。";

export function buildMiniSharePath(defaultStoreCode: string) {
  const storeCode = getActiveStoreCode(
    String(Taro.getStorageSync(ACTIVE_STORE_CODE_KEY) ?? ""),
    defaultStoreCode,
  );
  return `/pages/home/index?storeCode=${encodeURIComponent(storeCode)}`;
}

export function buildMiniShareQuery(defaultStoreCode: string) {
  const storeCode = getActiveStoreCode(
    String(Taro.getStorageSync(ACTIVE_STORE_CODE_KEY) ?? ""),
    defaultStoreCode,
  );
  return `storeCode=${encodeURIComponent(storeCode)}`;
}

export function useMiniappShare(defaultStoreCode: string) {
  useDidShow(() => {
    const showShareMenu = Taro.showShareMenu as unknown as (options: {
      menus?: string[];
      withShareTicket?: boolean;
    }) => void;
    showShareMenu({
      withShareTicket: true,
      menus: ["shareAppMessage", "shareTimeline"],
    });
  });

  useShareAppMessage(() => ({
    path: buildMiniSharePath(defaultStoreCode),
    title: SHARE_TITLE,
  }));

  useShareTimeline(() => ({
    query: buildMiniShareQuery(defaultStoreCode),
    title: `${SHARE_TITLE} - ${SHARE_SUMMARY}`,
  }));
}
