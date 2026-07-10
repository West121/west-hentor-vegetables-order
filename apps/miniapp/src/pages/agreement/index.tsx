import { RichText, View } from "@tarojs/components";
import Taro, { useRouter } from "@tarojs/taro";
import { useEffect, useState } from "react";

import { MiniCustomTop } from "../../components/mini-custom-top";
import {
  ACTIVE_STORE_CODE_KEY,
  buildStoreSettingsUrl,
  getActiveStoreCode,
} from "../../lib/stores";
import "./index.scss";

import { API_BASE_URL } from "../../lib/api-base-url";
const DEFAULT_STORE_CODE = process.env.TARO_APP_STORE_CODE ?? "lotus-garden";

type ApiResponse<T> = {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  success: boolean;
};

type PublicSettings = {
  privacyPolicyContent: string;
  userAgreementContent: string;
};

function pageTitle(type: string | undefined) {
  return type === "privacy" ? "隐私政策" : "用户协议";
}

function formatAgreementContent(html: string) {
  return html
    .replace(
      /<h2>/g,
      '<div style="font-size:36rpx;font-weight:800;line-height:1.35;margin:0 0 28rpx;color:#102017;">',
    )
    .replace(/<\/h2>/g, "</div>")
    .replace(
      /<h3>/g,
      '<div style="font-size:30rpx;font-weight:700;line-height:1.45;margin:30rpx 0 12rpx;color:#182a20;">',
    )
    .replace(/<\/h3>/g, "</div>")
    .replace(
      /<p>/g,
      '<div style="font-size:27rpx;line-height:1.75;margin:0 0 18rpx;color:#31433a;text-align:justify;">',
    )
    .replace(/<\/p>/g, "</div>");
}

export default function AgreementPage() {
  const router = useRouter();
  const type = String(router.params.type ?? "user");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadContent();
  }, [type]);

  async function loadContent() {
    setLoading(true);
    try {
      const storeCode = getActiveStoreCode(
        Taro.getStorageSync(ACTIVE_STORE_CODE_KEY) as string | undefined,
        DEFAULT_STORE_CODE,
      );
      const response = await Taro.request<ApiResponse<PublicSettings>>({
        method: "GET",
        url: buildStoreSettingsUrl({
          apiBaseUrl: API_BASE_URL,
          storeCode,
        }),
      });
      const settings = response.data.data;
      setContent(
        type === "privacy"
          ? settings?.privacyPolicyContent ?? ""
          : settings?.userAgreementContent ?? "",
      );
    } catch {
      setContent("");
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (Taro.getCurrentPages().length > 1) {
      Taro.navigateBack({ delta: 1 });
      return;
    }

    Taro.switchTab({ url: "/pages/home/index" });
  }

  return (
    <View className="agreement-page">
      <MiniCustomTop back onBack={handleBack} title={pageTitle(type)} />
      <View className="agreement-page__body">
        <View className="agreement-page__title">{pageTitle(type)}</View>
        <View className="agreement-page__meta">请仔细阅读以下内容</View>
        <View className="agreement-page__divider" />
        <View className="agreement-page__content-wrap">
          {content ? (
            <RichText
              className="agreement-page__content"
              nodes={formatAgreementContent(content)}
            />
          ) : (
            <View className="agreement-page__empty">
              {loading ? "协议内容加载中" : "协议内容暂未配置"}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
