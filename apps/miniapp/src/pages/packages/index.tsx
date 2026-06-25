import { Image, Swiper, SwiperItem, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useEffect, useState } from "react";

import loginVegetablesImage from "../../assets/login-vegetables.jpg";
import { requestWithMiniSession } from "../../lib/auth";
import {
  buildPackagesUrl,
  formatPackageUsageDate,
  getFirstPackageItem,
  getPackageHeroView,
  getPackageSlidePosition,
  getPackageUsageDetailText,
  getPackageUsageStatusLabel,
  getPackageUsageWeightLabel,
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
  usageDetails?: Array<{
    benefits?: Array<{
      id: string;
      nameSnapshot: string;
      quantity: number | null;
      unitSnapshot: string | null;
    }>;
    createdAt: string | null;
    id: string;
    items?: Array<{
      dishNameSnapshot: string;
      id: string;
      weightJin: number | null;
    }>;
    orderNo: string | null;
    status: string;
    totalWeightJin: number | null;
  }>;
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

function PackageHeroCard({
  packageInfo,
}: {
  packageInfo: PackageItem | null;
}) {
  const hero = getPackageHeroView(packageInfo);

  return (
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
  );
}

export default function PackagesPage() {
  const [data, setData] = useState<PackagesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPackageIndex, setSelectedPackageIndex] = useState(0);

  async function loadPackages() {
    setLoading(true);

    try {
      const storeCode = getActiveStoreCode(
        Taro.getStorageSync(ACTIVE_STORE_CODE_KEY) as string | undefined,
        DEFAULT_STORE_CODE,
      );

      const response = await requestWithMiniSession<PackagesData>({
        apiBaseUrl: API_BASE_URL,
        storeCode,
        request: (token) =>
          Taro.request<ApiResponse<PackagesData>>({
            header: { authorization: `Bearer ${token}` },
            method: "GET",
            url: buildPackagesUrl({
              apiBaseUrl: API_BASE_URL,
              storeCode,
            }),
          }),
      });
      const payload = response.data;

      if (!payload.success || !payload.data) {
        throw new Error(payload.error?.message ?? "套餐加载失败");
      }

      setData(payload.data);
      setSelectedPackageIndex(0);
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

  const packages = data?.items ?? [];
  const selectedIndex =
    packages.length > 0
      ? Math.min(selectedPackageIndex, packages.length - 1)
      : 0;
  const currentPackage =
    packages[selectedIndex] ?? getFirstPackageItem(packages);
  const hero = getPackageHeroView(currentPackage);
  const usageDetails = currentPackage?.usageDetails ?? [];
  const hasMultiplePackages = packages.length > 1;
  const packagePosition = getPackageSlidePosition(selectedIndex, packages.length);

  function handlePackageChange(event: { detail?: { current?: number } }) {
    const nextIndex = Number(event.detail?.current ?? 0);
    setSelectedPackageIndex(Number.isFinite(nextIndex) ? nextIndex : 0);
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
          {packages.length > 0 ? (
            <View className="package-switcher">
              <View className="package-switcher__head">
                <View>
                  <View className="package-switcher__title">我的套餐</View>
                  <View className="package-switcher__meta">
                    {hasMultiplePackages
                      ? "左右滑动切换，按创建时间先后展示"
                      : "按创建时间先后展示"}
                  </View>
                </View>
                {packagePosition ? (
                  <Text className="package-switcher__count">
                    {packagePosition}
                  </Text>
                ) : null}
              </View>
              <Swiper
                className="package-swiper"
                current={selectedIndex}
                nextMargin={hasMultiplePackages ? "22px" : "0px"}
                onChange={handlePackageChange}
                previousMargin={hasMultiplePackages ? "22px" : "0px"}
              >
                {packages.map((packageItem, index) => (
                  <SwiperItem key={packageItem.id}>
                    <View
                      className={
                        index === selectedIndex
                          ? "package-swiper__item package-swiper__item--active"
                          : "package-swiper__item"
                      }
                    >
                      <PackageHeroCard packageInfo={packageItem} />
                    </View>
                  </SwiperItem>
                ))}
              </Swiper>
              {hasMultiplePackages ? (
                <View className="package-dots">
                  {packages.map((packageItem, index) => (
                    <View
                      className={
                        index === selectedIndex
                          ? "package-dots__item package-dots__item--active"
                          : "package-dots__item"
                      }
                      key={packageItem.id}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          ) : (
            <PackageHeroCard packageInfo={null} />
          )}

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

          <View className="usage-card">
            <View className="usage-card__header">
              <View>
                <View className="usage-card__title">套餐使用明细</View>
                <View className="usage-card__meta">最近使用记录</View>
              </View>
              <Text className="usage-card__count">{usageDetails.length} 次</Text>
            </View>
            {usageDetails.length > 0 ? (
              <View className="usage-card__list">
                {usageDetails.slice(0, 5).map((item) => (
                  <View className="usage-row" key={item.id}>
                    <View className="usage-row__main">
                      <View className="usage-row__order">
                        {item.orderNo ?? "套餐使用"}
                      </View>
                      <View className="usage-row__date">
                        {formatPackageUsageDate(item.createdAt)}
                      </View>
                      <View className="usage-row__detail">
                        {getPackageUsageDetailText(item)}
                      </View>
                    </View>
                    <View className="usage-row__side">
                      <View className="usage-row__weight">
                        {getPackageUsageWeightLabel(item.totalWeightJin)}
                      </View>
                      <View className="usage-row__status">
                        {getPackageUsageStatusLabel(item.status)}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className="usage-card__empty">暂无套餐使用记录</View>
            )}
          </View>

          <Text
            className="primary-button"
            onClick={() => Taro.switchTab({ url: "/pages/home/index" })}
          >
            去首页预订
          </Text>
        </>
      ) : null}

    </View>
  );
}
