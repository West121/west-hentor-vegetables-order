import { Button, View } from "@tarojs/components";
import Taro from "@tarojs/taro";

import "./index.scss";

type PhoneEvent = {
  detail?: {
    code?: string;
  };
};

export default function LoginPage() {
  async function handlePhoneLogin(event: PhoneEvent) {
    if (!event.detail?.code) {
      Taro.showToast({ title: "需要授权手机号", icon: "none" });
      return;
    }

    const login = await Taro.login();
    await Taro.request({
      url: `${process.env.TARO_APP_API_BASE_URL}/api/v1/auth/wx-phone`,
      method: "POST",
      data: {
        loginCode: login.code,
        phoneCode: event.detail.code,
        storeCode: "lotus-garden",
      },
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          Taro.switchTab({ url: "/pages/home/index" });
          return;
        }

        Taro.showToast({ title: "登录暂不可用", icon: "none" });
      },
    });
  }

  return (
    <View className="login">
      <View className="login__hero">
        <View className="login__image" />
        <View className="login__title">账号登录</View>
        <View className="login__sub">授权手机号后，可查看套餐并提交蔬菜预订。</View>
        <Button
          className="login__button"
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
