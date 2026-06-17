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

type MeData = {
  currentPackage: null | {
    expiresAt: string;
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
    nickname: string | null;
    phone: string | null;
  };
  orderSummary: {
    pendingShipment: number;
    shipped: number;
    total: number;
  };
  recentOrders: Array<{
    canEdit: boolean;
    id: string;
    orderNo: string;
    status: string;
    totalWeightJin: number;
  }>;
  store: null | {
    customerServiceTel: string | null;
    name: string;
  };
};

function maskPhone(phone?: string | null) {
  if (!phone || phone.length < 7) {
    return phone ?? "未绑定手机号";
  }

  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

function formatDate(value?: string) {
  if (!value) {
    return "未设置";
  }

  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export default function MePage() {
  const [data, setData] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    setLoading(true);

    try {
      const token = Taro.getStorageSync("mini_session_token");
      if (!token) {
        Taro.navigateTo({ url: "/pages/login/index" });
        return;
      }

      const response = await Taro.request<ApiResponse<MeData>>({
        header: { authorization: `Bearer ${token}` },
        method: "GET",
        url: `${API_BASE_URL}/api/v1/me?storeCode=${STORE_CODE}`,
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
    } catch (error) {
      Taro.showToast({
        icon: "none",
        title: error instanceof Error ? error.message : "我的数据加载失败",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMe();
  }, []);

  const memberName = data?.member?.nickname || "微信会员";
  const packageInfo = data?.currentPackage;
  const pendingOrder = data?.recentOrders.find((order) => order.canEdit);

  return (
    <View className="me">
      <View className="profile">
        <View className="profile__avatar">{memberName.slice(0, 1)}</View>
        <View className="profile__body">
          <View className="profile__name">{memberName}</View>
          <View className="profile__meta">
            {maskPhone(data?.member?.phone)} · {data?.store?.name ?? "当前门店"}
          </View>
        </View>
      </View>

      {loading && !data ? (
        <View className="card card--muted">正在加载会员信息...</View>
      ) : (
        <View className="package-hero">
          <View>
            <View className="package-hero__label">当前套餐</View>
            <View className="package-hero__name">
              {packageInfo?.nameSnapshot ?? "暂无有效套餐"}
            </View>
            <View className="package-hero__meta">
              {packageInfo
                ? `剩余 ${packageInfo.remainingTimes} 次 · 每次 ${packageInfo.weightLimitJin}斤`
                : "购买套餐入口已预留，微信支付暂未开放"}
            </View>
          </View>
          <Text
            className="package-hero__button"
            onClick={() => Taro.navigateTo({ url: "/pages/packages/index" })}
          >
            套餐
          </Text>
        </View>
      )}

      <View className="card">
        <View className="card__title">今日预订</View>
        <View className="today">
          <View>
            <View className="today__main">
              {pendingOrder ? "待发货，可修改" : "暂无待发货预订"}
            </View>
            <View className="today__meta">
              {pendingOrder
                ? `${pendingOrder.orderNo} · ${pendingOrder.totalWeightJin}斤`
                : "从首页选择菜品后提交预订"}
            </View>
          </View>
          <Text
            className="today__button"
            onClick={() => Taro.switchTab({ url: "/pages/home/index" })}
          >
            {pendingOrder ? "修改" : "去预订"}
          </Text>
        </View>
      </View>

      <View className="card">
        <View className="card__title">我的服务</View>
        <View
          className="entry"
          onClick={() => Taro.navigateTo({ url: "/pages/orders/index" })}
        >
          <View>
            <View className="entry__main">订单</View>
            <View className="entry__meta">
              共 {data?.orderSummary.total ?? 0} 单，待发货{" "}
              {data?.orderSummary.pendingShipment ?? 0} 单
            </View>
          </View>
          <Text className="entry__arrow">›</Text>
        </View>
        <View
          className="entry"
          onClick={() => Taro.navigateTo({ url: "/pages/packages/index" })}
        >
          <View>
            <View className="entry__main">套餐</View>
            <View className="entry__meta">
              {packageInfo
                ? `${packageInfo.nameSnapshot}，${formatDate(packageInfo.expiresAt)} 到期`
                : "查看套餐权益和购买预留"}
            </View>
          </View>
          <Text className="entry__arrow">›</Text>
        </View>
      </View>

      <View className="card">
        <View
          className="entry"
          onClick={() => Taro.navigateTo({ url: "/pages/addresses/index" })}
        >
          <View>
            <View className="entry__main">地址管理</View>
            <View className="entry__meta">
              {data?.defaultAddress?.detail ?? "暂无默认地址"}
            </View>
          </View>
          <Text className="entry__arrow">›</Text>
        </View>
        <View
          className="entry"
          onClick={() =>
            Taro.showToast({
              icon: "none",
              title: data?.store?.customerServiceTel ?? "请联系门店客服",
            })
          }
        >
          <View>
            <View className="entry__main">联系客服</View>
            <View className="entry__meta">套餐、配送、门店问题</View>
          </View>
          <Text className="entry__arrow">›</Text>
        </View>
      </View>
    </View>
  );
}
