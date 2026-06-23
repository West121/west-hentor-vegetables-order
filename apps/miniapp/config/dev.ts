const HOME_DISH_COLUMNS = process.env.TARO_APP_HOME_DISH_COLUMNS ?? "3";

export default {
  env: {
    TARO_APP_API_BASE_URL: "\"https://mmprd.hentor.com:8103\"",
    TARO_APP_HOME_DISH_COLUMNS: JSON.stringify(HOME_DISH_COLUMNS),
    TARO_APP_STORE_CODE: "\"lotus-garden\"",
  },
  defineConstants: {},
  mini: {},
};
