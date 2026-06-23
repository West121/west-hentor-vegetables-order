import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useEffect, useMemo, useState } from "react";

import {
  buildCancelOrderUrl,
  buildHideOrderUrl,
  buildOrdersListUrl,
  CANCEL_REASONS,
  filterOrdersByStatus,
  ORDER_STATUS_TABS,
  type OrderStatusFilter,
} from "../../lib/orders";
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

const STATUS_TONE_CLASSES: Record<string, string> = {
  CANCELED: "order__status order__status--canceled",
  PENDING_SHIPMENT: "order__status order__status--pending",
  SHIPPED: "order__status order__status--shipped",
  SIGNED: "order__status order__status--signed",
  VOIDED: "order__status order__status--canceled",
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
  const [activeStatus, setActiveStatus] =
    useState<OrderStatusFilter>("PENDING_SHIPMENT");

  async function loadOrders() {
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

      const response = await Taro.request<ApiResponse<OrdersData>>({
        header: { authorization: `Bearer ${token}` },
        method: "GET",
        url: buildOrdersListUrl({
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

  function goBack() {
    Taro.navigateBack({ delta: 1 });
  }

  async function openPendingActions(orderId: string) {
    try {
      const action = await Taro.showActionSheet({
        itemList: ["取消预订", "修改预订"],
      });
      if (action.tapIndex === 0) {
        await cancelOrder(orderId);
        return;
      }
      if (action.tapIndex === 1) {
        editOrder(orderId);
      }
    } catch {
      // 用户关闭操作面板，无需反馈。
    }
  }

  async function chooseCancelReason() {
    try {
      const action = await Taro.showActionSheet({
        itemList: CANCEL_REASONS,
      });
      return CANCEL_REASONS[action.tapIndex] ?? null;
    } catch {
      return null;
    }
  }

  async function cancelOrder(orderId: string) {
    const reason = await chooseCancelReason();
    if (!reason) {
      return;
    }

    const modal = await Taro.showModal({
      cancelText: "再想想",
      confirmText: "确认取消",
      content: `取消原因：${reason}\n取消后会返还本次套餐次数。`,
      title: "取消预订",
    });

    if (!modal.confirm) {
      return;
    }

    try {
      const token = Taro.getStorageSync("mini_session_token");
      const storeCode = getActiveStoreCode(
        Taro.getStorageSync(ACTIVE_STORE_CODE_KEY) as string | undefined,
        DEFAULT_STORE_CODE,
      );
      const response = await Taro.request<ApiResponse<unknown>>({
        data: {
          reason,
          storeCode,
        },
        header: { authorization: `Bearer ${token}` },
        method: "POST",
        url: buildCancelOrderUrl({
          apiBaseUrl: API_BASE_URL,
          orderId,
        }),
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
      const storeCode = getActiveStoreCode(
        Taro.getStorageSync(ACTIVE_STORE_CODE_KEY) as string | undefined,
        DEFAULT_STORE_CODE,
      );
      const response = await Taro.request<ApiResponse<unknown>>({
        header: { authorization: `Bearer ${token}` },
        method: "DELETE",
        url: buildHideOrderUrl({
          apiBaseUrl: API_BASE_URL,
          orderId,
          storeCode,
        }),
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

  const visibleOrders = useMemo(
    () => filterOrdersByStatus(data?.items ?? [], activeStatus),
    [activeStatus, data?.items],
  );

  return (
    <View className="orders">
      <MiniCustomTop
        back
        className="orders__custom-top"
        onBack={goBack}
        title="订单"
      />

      <View className="order-tabs">
        {ORDER_STATUS_TABS.map((tab) => (
          <Text
            className={
              activeStatus === tab.key
                ? "order-tabs__item order-tabs__item--active"
                : "order-tabs__item"
            }
            key={tab.key}
            onClick={() => setActiveStatus(tab.key)}
          >
            {tab.label}
          </Text>
        ))}
      </View>

      {loading && !data ? (
        <View className="empty">正在加载订单...</View>
      ) : null}

      {!loading && data && !visibleOrders.length ? (
        <View className="empty">当前分类暂无订单</View>
      ) : null}

      {visibleOrders.map((order) => (
        <View className="order" key={order.id}>
          <View className="order__top">
            <View className="order__no">{order.orderNo}</View>
            <Text className={STATUS_TONE_CLASSES[order.status] ?? "order__status"}>
              {STATUS_LABELS[order.status] ?? order.status}
            </Text>
          </View>
          <View className="order__items">
            {order.items
              .map((item) => `${item.dishNameSnapshot} ${item.weightJin}斤`)
              .join("、")}
          </View>
          <View className="order__bottom">
            <View className="order__time">{formatDate(order.createdAt)}</View>
            <View className="order__actions">
              {order.canEdit ? (
                <Text
                  className="order__button order__button--primary"
                  onClick={() => void openPendingActions(order.id)}
                >
                  可取消
                </Text>
              ) : null}
              {order.status === "SHIPPED" && order.logisticsNo ? (
                <Text
                  className="order__button order__button--primary"
                  onClick={() => copyLogisticsNo(order.logisticsNo)}
                >
                  复制运单
                </Text>
              ) : null}
              {order.status === "CANCELED" || order.status === "VOIDED" ? (
                <Text
                  className="order__button order__button--danger"
                  onClick={() => void hideOrder(order.id)}
                >
                  删除
                </Text>
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
