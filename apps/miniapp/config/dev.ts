const apiBaseUrl =
  process.env.TARO_APP_TEST_API_BASE_URL ??
  process.env.TARO_APP_API_BASE_URL ??
  "https://mmprd.hentor.com:8203";
const prodApiBaseUrl =
  process.env.TARO_APP_PROD_API_BASE_URL ??
  "https://mmprd.hentor.com:8103";

export default {
  env: {
    TARO_APP_API_BASE_URL: JSON.stringify(apiBaseUrl),
    TARO_APP_TEST_API_BASE_URL: JSON.stringify(apiBaseUrl),
    TARO_APP_PROD_API_BASE_URL: JSON.stringify(prodApiBaseUrl),
    TARO_APP_HOME_DISH_COLUMNS: JSON.stringify(
      process.env.TARO_APP_HOME_DISH_COLUMNS ?? "3",
    ),
    TARO_APP_STORE_CODE: "\"lotus-garden\"",
  },
  defineConstants: {},
  mini: {},
};
