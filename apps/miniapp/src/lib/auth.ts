import Taro from "@tarojs/taro";

import { ACTIVE_STORE_CODE_KEY } from "./stores";

export const MINI_SESSION_TOKEN_KEY = "mini_session_token";
export const MINI_SESSION_LOGGED_OUT_KEY = "mini_session_logged_out";
export const MINI_PROFILE_COMPLETION_PROMPT_KEY =
  "mini_profile_completion_prompt";

type ApiResponse<T> = {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  success: boolean;
};

type MiniLoginData = {
  store: {
    code: string;
  };
  token: string;
  user?: {
    profileIncomplete?: boolean;
  };
};

export type MiniSessionOptions = {
  apiBaseUrl: string;
  storeCode: string;
};

export type MiniSessionRequestOptions<T> = MiniSessionOptions & {
  request: (token: string) => Promise<{
    data: ApiResponse<T>;
    statusCode: number;
  }>;
};

export function buildWxSessionLoginUrl(apiBaseUrl: string) {
  return `${apiBaseUrl}/api/v1/auth/wx-session`;
}

export function getStoredMiniSessionToken() {
  return (Taro.getStorageSync(MINI_SESSION_TOKEN_KEY) as string | undefined)?.trim() ?? "";
}

export function isMiniSessionLoggedOut() {
  return Taro.getStorageSync(MINI_SESSION_LOGGED_OUT_KEY) === "1";
}

export function clearMiniSessionLogout() {
  Taro.removeStorageSync(MINI_SESSION_LOGGED_OUT_KEY);
}

export function rememberMiniSessionLogout() {
  Taro.removeStorageSync(MINI_SESSION_TOKEN_KEY);
  Taro.setStorageSync(MINI_SESSION_LOGGED_OUT_KEY, "1");
}

export function redirectToMiniLogin() {
  Taro.removeStorageSync(MINI_SESSION_TOKEN_KEY);
  Taro.navigateTo({ url: "/pages/login/index" });
}

export async function refreshMiniSessionToken({
  apiBaseUrl,
  storeCode,
}: MiniSessionOptions) {
  const login = await Taro.login();
  if (!login.code) {
    throw new Error("微信登录凭证获取失败");
  }

  const response = await Taro.request<ApiResponse<MiniLoginData>>({
    data: {
      loginCode: login.code,
      storeCode,
    },
    method: "POST",
    url: buildWxSessionLoginUrl(apiBaseUrl),
  });
  const token = response.data.data?.token;
  if (response.statusCode >= 200 && response.statusCode < 300 && token) {
    clearMiniSessionLogout();
    Taro.setStorageSync(MINI_SESSION_TOKEN_KEY, token);
    if (response.data.data?.store.code) {
      Taro.setStorageSync(ACTIVE_STORE_CODE_KEY, response.data.data.store.code);
    }
    return token;
  }

  throw new Error(response.data.error?.message ?? "登录已过期");
}

export async function getMiniSessionToken(options: MiniSessionOptions) {
  const storedToken = getStoredMiniSessionToken();
  if (storedToken) {
    return storedToken;
  }
  if (isMiniSessionLoggedOut()) {
    throw new Error("请先登录");
  }
  return refreshMiniSessionToken(options);
}

export function isUnauthorizedMiniResponse(response?: ApiResponse<unknown>) {
  return !response?.success && response?.error?.code === "UNAUTHORIZED";
}

export async function requestWithMiniSession<T>({
  apiBaseUrl,
  request,
  storeCode,
}: MiniSessionRequestOptions<T>) {
  let token = "";
  try {
    token = await getMiniSessionToken({ apiBaseUrl, storeCode });
  } catch (error) {
    redirectToMiniLogin();
    throw error;
  }

  let response = await request(token);
  if (isUnauthorizedMiniResponse(response.data)) {
    let refreshedToken = "";
    try {
      refreshedToken = await refreshMiniSessionToken({ apiBaseUrl, storeCode });
    } catch (error) {
      redirectToMiniLogin();
      throw error;
    }
    response = await request(refreshedToken);
  }
  if (isUnauthorizedMiniResponse(response.data)) {
    redirectToMiniLogin();
  }
  return response;
}

export async function refreshMiniSessionOrRedirect(options: MiniSessionOptions) {
  try {
    return await refreshMiniSessionToken(options);
  } catch {
    redirectToMiniLogin();
    return "";
  }
}
