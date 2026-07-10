import Taro from "@tarojs/taro";

import {
  resolveApiBaseUrl,
  type MiniProgramEnvironment,
} from "./api-base-url-model";

const TEST_API_BASE_URL =
  process.env.TARO_APP_TEST_API_BASE_URL ||
  process.env.TARO_APP_API_BASE_URL ||
  "https://mmprd.hentor.com:8203";
const PROD_API_BASE_URL =
  process.env.TARO_APP_PROD_API_BASE_URL ||
  "https://mmprd.hentor.com:8103";

export function getMiniProgramEnvironment(): MiniProgramEnvironment | undefined {
  try {
    return Taro.getAccountInfoSync().miniProgram?.envVersion;
  } catch {
    // H5/开发工具的部分运行环境可能没有账号信息 API，默认按测试环境处理。
    return undefined;
  }
}

export const API_BASE_URL = resolveApiBaseUrl(
  getMiniProgramEnvironment(),
  TEST_API_BASE_URL,
  PROD_API_BASE_URL,
);
