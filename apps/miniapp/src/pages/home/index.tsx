import { Image, Text, View } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { useEffect, useMemo, useState } from "react";

import { calculateReservationSummary } from "@hentor/shared";

import {
  buildHomeUrl,
  buildSelectedItems,
  changeDishSelection,
  getEditingOrderResolution,
} from "../../lib/home";
import "./index.scss";

const API_BASE_URL =
  process.env.TARO_APP_API_BASE_URL || "http://127.0.0.1:3000";
const STORE_CODE = process.env.TARO_APP_STORE_CODE ?? "lotus-garden";

const categories = ["叶菜", "水果", "根茎", "菌菇", "活动"];

const CATEGORY_LABELS: Record<string, string> = {
  ACTIVITY: "活动",
  FRUIT: "果菜",
  LEAFY: "叶菜",
  MUSHROOM: "菌菇",
  ROOT: "根茎",
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
};

type HomeData = {
  currentOrder: null | {
    addressId: string | null;
    id: string;
    items: Array<{
      dishId: string;
      name: string;
      weightJin: number;
    }>;
    orderNo: string;
  };
  defaultAddress: null | {
    detail: string;
    id: string;
  };
  dishes: Array<{
    category: string;
    description: string | null;
    id: string;
    imageUrl: string | null;
    name: string;
    stepJin: number;
    stockJin: number;
  }>;
  member: null | {
    id: string;
  };
  package: null | {
    id: string;
    name: string;
    remainingTimes: number;
    storeId: string;
    userId: string;
    weightLimitJin: number;
  };
  store: {
    cutoffTime: string;
    id: string;
  };
};

