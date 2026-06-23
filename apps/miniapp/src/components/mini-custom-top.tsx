import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";

import "./mini-custom-top.scss";

type MiniCustomTopProps = {
  back?: boolean;
  className?: string;
  dark?: boolean;
  onBack?: () => void;
  title?: string;
};

function getTopMetrics() {
  try {
    const windowInfo = Taro.getWindowInfo();
    const statusBarHeight = windowInfo.statusBarHeight ?? 0;
    const capsule = Taro.getMenuButtonBoundingClientRect?.();
    const capsuleTop = capsule?.top ?? statusBarHeight + 6;
    const capsuleHeight = capsule?.height ?? 32;
    const capsuleWidth = capsule?.width ?? 96;
    const navHeight =
      Math.max(capsuleTop - statusBarHeight, 6) * 2 + capsuleHeight;

    return {
      capsuleHeight,
      capsuleWidth,
      height: statusBarHeight + navHeight,
      paddingTop: statusBarHeight,
    };
  } catch {
    return {
      capsuleHeight: 36,
      capsuleWidth: 96,
      height: 66,
      paddingTop: 22,
    };
  }
}

export function MiniCustomTop({
  back = false,
  className = "",
  dark = false,
  onBack,
  title,
}: MiniCustomTopProps) {
  const metrics = getTopMetrics();
  const classes = [
    "mini-custom-top",
    dark ? "mini-custom-top--dark" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <View
      className={classes}
      style={{
        height: `${metrics.height}px`,
        paddingTop: `${metrics.paddingTop}px`,
      }}
    >
      <View
        className="mini-custom-top__side"
        style={{ flexBasis: `${metrics.capsuleWidth}px` }}
      >
        {back ? (
          <Text className="mini-custom-top__back" onClick={onBack} />
        ) : null}
      </View>
      {title ? <View className="mini-custom-top__title">{title}</View> : null}
      <View
        className="mini-custom-top__capsule-space"
        style={{
          flexBasis: `${metrics.capsuleWidth}px`,
          height: `${metrics.capsuleHeight}px`,
        }}
      />
    </View>
  );
}
