export default defineAppConfig({
  pages: [
    "pages/home/index",
    "pages/me/index",
    "pages/addresses/index",
    "pages/orders/index",
    "pages/packages/index",
    "pages/login/index",
  ],
  window: {
    backgroundTextStyle: "light",
    navigationBarBackgroundColor: "#F4F8F1",
    navigationBarTitleText: "Hentor Fresh",
    navigationBarTextStyle: "black",
  },
  tabBar: {
    color: "#8A9A90",
    selectedColor: "#1F8F4F",
    backgroundColor: "#FFFFFF",
    borderStyle: "white",
    list: [
      {
        pagePath: "pages/home/index",
        text: "首页",
      },
      {
        pagePath: "pages/me/index",
        text: "我的",
      },
    ],
  },
});
