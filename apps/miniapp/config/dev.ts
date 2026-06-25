export default {
  env: {
    TARO_APP_API_BASE_URL: "\"https://mmprd.hentor.com:8103\"",
    TARO_APP_HOME_DISH_COLUMNS: JSON.stringify(
      process.env.TARO_APP_HOME_DISH_COLUMNS ?? "3",
    ),
    TARO_APP_STORE_CODE: "\"lotus-garden\"",
  },
  defineConstants: {},
  mini: {},
};
