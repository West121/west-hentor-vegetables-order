import { Image, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useMemo, useState } from "react";

import { calculateReservationSummary } from "@hentor/shared";

import "./index.scss";

const packageInfo = {
  name: "8斤周套餐",
  limit: 8,
  remainingTimes: 5,
  cutoff: "18:00",
};

const dishes = [
  {
    id: "spinach",
    name: "菠菜",
    category: "叶菜",
    desc: "清炒、煮汤都合适",
    step: 0.5,
    image:
      "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "tomato",
    name: "番茄",
    category: "果菜",
    desc: "酸甜多汁，适合凉拌和煮汤",
    step: 1,
    image:
      "https://images.unsplash.com/photo-1546470427-e5ac89d6ec37?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "cucumber",
    name: "黄瓜",
    category: "活动",
    desc: "脆嫩清爽，今日活动菜",
    step: 0.5,
    image:
      "https://images.unsplash.com/photo-1566486189376-d5f21e25aae4?auto=format&fit=crop&w=200&q=80",
  },
];

const categories = ["叶菜", "水果", "根茎", "菌菇", "活动"];

export default function HomePage() {
  const [selected, setSelected] = useState<Record<string, number>>({
    spinach: 1,
    cucumber: 1.5,
  });
  const [hasPackage] = useState(true);

  const selectedItems = useMemo(
    () =>
      dishes
        .map((dish) => ({
          dishId: dish.id,
          name: dish.name,
          weightJin: selected[dish.id] ?? 0,
        }))
        .filter((item) => item.weightJin > 0),
    [selected],
  );
  const summary = calculateReservationSummary(selectedItems, packageInfo.limit);

  function changeDish(id: string, delta: number, step: number) {
    if (!hasPackage) {
      Taro.showToast({ title: "暂无可用套餐", icon: "none" });
      return;
    }

    setSelected((value) => {
      const next = Math.max(Number(((value[id] ?? 0) + delta).toFixed(2)), 0);
      return {
        ...value,
        [id]: Math.round(next / step) * step,
      };
    });
  }

  function submitOrder() {
    if (!hasPackage) {
      Taro.showToast({ title: "请先购买套餐", icon: "none" });
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

    Taro.showToast({ title: "预订已提交", icon: "success" });
  }

  return (
    <View className="home">
      <View className="topbar">
        <Text className="home__title">首页</Text>
        <Text className="cutoff">{packageInfo.cutoff} 截单</Text>
      </View>

      {hasPackage ? (
        <View className="package-card">
          <View className="package-card__name">{packageInfo.name}</View>
          <View className="package-card__main">
            已选 {summary.totalWeightJin} / {packageInfo.limit}斤
          </View>
          <View className="package-card__meta">
            本周剩余 {packageInfo.remainingTimes} 次，可在截单前修改
          </View>
        </View>
      ) : (
        <View className="empty-package">
          当前没有可用套餐，暂不能下单。请在“我的-套餐”购买后再预订。
        </View>
      )}

      <View className="address">
        <Text className="address__main">默认地址：莲花小区 3栋 602</Text>
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
            return (
              <View className="dish" key={dish.id}>
                <Image className="dish__image" mode="aspectFill" src={dish.image} />
                <View className="dish__body">
                  <View className="dish__name">{dish.name}</View>
                  <View className="dish__desc">{dish.desc}</View>
                  <View className="dish__actions">
                    <Text
                      className="round-btn round-btn--ghost"
                      onClick={() => changeDish(dish.id, -dish.step, dish.step)}
                    >
                      -
                    </Text>
                    <Text className="weight">{weight}</Text>
                    <Text
                      className="round-btn"
                      onClick={() => changeDish(dish.id, dish.step, dish.step)}
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
          提交预订
        </Text>
      </View>
    </View>
  );
}
