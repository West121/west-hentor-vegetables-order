import { Button, Form, Image, Input, Text, View } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { useState } from "react";

import { getAgreementEntry } from "../../lib/agreements";
import { MiniCustomTop } from "../../components/mini-custom-top";
import loginVegetablesImage from "../../assets/login-vegetables.jpg";
import { getMemberLockNotice, getPackageUsageStats } from "../../lib/me";
import {
  ACTIVE_STORE_CODE_KEY,
  buildMiniappMeUrl,
  buildStoreSettingsUrl,
  getActiveStoreCode,
} from "../../lib/stores";

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

type MeData = {
  currentPackage: null | {
    nameSnapshot: string;
    remainingTimes: number;
    status: string;
    totalTimes: number;
    usedTimes: number;
    weightLimitJin: number;
  };
  defaultAddress: null | {
    detail: string;
    receiverPhone: string;
  };
  member: null | {
    bindingStatus?: string | null;
    disabledReason?: string | null;
    nickname: string | null;
    phone: string | null;
    status?: string | null;
  };
  orderSummary: {
    pendingShipment: number;
    shipped: number;
    total: number;
  };
  recentOrders: Array<{
    canEdit: boolean;
    id: string;
    items?: Array<{
      dishNameSnapshot: string;
      weightJin: number;
    }>;
    orderNo: string;
    status: string;
    totalWeightJin: number;
  }>;
  store: null | {
    code?: string;
    cutoffTime?: string | null;
    customerServiceTel: string | null;
    name: string;
  };
};

type PublicSettings = {
  privacyPolicyUrl: string;
  userAgreementUrl: string;
};