export default function HomePage() {
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  async function loadHome(options?: { quiet?: boolean }) {
    if (!options?.quiet) {
      setLoading(true);
    }

    try {
      const token = Taro.getStorageSync("mini_session_token");
      if (!token) {
        Taro.navigateTo({ url: "/pages/login/index" });
        return;
      }
      const editingOrderId = Taro.getStorageSync("editing_order_id") as
        | string
        | undefined;
      const homeUrl = buildHomeUrl({
        apiBaseUrl: API_BASE_URL,
        editingOrderId,
        storeCode: STORE_CODE,
      });

      const response = await Taro.request<ApiResponse<HomeData>>({
        url: homeUrl,
        method: "GET",
        header: {
          authorization: `Bearer ${token}`,
        },
      });
      const payload = response.data;

      if (!payload.success || !payload.data) {
        if (payload.error?.code === "UNAUTHORIZED") {
          Taro.navigateTo({ url: "/pages/login/index" });
          return;
        }

        throw new Error(payload.error?.message ?? "首页数据加载失败");
      }

      setHomeData(payload.data);
      const editingResolution = getEditingOrderResolution(editingOrderId, {
        currentOrder: payload.data.currentOrder,
      });
      if (editingResolution.shouldClearEditingOrder) {
        Taro.removeStorageSync("editing_order_id");
        Taro.showToast({
          title: editingResolution.toastTitle ?? "该订单已不可修改",
          icon: "none",
        });
      }
      setSelected(
        payload.data.currentOrder?.items.reduce<Record<string, number>>(
          (result, item) => ({
            ...result,
            [item.dishId]: item.weightJin,
          }),
          {},
        ) ?? {},
      );
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : "首页数据加载失败",
        icon: "none",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHome();
  }, []);

  useDidShow(() => {
    if (homeData) {
      void loadHome({ quiet: true });
    }
  });

  const packageInfo = homeData?.package;
  const dishes = homeData?.dishes ?? [];
  const hasPackage = Boolean(packageInfo);

  const selectedItems = useMemo(
    () => buildSelectedItems(dishes, selected),
    [dishes, selected],
  );
  const summary = calculateReservationSummary(
    selectedItems,
    packageInfo?.weightLimitJin ?? 0,
  );

  function changeDish(id: string, delta: number, step: number) {
    if (!hasPackage) {
      Taro.showToast({ title: "暂无可用套餐", icon: "none" });
      return;
    }

    setSelected((value) =>
      changeDishSelection(value, {
        delta,
        dishId: id,
        stepJin: step,
      }),
    );
  }

  async function submitOrder() {
    if (!hasPackage) {
      Taro.showToast({ title: "请先购买套餐", icon: "none" });
      return;
    }

    const addressId =
      homeData?.currentOrder?.addressId ?? homeData?.defaultAddress?.id;
    if (!homeData || !packageInfo || !addressId) {
      Taro.showToast({ title: "请先维护配送地址", icon: "none" });
      return;
    }

    if (!selectedItems.length) {
      Taro.showToast({ title: "请选择菜品", icon: "none" });
      return;
    }

    if (summary.isOverLimit) {
      Taro.showToast({ title: "已超过套餐额度", icon: "none" });
      return;
    }

    setSubmitting(true);
    Taro.showLoading({ title: "提交中" });

    try {
      const response = await Taro.request<ApiResponse<unknown>>({
        url: `${API_BASE_URL}/api/v1/reservations`,
        method: "POST",
        header: {
          authorization: `Bearer ${Taro.getStorageSync("mini_session_token")}`,
        },
        data: {
          addressId,
          items: selectedItems.map((item) => ({
            dishId: item.dishId,
            weightJin: item.weightJin,
          })),
          orderId: homeData.currentOrder?.id,
          userPackageId: packageInfo.id,
        },
      });
      const payload = response.data;

      if (!payload.success) {
        throw new Error(payload.error?.message ?? "预订提交失败");
      }

      await loadHome({ quiet: true });
      Taro.removeStorageSync("editing_order_id");
      Taro.showToast({
        title: homeData.currentOrder ? "修改已保存" : "预订已提交",
        icon: "success",
      });
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : "预订提交失败",
        icon: "none",
      });
    } finally {
      Taro.hideLoading();
      setSubmitting(false);
    }
  }

  return (
    <View className="home">
      <View className="topbar">
        <Text className="home__title">首页</Text>
        <Text className="cutoff">{homeData?.store.cutoffTime ?? "18:00"} 截单</Text>
      </View>

      {loading && !homeData ? (
        <View className="empty-package">正在加载今日可预订内容...</View>
      ) : hasPackage && packageInfo ? (
        <View className="package-card">
          <View className="package-card__name">{packageInfo.name}</View>
          <View className="package-card__main">
            已选 {summary.totalWeightJin} / {packageInfo.weightLimitJin}斤
          </View>
          <View className="package-card__meta">
            {homeData?.currentOrder
              ? `正在修改 ${homeData.currentOrder.orderNo}`
              : `本周剩余 ${packageInfo.remainingTimes} 次，可在截单前修改`}
          </View>
        </View>
      ) : (
        <View className="empty-package">
          当前没有可用套餐，暂不能下单。请在“我的-套餐”购买后再预订。
        </View>
      )}

      <View
        className="address"
        onClick={() => Taro.navigateTo({ url: "/pages/addresses/index" })}
      >
        <Text className="address__main">
          默认地址：{homeData?.defaultAddress?.detail ?? "请先添加配送地址"}
        </Text>
        <Text className="address__action">切换</Text>
      </View>

      <View className="section-head">
        <Text className="section-head__title">常订菜品</Text>
        <Text className="section-head__hint">按套餐额度扣减</Text>
      </View>

      <View className="content">
        <View className="categories">
          {categories.map((category, index) => (
            <View
              className={index === 0 ? "category category--active" : "category"}
              key={category}
            >
              {category}
            </View>
          ))}
        </View>

        <View className="dish-list">
          {dishes.map((dish) => {
            const weight = selected[dish.id] ?? 0;
            const categoryLabel = CATEGORY_LABELS[dish.category] ?? "菜品";
            return (
              <View className="dish" key={dish.id}>
                {dish.imageUrl ? (
                  <Image className="dish__image" mode="aspectFill" src={dish.imageUrl} />
                ) : (
                  <View className="dish__image dish__image--placeholder">
                    {dish.name.slice(0, 1)}
                  </View>
                )}
                <View className="dish__body">
                  <View className="dish__name">{dish.name}</View>
                  <View className="dish__desc">
                    {dish.description ?? `${categoryLabel} · 库存 ${dish.stockJin}斤`}
                  </View>
                  <View className="dish__actions">
                    <Text
                      className="round-btn round-btn--ghost"
                      onClick={() => changeDish(dish.id, -dish.stepJin, dish.stepJin)}
                    >
                      -
                    </Text>
                    <Text className="weight">{weight}</Text>
                    <Text
                      className="round-btn"
                      onClick={() => changeDish(dish.id, dish.stepJin, dish.stepJin)}
                    >
                      +
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View className="summary">
        <View>
          <View className="summary__main">
            已选 {summary.itemCount} 样菜 · {summary.totalWeightJin}斤
          </View>
          <View className="summary__meta">
            {summary.isOverLimit
              ? "超过套餐额度，请减少菜品"
              : `可修改已预订内容，剩余 ${summary.remainingWeightJin}斤`}
          </View>
        </View>
        <Text
          className={
            summary.isOverLimit || !hasPackage
              ? "summary__submit summary__submit--disabled"
              : "summary__submit"
          }
          onClick={submitOrder}
        >
          {submitting ? "提交中" : homeData?.currentOrder ? "保存修改" : "提交预订"}
        </Text>
      </View>
    </View>
  );
}
