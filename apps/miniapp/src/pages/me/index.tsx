import { Button, Form, Image, Input, Text, View } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { useState } from "react";

import {
  getMiniSessionToken,
  isUnauthorizedMiniResponse,
  MINI_PROFILE_COMPLETION_PROMPT_KEY,
  MINI_SESSION_TOKEN_KEY,
  rememberMiniSessionLogout,
  redirectToMiniLogin,
  refreshMiniSessionToken,
  requestWithMiniSession,
} from "../../lib/auth";
import { getAgreementEntry } from "../../lib/agreements";
import { MiniCustomTop } from "../../components/mini-custom-top";
import loginVegetablesImage from "../../assets/login-vegetables.jpg";
import { getMemberLockNotice, getPackageUsageStats } from "../../lib/me";
import { resolveMediaUrl } from "../../lib/media";
import {
  ACTIVE_STORE_CODE_KEY,
  buildMiniappAccountAvatarUrl,
  buildMiniappAccountUrl,
  buildMiniappMeUrl,
  buildStoreSettingsUrl,
  getActiveStoreCode,
} from "../../lib/stores";
import { useMiniappShare } from "../../lib/share";

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
    avatarUrl?: string | null;
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
  privacyPolicyContent: string;
  privacyPolicyUrl: string;
  userAgreementContent: string;
  userAgreementUrl: string;
};

type AvatarChooseEvent = {
  detail?: {
    avatarUrl?: string;
  };
};

type UploadImageData = {
  image?: {
    url?: string;
  };
};

function memberStatusLabel(member?: MeData["member"]) {
  if (member?.bindingStatus === "DISABLED" || member?.status === "DISABLED") {
    return "已停用";
  }

  return "正常会员";
}

function parseUploadResponse(data: string) {
  try {
    return JSON.parse(data) as ApiResponse<UploadImageData>;
  } catch {
    return {
      error: { code: "UPLOAD_RESPONSE_INVALID", message: "头像上传失败" },
      success: false,
    } satisfies ApiResponse<UploadImageData>;
  }
}

