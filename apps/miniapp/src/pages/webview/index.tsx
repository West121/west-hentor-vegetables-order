import { View, WebView } from "@tarojs/components";
import { useRouter } from "@tarojs/taro";

import "./index.scss";

export default function WebviewPage() {
  const router = useRouter();
  const url = decodeURIComponent(String(router.params.url ?? ""));

  if (!url) {
    return <View className="webview-empty">链接不可用</View>;
  }

  return <WebView src={url} />;
}
