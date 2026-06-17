import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";

import "./index.scss";

export default function MePage() {
  return (
    <View className="me">
      <View className="profile">
        <View className="profile__name">张建国</View>
        <View className="profile__meta">138****5678 · 莲花小区加盟店</View>
      </View>

      <View className="card">
        <View className="card__title">我的服务</View>
        <View
          className="entry"
          onClick={() => Taro.showToast({ title: "套餐功能开发中", icon: "none" })}
        >
          <View>
            <View className="entry__main">套餐</View>
            <View className="entry__meta">8斤周套餐，剩余 5 次</View>
          </View>
          <Text className="entry__arrow">›</Text>
        </View>
        <View
          className="entry"
          onClick={() => Taro.showToast({ title: "订单功能开发中", icon: "none" })}
        >
          <View>
            <View className="entry__main">订单</View>
            <View className="entry__meta">查看预订、配送和修改记录</View>
          </View>
          <Text className="entry__arrow">›</Text>
        </View>
      </View>

      <View className="card">
        <View className="entry">
          <View>
            <View className="entry__main">地址管理</View>
            <View className="entry__meta">默认地址：莲花小区 3栋 602</View>
          </View>
          <Text className="entry__arrow">›</Text>
        </View>
        <View className="entry">
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