export default function MePage() {
  useMiniappShare(DEFAULT_STORE_CODE);

  const [data, setData] = useState<MeData | null>(null);
  const [settings, setSettings] = useState<PublicSettings>({
    privacyPolicyContent: "",
    privacyPolicyUrl: "",
    userAgreementContent: "",
    userAgreementUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [nicknameModalOpen, setNicknameModalOpen] = useState(false);
  const [avatarDraft, setAvatarDraft] = useState("");
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [profileCompletionMode, setProfileCompletionMode] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
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
      const storeCode = getActiveStoreCode(
        Taro.getStorageSync(ACTIVE_STORE_CODE_KEY) as string | undefined,
        DEFAULT_STORE_CODE,
      );
      const token = await getMiniSessionToken({
        apiBaseUrl: API_BASE_URL,
        storeCode,
      });

      const response = await Taro.request<ApiResponse<MeData>>({
        header: { authorization: `Bearer ${token}` },
        method: "GET",
        url: buildMiniappMeUrl({
          apiBaseUrl: API_BASE_URL,
          storeCode,
        }),
      });
      const payload = response.data;

      if (isUnauthorizedMiniResponse(payload)) {
        Taro.removeStorageSync(MINI_SESSION_TOKEN_KEY);
        setData(null);
        await loadPublicSettings();
        return;
      }

      if (!payload.success || !payload.data) {
        throw new Error(payload.error?.message ?? "我的数据加载失败");
      }

      setData(payload.data);
      await loadPublicSettings();
      maybeOpenProfileCompletion(payload.data);
    } catch (error) {
      setData(null);
      await loadPublicSettings();
    } finally {
      setLoading(false);
    }
  }

  useDidShow(() => {
    void loadMe();
  });

  const isLoggedIn = Boolean(data?.member);
  const memberPhone = data?.member?.phone?.trim() ?? "";
  const memberName = isLoggedIn
    ? data?.member?.nickname?.trim() || "微信用户"
    : "未登录";
  const packageInfo = data?.currentPackage;
  const pendingOrder = data?.recentOrders.find((order) => order.canEdit);
  const lockNotice = getMemberLockNotice(data?.member);
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
  const memberMeta = isLoggedIn
    ? memberPhone || "未绑定手机号"
    : "登录后查看套餐和订单";
  const memberPackageMeta = isLoggedIn
    ? memberStatusLabel(data?.member)
    : "登录后查看套餐等级";

  function openAgreement(
    label: string,
    url: string | null | undefined,
    content: string | null | undefined,
    type: "privacy" | "user",
  ) {
    const entry = getAgreementEntry(label, url, content, type);
    if (entry.disabled || !entry.url) {
      Taro.showToast({
        icon: "none",
        title: entry.toastTitle ?? `暂未配置${label}`,
      });
      return;
    }

    Taro.navigateTo({ url: entry.url });
  }

  function openProfileEditor() {
    if (!isLoggedIn) {
      goLogin();
      return;
    }

    setAvatarDraft(data?.member?.avatarUrl ?? "");
    setNicknameDraft(data?.member?.nickname ?? "");
    setProfileCompletionMode(false);
    setNicknameModalOpen(true);
  }

  function openProfileCompletionEditor(nextData: MeData) {
    setAvatarDraft(nextData.member?.avatarUrl ?? "");
    setNicknameDraft(nextData.member?.nickname ?? "");
    setProfileCompletionMode(true);
    setNicknameModalOpen(true);
  }

  function maybeOpenProfileCompletion(nextData: MeData) {
    const shouldPrompt =
      Taro.getStorageSync(MINI_PROFILE_COMPLETION_PROMPT_KEY) === "1";
    if (!shouldPrompt || !nextData.member) {
      return;
    }

    Taro.removeStorageSync(MINI_PROFILE_COMPLETION_PROMPT_KEY);
    if (!nextData.member.nickname || !nextData.member.avatarUrl) {
      openProfileCompletionEditor(nextData);
    }
  }

  function goLogin() {
    Taro.navigateTo({ url: "/pages/login/index" });
  }

  async function openAccountSettings() {
    if (!isLoggedIn) {
      goLogin();
      return;
    }

    try {
      const result = await Taro.showActionSheet({
        itemList: ["设置头像", "用户协议", "隐私政策", "退出登录"],
      });

      if (result.tapIndex === 0) {
        openProfileEditor();
      }
      if (result.tapIndex === 1) {
        openAgreement(
          "用户协议",
          settings.userAgreementUrl,
          settings.userAgreementContent,
          "user",
        );
      }
      if (result.tapIndex === 2) {
        openAgreement(
          "隐私政策",
          settings.privacyPolicyUrl,
          settings.privacyPolicyContent,
          "privacy",
        );
      }
      if (result.tapIndex === 3) {
        logout();
      }
    } catch {
      // 用户取消弹层时不需要反馈。
    }
  }

  async function uploadAvatarOnce(filePath: string, token: string) {
    const response = await Taro.uploadFile({
      filePath,
      header: { authorization: `Bearer ${token}` },
      name: "file",
      url: buildMiniappAccountAvatarUrl(API_BASE_URL),
    });
    const payload = parseUploadResponse(response.data);
    return { payload, response };
  }

  async function uploadAvatar(filePath: string) {
    const storeCode = getActiveStoreCode(
      Taro.getStorageSync(ACTIVE_STORE_CODE_KEY) as string | undefined,
      DEFAULT_STORE_CODE,
    );
    let token = await getMiniSessionToken({
      apiBaseUrl: API_BASE_URL,
      storeCode,
    });
    let { payload, response } = await uploadAvatarOnce(filePath, token);
    if (isUnauthorizedMiniResponse(payload)) {
      try {
        token = await refreshMiniSessionToken({
          apiBaseUrl: API_BASE_URL,
          storeCode,
        });
      } catch (error) {
        redirectToMiniLogin();
        throw error;
      }
      ({ payload, response } = await uploadAvatarOnce(filePath, token));
    }
    if (isUnauthorizedMiniResponse(payload)) {
      redirectToMiniLogin();
    }

    const avatarUrl = payload.data?.image?.url;
    if (
      response.statusCode < 200 ||
      response.statusCode >= 300 ||
      !payload.success ||
      !avatarUrl
    ) {
      throw new Error(payload.error?.message ?? `头像上传失败(${response.statusCode})`);
    }
    return avatarUrl;
  }

  async function handleAvatarChoose(event: AvatarChooseEvent) {
    const tempAvatarUrl = event.detail?.avatarUrl?.trim();
    if (!tempAvatarUrl) {
      Taro.showToast({ icon: "none", title: "请选择头像" });
      return;
    }

    setAvatarUploading(true);
    Taro.showLoading({ title: "上传中" });
    try {
      const avatarUrl = await uploadAvatar(tempAvatarUrl);
      setAvatarDraft(avatarUrl);
      Taro.showToast({ icon: "success", title: "头像已选择" });
    } catch (error) {
      Taro.showToast({
        icon: "none",
        title: error instanceof Error ? error.message : "头像上传失败",
      });
    } finally {
      Taro.hideLoading();
      setAvatarUploading(false);
    }
  }

  async function saveProfile() {
    const avatarUrl = avatarDraft || data?.member?.avatarUrl || "";
    const nickname = profileCompletionMode ? nicknameDraft.trim() : "";
    if (!avatarUrl && !nickname) {
      Taro.showToast({ icon: "none", title: "请选择头像或填写昵称" });
      return;
    }

    setNicknameSaving(true);
    Taro.showLoading({ title: "保存中" });

    try {
      const storeCode = getActiveStoreCode(
        Taro.getStorageSync(ACTIVE_STORE_CODE_KEY) as string | undefined,
        DEFAULT_STORE_CODE,
      );
      const response = await requestWithMiniSession<{
        member: { avatarUrl?: string | null; nickname: string };
      }>({
        apiBaseUrl: API_BASE_URL,
        storeCode,
        request: (token) =>
          Taro.request<
            ApiResponse<{ member: { avatarUrl?: string | null; nickname: string } }>
          >({
            data: {
              avatarUrl,
              nickname,
              storeCode,
            },
            header: { authorization: `Bearer ${token}` },
            method: "PATCH",
            url: buildMiniappAccountUrl(API_BASE_URL),
          }),
      });

      if (!response.data.success) {
        throw new Error(response.data.error?.message ?? "头像保存失败");
      }

      setNicknameModalOpen(false);
      await loadMe();
      Taro.showToast({
        icon: "success",
        title: profileCompletionMode ? "资料已保存" : "头像已更新",
      });
    } catch (error) {
      Taro.showToast({
        icon: "none",
        title: error instanceof Error ? error.message : "头像保存失败",
      });
    } finally {
      Taro.hideLoading();
      setNicknameSaving(false);
    }
  }

  function logout() {
    rememberMiniSessionLogout();
    Taro.removeStorageSync("editing_order_id");
    setData(null);
    Taro.showToast({ icon: "success", title: "已退出登录" });
    Taro.navigateTo({ url: "/pages/login/index" });
  }

  const memberAvatarUrl = resolveMediaUrl(API_BASE_URL, data?.member?.avatarUrl);

  return (
    <View className="me">
      <View className="profile-hero">
        <MiniCustomTop className="profile-hero__top" dark />
        <View className="profile-hero__content">
          <View className="profile__identity">
            <View
              className="profile__avatar"
              hoverClass="profile__avatar--active"
              onClick={openProfileEditor}
            >
              {memberAvatarUrl ? (
                <Image
                  className="profile__avatar-image"
                  mode="aspectFill"
                  src={memberAvatarUrl}
                />
              ) : (
                <Text>{memberName.slice(0, 1)}</Text>
              )}
            </View>
            <View className="profile__body">
              <View
                className="profile__name"
              >
                {memberName}
              </View>
              <View className="profile__meta">
                <Text className="profile__meta-line">{memberMeta}</Text>
                <Text className="profile__meta-line">{memberPackageMeta}</Text>
              </View>
            </View>
          </View>
          <Image
            className="profile-hero__image"
            mode="aspectFill"
            src={loginVegetablesImage}
          />
        </View>
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
      ) : !isLoggedIn ? (
        <View className="member-card member-card--guest">
          <View className="member-card__head">
            <View>
              <View className="member-card__label">登录后查看套餐</View>
              <View className="member-card__title">查看订单、套餐、地址和账号资料</View>
            </View>
            <Text className="member-card__button" onClick={goLogin}>
              登录
            </Text>
          </View>
        </View>
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
                <View className="nickname-panel__title">
                  {profileCompletionMode ? "完善资料" : "设置头像"}
                </View>
                <View className="nickname-panel__meta">
                  {profileCompletionMode
                    ? "头像和昵称可先跳过，后续仍可继续使用"
                    : "昵称由会员资料同步，不在小程序内修改"}
                </View>
              </View>
              <Text
                className="nickname-panel__close"
                onClick={() => setNicknameModalOpen(false)}
              >
                关闭
              </Text>
            </View>
            <Form
              onSubmit={() => {
                if (!nicknameSaving) {
                  void saveProfile();
                }
              }}
            >
              <View className="profile-editor__avatar-row">
                <Button
                  className="profile-editor__avatar-button"
                  disabled={avatarUploading || nicknameSaving}
                  openType="chooseAvatar"
                  onChooseAvatar={handleAvatarChoose}
                >
                  {resolveMediaUrl(
                    API_BASE_URL,
                    avatarDraft || data?.member?.avatarUrl,
                  ) ? (
                    <Image
                      className="profile-editor__avatar-image"
                      mode="aspectFill"
                      src={resolveMediaUrl(
                        API_BASE_URL,
                        avatarDraft || data?.member?.avatarUrl,
                      )}
                    />
                  ) : (
                    <Text>{memberName.slice(0, 1)}</Text>
                  )}
                </Button>
                <View className="profile-editor__avatar-copy">
                  <View className="profile-editor__avatar-title">头像</View>
                  <View className="profile-editor__avatar-meta">
                    {avatarUploading ? "上传中" : "点击头像选择微信头像"}
                  </View>
                </View>
              </View>
              {profileCompletionMode ? (
                <View className="profile-editor__nickname">
                  <View className="profile-editor__nickname-label">昵称</View>
                  <Input
                    className="profile-editor__nickname-input"
                    maxlength={32}
                    onInput={(event) => setNicknameDraft(event.detail.value)}
                    placeholder="请输入昵称"
                    type="nickname"
                    value={nicknameDraft}
                  />
                </View>
              ) : null}
              <Button
                className={
                  nicknameSaving
                    ? "nickname-panel__save nickname-panel__save--disabled"
                    : "nickname-panel__save"
                }
                disabled={nicknameSaving}
                formType="submit"
              >
                {nicknameSaving
                  ? "保存中"
                  : profileCompletionMode
                    ? "保存资料"
                    : "保存头像"}
              </Button>
            </Form>
          </View>
        </View>
      ) : null}

    </View>
  );
}
