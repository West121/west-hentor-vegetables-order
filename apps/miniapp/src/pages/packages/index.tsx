import { Image, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useEffect, useState } from "react";

import loginVegetablesImage from "../../assets/login-vegetables.jpg";
import {
  buildPackagePrepayUrl,
  buildPackagesUrl,
  getCurrentPackageItem,
  getPackageHeroView,
  getPackagePurchaseAction,
  getPackagePurchaseToast,
} from "../../lib/packages";
import { MiniCustomTop } from "../../components/mini-custom-top";
import { ACTIVE_STORE_CODE_KEY, getActiveStoreCode } from "../../lib/stores";
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

type PackageItem = {
  frozenReason: string | null;
  id: string;
  nameSnapshot: string;
  remainingTimes: number;
  status: string;
  totalTimes: number;
  usedTimes: number;
  weightLimitJin: number;
};

type PackagesData = {
  items: PackageItem[];
  purchaseReserve: {
    enabled: boolean;
    status: string;
    templates: Array<{
      id: string;
      name: string;
      totalTimes: number;
      weightLimitJin: number;
    }>;
  };
};

export default function PackagesPage() {
  const [data, setData] = useState<PackagesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasingTemplateId, setPurchasingTemplateId] = useState<string | null>(
    null,
  );

  async function loadPackages() {
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

      const response = await Taro.request<ApiResponse<PackagesData>>({
        header: { authorization: `Bearer ${token}` },
        method: "GET",
        url: buildPackagesUrl({
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

        throw new Error(payload.error?.message ?? "套餐加载失败");
      }

      setData(payload.data);
    } catch (error) {
      Taro.showToast({
        icon: "none",
        title: error instanceof Error ? error.message : "套餐加载失败",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPackages();
  }, []);

  const currentPackage = getCurrentPackageItem(data?.items ?? []);
  const hero = getPackageHeroView(currentPackage);
  const purchaseTemplate = data?.purchaseReserve.templates[0] ?? null;
  const purchaseAction = getPackagePurchaseAction({
    enabled: data?.purchaseReserve.enabled ?? false,
    purchaseStatus: data?.purchaseReserve.status ?? "PAYMENT_NOT_ENABLED",
    templateId: purchaseTemplate?.id,
  });
  const purchaseLoading =
    !!purchaseTemplate && purchasingTemplateId === purchaseTemplate.id;

  async function reservePurchase(templateId: string) {
    if (purchasingTemplateId) {
      return;
    }

    const token = Taro.getStorageSync("mini_session_token");
    if (!token) {
      Taro.navigateTo({ url: "/pages/login/index" });
      return;
    }

    setPurchasingTemplateId(templateId);

    try {
      const storeCode = getActiveStoreCode(
        Taro.getStorageSync(ACTIVE_STORE_CODE_KEY) as string | undefined,
        DEFAULT_STORE_CODE,
      );
      const purchaseResponse = await Taro.request<
        ApiResponse<{
          purchaseOrder: {
            id: string;
            status: string;
          };
        }>
      >({
        data: {
          storeCode,
          templateId,
        },
        header: { authorization: `Bearer ${token}` },
        method: "POST",
        url: `${API_BASE_URL}/api/v1/package-purchases`,
      });
      const purchasePayload = purchaseResponse.data;
      const purchaseOrder = purchasePayload.data?.purchaseOrder;

      if (!purchasePayload.success || !purchaseOrder) {
        throw new Error(purchasePayload.error?.message ?? "购买入口暂不可用");
      }

      const prepayResponse = await Taro.request<
        ApiResponse<{
          prepay: {
            status: string;
          };
        }>
      >({
        header: { authorization: `Bearer ${token}` },
        method: "POST",
        url: buildPackagePrepayUrl({
          apiBaseUrl: API_BASE_URL,
          purchaseOrderId: purchaseOrder.id,
          storeCode,
        }),
      });
      const prepayPayload = prepayResponse.data;

      if (!prepayPayload.success) {
        throw new Error(prepayPayload.error?.message ?? "微信支付暂未开放");
      }

      Taro.showToast({
        icon: "none",
        title: getPackagePurchaseToast(prepayPayload.data?.prepay.status),
      });
    } catch (error) {
      Taro.showToast({
        icon: "none",
        title: error instanceof Error ? error.message : "购买入口暂不可用",
      });
    } finally {
      setPurchasingTemplateId(null);
    }
  }

  return (
    <View className="packages">
      <MiniCustomTop
        back
        className="packages__custom-top"
        onBack={() => Taro.navigateBack()}
        title="套餐"
      />

      {loading && !data ? <View className="empty">正在加载套餐...</View> : null}

      {!loading || data ? (
        <>
          <View className="hero-card">
            <View className="hero-card__brand">Hentor Fresh</View>
            <View className="hero-card__title">{hero.title}</View>
            <View className="hero-card__subtitle">{hero.subtitle}</View>
            <View className="hero-card__status-row">
              <Text className="hero-card__status">{hero.statusLabel}</Text>
              <Text className="hero-card__status-meta">{hero.statusMeta}</Text>
            </View>
            <Image
              className="hero-card__photo"
              mode="aspectFill"
              src={loginVegetablesImage}
            />
          </View>

          <View className="section-title">套餐权益</View>
          <View className="benefit-grid">
            <View className="benefit-card">
              <View className="benefit-card__dot" />
              <View>
                <View className="benefit-card__title">
                  {hero.weightBenefitLabel}
                </View>
                <View className="benefit-card__meta">
                  {hero.weightBenefitMeta}
                </View>
              </View>
            </View>
            <View className="benefit-card">
              <View className="benefit-card__dot" />
              <View>
                <View className="benefit-card__title">
                  {hero.remainingTimesLabel}
                </View>
                <View className="benefit-card__meta">本周还可下单</View>
              </View>
            </View>
            <View className="benefit-card">
              <View className="benefit-card__dot benefit-card__dot--orange" />
              <View>
                <View className="benefit-card__title">可修改</View>
                <View className="benefit-card__meta">截单前随时调整</View>
              </View>
            </View>
            <View className="benefit-card">
              <View className="benefit-card__dot" />
              <View>
                <View className="benefit-card__title">默认地址</View>
                <View className="benefit-card__meta">下单自动带入</View>
              </View>
            </View>
          </View>

          <View className="cycle-card">
            <View className="cycle-card__title">本周期用量</View>
            <View className="cycle-card__meta">{hero.cycleMeta}</View>
            <View className="cycle-card__track">
              <View
                className="cycle-card__fill"
                style={{ width: `${hero.cycleProgressPercent}%` }}
              />
            </View>
            <View className="cycle-card__next">{hero.nextOrderLabel}</View>
            {currentPackage?.frozenReason ? (
              <View className="cycle-card__warn">{currentPackage.frozenReason}</View>
            ) : null}
          </View>

          <Text
            className="primary-button"
            onClick={() => Taro.switchTab({ url: "/pages/home/index" })}
          >
            去首页预订
          </Text>

          <View className="payment-reserve">
            <View className="payment-reserve__icon">¥</View>
            <View className="payment-reserve__body">
              <View className="payment-reserve__title">购买/续费套餐</View>
              <View className="payment-reserve__meta">
                {purchaseTemplate
                  ? purchaseAction.meta
                  : "暂无可购买套餐，请联系客服"}
              </View>
            </View>
            <Text
              className={`payment-reserve__button ${
                purchaseLoading || purchaseAction.disabled
                  ? "payment-reserve__button--disabled"
                  : ""
              }`}
              onClick={() =>
                !purchaseTemplate || purchaseAction.disabled || purchaseLoading
                  ? null
                  : void reservePurchase(purchaseTemplate.id)
              }
            >
              {purchaseLoading ? "处理中" : purchaseAction.label}
            </Text>
          </View>
        </>
      ) : null}

    </View>
  );
}
