import { PropsWithChildren } from "react";
import Taro from "@tarojs/taro";

import { ACTIVE_STORE_CODE_KEY, resolveLaunchStoreCode } from "./lib/stores";
import "./app.scss";

function App({ children }: PropsWithChildren) {
  Taro.useLaunch((options) => {
    const storeCode = resolveLaunchStoreCode(options.query);
    if (storeCode) {
      Taro.setStorageSync(ACTIVE_STORE_CODE_KEY, storeCode);
    }
  });

  return children;
}

export default App;