function maskPhone(phone?: string | null) {
  if (!phone || phone.length < 7) {
    return phone ?? "未绑定手机号";
  }

  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export default function MePage() {
  const [data, setData] = useState<MeData | null>(null);
  const [settings, setSettings] = useState<PublicSettings>({
    privacyPolicyUrl: "",
    userAgreementUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [nicknameModalOpen, setNicknameModalOpen] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [nicknameSaving, setNicknameSaving] = useState(false);

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
      const payload = response.data;

      if (payload.success && payload.data) {
        setSettings(payload.data);
      }
    } catch {
      // 协议配置失败不影响会员主页主流程。
    }
  }

  async function loadMe() {
    setLoading(true);

    try {
      const token = Taro.getStorageSync("mini_session_token");
      if (!token) {
        Taro.navigateTo({ url: "/pages/login/index" });
        return;
      }
      const storeCode = getActiveStoreCode(
        Taro.getStorageSync(ACTIVE_STORE_CODE_KEY) as string | undefined,
        DEFAULT_STORE_CODE,
      );

      const response = await Taro.request<ApiResponse<MeData>>({
        header: { authorization: `Bearer ${token}` },
        method: "GET",
        url: buildMiniappMeUrl({
          apiBaseUrl: API_BASE_URL,
          storeCode,
        }),
      });
      const payload = response.data;

      if (!payload.success || !payload.data) {
        if (payload.error?.code === "UNAUTHORIZED") {
          Taro.navigateTo({ url: "/pages/login/index" });
          return;
        }

        throw new Error(payload.error?.message ?? "我的数据加载失败");
      }

      setData(payload.data);
      await loadPublicSettings();
    } catch (error) {
      Taro.showToast({
        icon: "none",
        title: error instanceof Error ? error.message : "我的数据加载失败",
      });
    } finally {
      setLoading(false);
    }
  }

  useDidShow(() => {
    void loadMe();
  });

  const memberName = data?.member?.nickname || "微信会员";
  const packageInfo = data?.currentPackage;
  const pendingOrder = data?.recentOrders.find((order) => order.canEdit);
  const lockNotice = getMemberLockNotice(data?.member);
  const memberStatusText = lockNotice ? "服务已暂停" : "正常会员";
  const packageStats = getPackageUsageStats(
    packageInfo,
    pendingOrder?.totalWeightJin ?? 0,
  );
  const serviceEntries = [
    {
      icon: "order",
      label: "订单",
      onClick: () => Taro.navigateTo({ url: "/pages/orders/index" }),
    },
    {
      icon: "pin",
      label: "地址管理",
      onClick: () => Taro.navigateTo({ url: "/pages/addresses/index" }),
    },
    {
      icon: "card",
      label: "套餐",
      onClick: () => Taro.navigateTo({ url: "/pages/packages/index" }),
    },
    {
      icon: "user",
      label: "账号设置",
      onClick: () => void openAccountSettings(),
    },
  ];

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

  async function openAccountSettings() {
    try {
      const result = await Taro.showActionSheet({
        itemList: ["修改昵称", "用户协议", "隐私政策", "退出登录"],
      });

      if (result.tapIndex === 0) {
        setNicknameDraft(data?.member?.nickname ?? "");
        setNicknameModalOpen(true);
      }
      if (result.tapIndex === 1) {
        openAgreement("用户协议", settings.userAgreementUrl);
      }
      if (result.tapIndex === 2) {
        openAgreement("隐私政策", settings.privacyPolicyUrl);
      }
      if (result.tapIndex === 3) {
        logout();
      }
    } catch {
      // 用户取消弹层时不需要反馈。
    }
  }

  async function saveNickname(value?: unknown) {
    const nickname =
      typeof value === "string" && value.trim()
        ? value.trim()
        : nicknameDraft.trim();
    if (!nickname) {
      Taro.showToast({ icon: "none", title: "请输入昵称" });
      return;
    }
    if (nickname.length > 24) {
      Taro.showToast({ icon: "none", title: "昵称最多 24 个字符" });
      return;
    }

    setNicknameSaving(true);
    Taro.showLoading({ title: "保存中" });

    try {
      const storeCode = getActiveStoreCode(
        Taro.getStorageSync(ACTIVE_STORE_CODE_KEY) as string | undefined,
        DEFAULT_STORE_CODE,
      );
      const response = await Taro.request<ApiResponse<{ member: { nickname: string } }>>({
        data: {
          nickname,
          storeCode,
        },
        header: { authorization: `Bearer ${Taro.getStorageSync("mini_session_token")}` },
        method: "PATCH",
        url: `${API_BASE_URL}/api/v1/account`,
      });

      if (!response.data.success) {
        throw new Error(response.data.error?.message ?? "昵称保存失败");
      }

      setNicknameModalOpen(false);
      await loadMe();
      Taro.showToast({ icon: "success", title: "昵称已更新" });
    } catch (error) {
      Taro.showToast({
        icon: "none",
        title: error instanceof Error ? error.message : "昵称保存失败",
      });
    } finally {
      Taro.hideLoading();
      setNicknameSaving(false);
    }
  }

  function logout() {
    Taro.removeStorageSync("mini_session_token");
    Taro.removeStorageSync("editing_order_id");
    setData(null);
    Taro.showToast({ icon: "success", title: "已退出登录" });
    Taro.navigateTo({ url: "/pages/login/index" });
  }

  return (
    <View className="me">
      <View className="profile-hero">
        <MiniCustomTop className="profile-hero__top" dark />
        <View className="profile-hero__content">
          <View className="profile__avatar">{memberName.slice(0, 1)}</View>
          <View className="profile__body">
            <View className="profile__name">{memberName}</View>
            <View className="profile__meta">
              {maskPhone(data?.member?.phone)} · {memberStatusText}
            </View>
          </View>
        </View>
        <Image
          className="profile-hero__image"
          mode="aspectFill"
          src={loginVegetablesImage}
        />
      </View>

      {lockNotice ? (
        <View className="lock-notice">
          <View>
            <View className="lock-notice__title">{lockNotice.title}</View>
            <View className="lock-notice__message">{lockNotice.message}</View>
          </View>
        </View>
      ) : null}

      {loading && !data ? (
        <View className="card card--muted">正在加载会员信息...</View>
      ) : (
        <View className="member-card">
          <View className="member-card__head">
            <View>
              <View className="member-card__label">{packageStats.title}</View>
              <View className="member-card__title">{packageStats.meta}</View>
            </View>
            <Text
              className="member-card__button"
              onClick={() => Taro.navigateTo({ url: "/pages/packages/index" })}
            >
              查看套餐
            </Text>
          </View>
          <View className="member-card__usage">
            <View className="member-card__usage-value">
              {packageStats.remainingWeightLabel}
            </View>
            <View className="member-card__usage-meta">本次剩余额度</View>
          </View>
          <View className="member-card__progress">
            <View
              className="member-card__progress-fill"
              style={{ width: `${packageStats.progressPercent}%` }}
            />
          </View>
        </View>
      )}

      <View className="service-card">
        <View className="service-grid">
          {serviceEntries.map((entry) => (
            <View
              className="service-item"
              key={entry.label}
              onClick={entry.onClick}
            >
              <View
                className={`service-item__icon service-item__icon--${entry.icon}`}
              />
              <View className="service-item__label">{entry.label}</View>
            </View>
          ))}
        </View>
      </View>

      {nicknameModalOpen ? (
        <View className="nickname-modal">
          <View
            className="nickname-modal__mask"
            onClick={() => setNicknameModalOpen(false)}
          />
          <View className="nickname-panel">
            <View className="nickname-panel__handle" />
            <View className="nickname-panel__head">
              <View>
                <View className="nickname-panel__title">修改昵称</View>
                <View className="nickname-panel__meta">
                  可使用微信昵称快捷填写，也可手动输入
                </View>
              </View>
              <Text
                className="nickname-panel__close"
                onClick={() => setNicknameModalOpen(false)}
              >
                关闭
              </Text>
            </View>
            <View className="nickname-panel__label">昵称</View>
            <Form
              onSubmit={(event) => {
                const value = event.detail.value as { nickname?: string };
                if (!nicknameSaving) {
                  void saveNickname(value.nickname);
                }
              }}
            >
              <Input
                className="nickname-panel__input"
                maxlength={24}
                name="nickname"
                onBlur={(event) => {
                  setNicknameDraft(String(event.detail.value ?? ""));
                }}
                onConfirm={(event) => {
                  setNicknameDraft(String(event.detail.value ?? ""));
                }}
                onInput={(event) => {
                  setNicknameDraft(String(event.detail.value ?? ""));
                }}
                onNickNameReview={(event) => {
                  const detail = event.detail as
                    | { pass?: boolean; timeout?: boolean }
                    | undefined;
                  if (detail?.pass === false && !detail.timeout) {
                    Taro.showToast({
                      icon: "none",
                      title: "昵称审核未通过，请调整后再保存",
                    });
                  }
                }}
                placeholder="请输入昵称"
                type="nickname"
                value={nicknameDraft}
              />
              <Button
                className={
                  nicknameSaving
                    ? "nickname-panel__save nickname-panel__save--disabled"
                    : "nickname-panel__save"
                }
                disabled={nicknameSaving}
                formType="submit"
              >
                {nicknameSaving ? "保存中" : "保存昵称"}
              </Button>
            </Form>
          </View>
        </View>
      ) : null}

    </View>
  );
}
