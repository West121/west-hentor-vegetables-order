import { Button, Form, Image, Input, Text, View } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { useState } from "react";

import {
  MINI_SESSION_TOKEN_KEY,
  getMiniSessionToken,
  isUnauthorizedMiniResponse,
  redirectToMiniLogin,
  refreshMiniSessionToken,
  requestWithMiniSession,
} from "../../lib/auth";
import { getAgreementEntry } from "../../lib/agreements";
import { MiniCustomTop } from "../../components/mini-custom-top";
import loginVegetablesImage from "../../assets/login-vegetables.jpg";
import { getMemberLockNotice, getPackageUsageStats } from "../../lib/me";
import {
  ACTIVE_STORE_CODE_KEY,
  buildMiniappAccountAvatarUrl,
  buildMiniappAccountUrl,
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
  privacyPolicyUrl: string;
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

function maskPhone(phone?: string | null) {
  if (!phone || phone.length < 7) {
    return phone ?? "未绑定手机号";
  }

  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

function memberStatusLabel(member?: MeData["member"]) {
  if (member?.bindingStatus === "DISABLED" || member?.status === "DISABLED") {
    return "已停用";
  }

  return "正常会员";
}

function resolveMediaUrl(url?: string | null) {
  const normalized = url?.trim();
  if (!normalized) {
    return "";
  }
  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("wxfile://") ||
    normalized.startsWith("data:")
  ) {
    return normalized;
  }
  if (normalized.startsWith("/")) {
    return `${API_BASE_URL.replace(/\/+$/, "")}${normalized}`;
  }
  return normalized;
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
  const [data, setData] = useState<MeData | null>(null);
  const [settings, setSettings] = useState<PublicSettings>({
    privacyPolicyUrl: "",
    userAgreementUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [nicknameModalOpen, setNicknameModalOpen] = useState(false);
  const [avatarDraft, setAvatarDraft] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
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
      const storeCode = getActiveStoreCode(
        Taro.getStorageSync(ACTIVE_STORE_CODE_KEY) as string | undefined,
        DEFAULT_STORE_CODE,
      );

      const response = await requestWithMiniSession<MeData>({
        apiBaseUrl: API_BASE_URL,
        storeCode,
        request: (token) =>
          Taro.request<ApiResponse<MeData>>({
            header: { authorization: `Bearer ${token}` },
            method: "GET",
            url: buildMiniappMeUrl({
              apiBaseUrl: API_BASE_URL,
              storeCode,
            }),
          }),
      });
      const payload = response.data;

      if (!payload.success || !payload.data) {
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
  const memberMeta = `${maskPhone(data?.member?.phone)} · ${memberStatusLabel(data?.member)}`;

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

  function openProfileEditor() {
    setAvatarDraft(data?.member?.avatarUrl ?? "");
    setNicknameDraft(data?.member?.nickname ?? "");
    setNicknameModalOpen(true);
  }

  function openNicknameEditor() {
    openProfileEditor();
  }

  async function openAccountSettings() {
    try {
      const result = await Taro.showActionSheet({
        itemList: ["编辑资料", "用户协议", "隐私政策", "退出登录"],
      });

      if (result.tapIndex === 0) {
        openProfileEditor();
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

  async function saveProfile(value?: unknown) {
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
              avatarUrl: avatarDraft || data?.member?.avatarUrl || null,
              nickname,
              storeCode,
            },
            header: { authorization: `Bearer ${token}` },
            method: "PATCH",
            url: buildMiniappAccountUrl(API_BASE_URL),
          }),
      });

      if (!response.data.success) {
        throw new Error(response.data.error?.message ?? "昵称保存失败");
      }

      setNicknameModalOpen(false);
      await loadMe();
      Taro.showToast({ icon: "success", title: "资料已更新" });
    } catch (error) {
      Taro.showToast({
        icon: "none",
        title: error instanceof Error ? error.message : "资料保存失败",
      });
    } finally {
      Taro.hideLoading();
      setNicknameSaving(false);
    }
  }

  function logout() {
    Taro.removeStorageSync(MINI_SESSION_TOKEN_KEY);
    Taro.removeStorageSync("editing_order_id");
    setData(null);
    Taro.showToast({ icon: "success", title: "已退出登录" });
    Taro.navigateTo({ url: "/pages/login/index" });
  }

  const memberAvatarUrl = resolveMediaUrl(data?.member?.avatarUrl);

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
                hoverClass="profile__name--active"
                onClick={openNicknameEditor}
              >
                {memberName}
              </View>
              <View className="profile__meta">{memberMeta}</View>
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
                <View className="nickname-panel__title">编辑资料</View>
                <View className="nickname-panel__meta">
                  设置头像和昵称
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
              onSubmit={(event) => {
                const value = event.detail.value as { nickname?: string };
                if (!nicknameSaving) {
                  void saveProfile(value.nickname);
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
                  {resolveMediaUrl(avatarDraft || data?.member?.avatarUrl) ? (
                    <Image
                      className="profile-editor__avatar-image"
                      mode="aspectFill"
                      src={resolveMediaUrl(avatarDraft || data?.member?.avatarUrl)}
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
              <View className="nickname-panel__label">
                昵称<Text className="required-mark">*</Text>
              </View>
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
                {nicknameSaving ? "保存中" : "保存资料"}
              </Button>
            </Form>
          </View>
        </View>
      ) : null}

    </View>
  );
}
