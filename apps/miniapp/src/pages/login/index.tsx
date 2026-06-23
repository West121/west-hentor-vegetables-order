import { Button, Image, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useEffect, useState } from "react";

import { MiniCustomTop } from "../../components/mini-custom-top";
import { getAgreementEntry } from "../../lib/agreements";
import {
  ACTIVE_STORE_CODE_KEY,
  buildStoreSettingsUrl,
  getActiveStoreCode,
} from "../../lib/stores";
import loginVegetablesImage from "../../assets/login-vegetables.jpg";
import "./index.scss";

const API_BASE_URL =
  process.env.TARO_APP_API_BASE_URL || "https://mmprd.hentor.com:8103";
const DEFAULT_STORE_CODE = process.env.TARO_APP_STORE_CODE ?? "lotus-garden";

type ApiResponse<T> = {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  success: boolean;
};

type PhoneEvent = {
  detail?: {
    code?: string;
  };
};

type PublicSettings = {
  loginImageUrl: string;
  loginSubtitle: string;
  loginTitle: string;
  loginWelcome: string;
  privacyPolicyUrl: string;
  userAgreementUrl: string;
};

const DEFAULT_LOGIN_SETTINGS = {
  loginImageUrl: "",
  loginSubtitle: "社区鲜蔬会员",
  loginTitle: "Hentor Fresh",
  loginWelcome: "欢迎来到蔬菜预订",
  privacyPolicyUrl: "",
  userAgreementUrl: "",
} satisfies PublicSettings;

export default function LoginPage() {
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<PublicSettings>(
    DEFAULT_LOGIN_SETTINGS,
  );

  async function loadPublicSettings() {
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
      if (response.data.success && response.data.data) {
        setSettings({
          ...DEFAULT_LOGIN_SETTINGS,
          ...response.data.data,
        });
      }
    } catch {
      // 协议链接加载失败不阻断登录，点击时给出未配置提示。
    }
  }

  useEffect(() => {
    void loadPublicSettings();
  }, []);

  function openAgreement(label: string, url?: string | null) {
    const entry = getAgreementEntry(label, url);
    if (entry.disabled || !entry.url) {
      Taro.showToast({
        icon: "none",
        title: entry.toastTitle ?? `暂未配置${label}`,
      });
      return;
    }

    Taro.navigateTo({ url: entry.url });
  }

  function goBack() {
    if (Taro.getCurrentPages().length > 1) {
      Taro.navigateBack();
      return;
    }

    Taro.switchTab({ url: "/pages/home/index" });
  }

  async function handlePhoneLogin(event: PhoneEvent) {
    if (submitting) {
      return;
    }

    if (!event.detail?.code) {
      Taro.showToast({ title: "需要授权手机号", icon: "none" });
      return;
    }

    setSubmitting(true);
    Taro.showLoading({ title: "登录中" });

    try {
      const login = await Taro.login();
      if (!login.code) {
        throw new Error("微信登录凭证获取失败");
      }

      const response = await Taro.request<
        ApiResponse<{
          store: {
            code: string;
          };
          token: string;
        }>
      >({
        data: {
          loginCode: login.code,
          phoneCode: event.detail.code,
          storeCode: getActiveStoreCode(
            Taro.getStorageSync(ACTIVE_STORE_CODE_KEY) as string | undefined,
            DEFAULT_STORE_CODE,
          ),
        },
        method: "POST",
        url: `${API_BASE_URL}/api/v1/auth/wx-phone`,
      });
      const payload = response.data;
      const token = payload.data?.token;

      if (response.statusCode >= 200 && response.statusCode < 300 && token) {
        Taro.setStorageSync("mini_session_token", token);
        if (payload.data?.store.code) {
          Taro.setStorageSync(ACTIVE_STORE_CODE_KEY, payload.data.store.code);
        }
        Taro.switchTab({ url: "/pages/home/index" });
        return;
      }

      throw new Error(payload.error?.message ?? "登录暂不可用");
    } catch (error) {
      Taro.showToast({
        icon: "none",
        title: error instanceof Error ? error.message : "登录暂不可用",
      });
    } finally {
      Taro.hideLoading();
      setSubmitting(false);
    }
  }

  return (
    <View className="login">
      <MiniCustomTop back className="login__custom-top" onBack={goBack} />

      <View className="login__brand">
        <View className="login__mark">
          <Image
            className="login__mark-image"
            mode="aspectFill"
            src={settings.loginImageUrl || loginVegetablesImage}
          />
        </View>
        <View className="login__brand-name">{settings.loginTitle}</View>
        <View className="login__brand-subtitle">{settings.loginSubtitle}</View>
        <View className="login__welcome">{settings.loginWelcome}</View>
      </View>

      <View className="login__actions">
        <Button
          className="login__button"
          disabled={submitting}
          loading={submitting}
          openType="getPhoneNumber"
          onGetPhoneNumber={handlePhoneLogin}
        >
          立即登录
        </Button>
        <View className="login__agreement">
          我已阅读、理解并接受
          <Text
            className="login__agreement-link"
            onClick={() => openAgreement("用户协议", settings.userAgreementUrl)}
          >
            《用户协议》
          </Text>
          和
          <Text
            className="login__agreement-link"
            onClick={() => openAgreement("隐私政策", settings.privacyPolicyUrl)}
          >
            《隐私政策》
          </Text>
        </View>
      </View>
    </View>
  );
}
