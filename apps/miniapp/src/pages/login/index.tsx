import { Button, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useState } from "react";

import "./index.scss";

const API_BASE_URL =
  process.env.TARO_APP_API_BASE_URL || "http://127.0.0.1:3000";
const STORE_CODE = process.env.TARO_APP_STORE_CODE ?? "lotus-garden";

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

export default function LoginPage() {
  const [submitting, setSubmitting] = useState(false);

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
          token: string;
        }>
      >({
        data: {
          loginCode: login.code,
          phoneCode: event.detail.code,
          storeCode: STORE_CODE,
        },
        method: "POST",
        url: `${API_BASE_URL}/api/v1/auth/wx-phone`,
      });
      const payload = response.data;
      const token = payload.data?.token;

      if (response.statusCode >= 200 && response.statusCode < 300 && token) {
        Taro.setStorageSync("mini_session_token", token);
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
      <View className="login__hero">
        <View className="login__image" />
        <View className="login__title">账号登录</View>
        <View className="login__sub">授权手机号后，可查看套餐并提交蔬菜预订。</View>
        <Button
          className="login__button"
          disabled={submitting}
          loading={submitting}
          openType="getPhoneNumber"
          onGetPhoneNumber={handlePhoneLogin}
        >
          手机号快捷登录
        </Button>
        <View className="login__agreement">
          登录即代表同意《用户协议》和《隐私政策》
        </View>
      </View>
    </View>
  );
}
