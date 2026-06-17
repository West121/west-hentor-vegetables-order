import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useEffect, useState } from "react";

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

type PackageItem = {
  expiresAt: string;
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
      validDays: number;
      weightLimitJin: number;
    }>;
  };
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "可预订",
  EXPIRED: "已过期",
  FROZEN: "已冻结",
  USED_UP: "已用完",
};

function formatDate(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export default function PackagesPage() {
  const [data, setData] = useState<PackagesData | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadPackages() {
    setLoading(true);

    try {
      const token = Taro.getStorageSync("mini_session_token");
      if (!token) {
        Taro.navigateTo({ url: "/pages/login/index" });
        return;
      }

      const response = await Taro.request<ApiResponse<PackagesData>>({
        header: { authorization: `Bearer ${token}` },
        method: "GET",
        url: `${API_BASE_URL}/api/v1/packages?storeCode=${STORE_CODE}`,
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

  return (
    <View className="packages">
      <View className="header">
        <View className="header__title">套餐</View>
        <View className="header__meta">查看权益、剩余次数和购买预留</View>
      </View>

      {loading && !data ? <View className="empty">正在加载套餐...</View> : null}

      {data?.items.map((item) => (
        <View className="package-card" key={item.id}>
          <View className="package-card__top">
            <View>
              <View className="package-card__name">{item.nameSnapshot}</View>
              <View className="package-card__meta">
                {formatDate(item.expiresAt)} 到期
              </View>
            </View>
            <Text className="package-card__status">
              {STATUS_LABELS[item.status] ?? item.status}
            </Text>
          </View>
          <View className="package-card__numbers">
            <View>
              <View className="number">{item.remainingTimes}</View>
              <View className="number__label">剩余次数</View>
            </View>
            <View>
              <View className="number">{item.weightLimitJin}斤</View>
              <View className="number__label">单次额度</View>
            </View>
            <View>
              <View className="number">{item.usedTimes}/{item.totalTimes}</View>
              <View className="number__label">已用/总数</View>
            </View>
          </View>
          {item.frozenReason ? (
            <View className="package-card__warn">{item.frozenReason}</View>
          ) : null}
        </View>
      ))}

      {!loading && data?.items.length === 0 ? (
        <View className="empty">暂无套餐，购买套餐入口已预留。</View>
      ) : null}

      <View className="reserve">
        <View className="reserve__title">购买套餐</View>
        <View className="reserve__meta">微信支付暂未开放，当前仅展示可购买套餐。</View>
        {data?.purchaseReserve.templates.map((template) => (
          <View className="reserve__item" key={template.id}>
            <View>
              <View className="reserve__name">{template.name}</View>
              <View className="reserve__desc">
                {template.totalTimes} 次 · 每次 {template.weightLimitJin}斤 ·{" "}
                {template.validDays} 天有效
              </View>
            </View>
            <Text
              className="reserve__button"
              onClick={() =>
                Taro.showToast({
                  icon: "none",
                  title: "微信支付暂未开放",
                })
              }
            >
              预留
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
