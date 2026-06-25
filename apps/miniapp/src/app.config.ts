export default defineAppConfig({
  pages: [
    "pages/home/index",
    "pages/me/index",
    "pages/addresses/index",
    "pages/orders/index",
    "pages/order-edit/index",
    "pages/packages/index",
    "pages/login/index",
    "pages/webview/index",
  ],
  window: {
    backgroundTextStyle: "light",
    navigationBarBackgroundColor: "#F4F8F1",
    navigationBarTextStyle: "black",
    navigationStyle: "custom",
  },
  tabBar: {
    color: "#8A9A90",
    selectedColor: "#1F8F4F",
    backgroundColor: "#FFFFFF",
    borderStyle: "white",
    list: [
      {
        iconPath: "assets/tabbar/home-default.png",
        pagePath: "pages/home/index",
        selectedIconPath: "assets/tabbar/home-active.png",
        text: "首页",
      },
      {
        iconPath: "assets/tabbar/me-default.png",
        pagePath: "pages/me/index",
        selectedIconPath: "assets/tabbar/me-active.png",
        text: "我的",
      },
    ],
  },
});
