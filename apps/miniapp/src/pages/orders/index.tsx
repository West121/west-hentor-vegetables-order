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

type OrderItem = {
  canEdit: boolean;
  createdAt: string;
  id: string;
  items: Array<{
    dishNameSnapshot: string;
    weightJin: number;
  }>;
  logisticsNo: string | null;
  orderNo: string;
  status: string;
  totalWeightJin: number;
  userPackage: {
    nameSnapshot: string;
  };
};

type OrdersData = {
  items: OrderItem[];
  summary: {
    pendingShipment: number;
    shipped: number;
    signed: number;
    total: number;
  };
};

const STATUS_LABELS: Record<string, string> = {
  CANCELED: "已取消",
  PENDING_SHIPMENT: "待发货",
  SHIPPED: "已发货",
  SIGNED: "已签收",
  VOIDED: "已作废",
};

function formatDate(value: string) {
  const date = new Date(value);
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

export default function OrdersPage() {
  const [data, setData] = useState<OrdersData | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadOrders() {
    setLoading(true);

    try {
      const token = Taro.getStorageSync("mini_session_token");
      if (!token) {
        Taro.navigateTo({ url: "/pages/login/index" });
        return;
      }

      const response = await Taro.request<ApiResponse<OrdersData>>({
        header: { authorization: `Bearer ${token}` },
        method: "GET",
        url: `${API_BASE_URL}/api/v1/orders?storeCode=${STORE_CODE}`,
      });
      const payload = response.data;

      if (!payload.success || !payload.data) {
        if (payload.error?.code === "UNAUTHORIZED") {
          Taro.navigateTo({ url: "/pages/login/index" });
          return;
        }

        throw new Error(payload.error?.message ?? "订单加载失败");
      }

      setData(payload.data);
    } catch (error) {
      Taro.showToast({
        icon: "none",
        title: error instanceof Error ? error.message : "订单加载失败",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  function editOrder(orderId: string) {
    Taro.setStorageSync("editing_order_id", orderId);
    Taro.switchTab({ url: "/pages/home/index" });
  }

  async function cancelOrder(orderId: string) {
    const modal = await Taro.showModal({
      cancelText: "再想想",
      confirmText: "确认取消",
      content: "取消后会返还本次套餐次数。",
      title: "取消预订",
    });

    if (!modal.confirm) {
      return;
    }

    try {
      const token = Taro.getStorageSync("mini_session_token");
      const response = await Taro.request<ApiResponse<unknown>>({
        data: {
          reason: "用户取消",
          storeCode: STORE_CODE,
        },
        header: { authorization: `Bearer ${token}` },
        method: "POST",
        url: `${API_BASE_URL}/api/v1/orders/${orderId}/cancel`,
      });

      if (!response.data.success) {
        throw new Error(response.data.error?.message ?? "取消失败");
      }

      Taro.showToast({ icon: "success", title: "已取消" });
      await loadOrders();
    } catch (error) {
      Taro.showToast({
        icon: "none",
        title: error instanceof Error ? error.message : "取消失败",
      });
    }
  }

  async function hideOrder(orderId: string) {
    try {
      const token = Taro.getStorageSync("mini_session_token");
      const response = await Taro.request<ApiResponse<unknown>>({
        header: { authorization: `Bearer ${token}` },
        method: "DELETE",
        url: `${API_BASE_URL}/api/v1/orders/${orderId}/user-visible?storeCode=${STORE_CODE}`,
      });

      if (!response.data.success) {
        throw new Error(response.data.error?.message ?? "删除失败");
      }

      Taro.showToast({ icon: "success", title: "已删除" });
      await loadOrders();
    } catch (error) {
      Taro.showToast({
        icon: "none",
        title: error instanceof Error ? error.message : "删除失败",
      });
    }
  }

  function copyLogisticsNo(logisticsNo: string | null) {
    if (!logisticsNo) {
      Taro.showToast({ icon: "none", title: "暂无运单号" });
      return;
    }

    Taro.setClipboardData({
      data: logisticsNo,
    });
  }

  return (
    <View className="orders">
      <View className="header">
        <View>
          <View className="header__title">订单</View>
          <View className="header__meta">
            待发货 {data?.summary.pendingShipment ?? 0} 单 · 共{" "}
            {data?.summary.total ?? 0} 单
          </View>
        </View>
        <Text className="header__refresh" onClick={loadOrders}>
          刷新
        </Text>
      </View>

      {loading && !data ? (
        <View className="empty">正在加载订单...</View>
      ) : null}

      {data?.items.map((order) => (
        <View className="order" key={order.id}>
          <View className="order__top">
            <View>
              <View className="order__no">{order.orderNo}</View>
              <View className="order__time">{formatDate(order.createdAt)}</View>
            </View>
            <Text className="order__status">
              {STATUS_LABELS[order.status] ?? order.status}
            </Text>
          </View>
          <View className="order__items">
            {order.items
              .map((item) => `${item.dishNameSnapshot} ${item.weightJin}斤`)
              .join(" / ")}
          </View>
          <View className="order__bottom">
            <View className="order__weight">{order.totalWeightJin}斤</View>
            <View className="order__actions">
              {order.status === "SHIPPED" && order.logisticsNo ? (
                <Text
                  className="order__edit order__edit--ghost"
                  onClick={() => copyLogisticsNo(order.logisticsNo)}
                >
                  复制运单
                </Text>
              ) : null}
              {order.status === "CANCELED" || order.status === "VOIDED" ? (
                <Text
                  className="order__edit order__edit--ghost"
                  onClick={() => void hideOrder(order.id)}
                >
                  删除记录
                </Text>
              ) : null}
              {order.canEdit ? (
                <>
                  <Text
                    className="order__edit order__edit--ghost"
                    onClick={() => void cancelOrder(order.id)}
                  >
                    取消预订
                  </Text>
                  <Text
                    className="order__edit"
                    onClick={() => editOrder(order.id)}
                  >
                    修改预订
                  </Text>
                </>
              ) : null}
            </View>
          </View>
        </View>
      ))}

      {!loading && data?.items.length === 0 ? (
        <View className="empty">还没有订单，从首页提交预订后会显示在这里。</View>
      ) : null}
    </View>
  );
}
