export type WechatLoginState =
  | { mode: "password" }
  | { mode: "bind"; bindToken: string }
  | { mode: "error"; error: string };

export function resolveWechatLoginState(params: URLSearchParams): WechatLoginState {
  const bindToken = params.get("wechatBindToken")?.trim();
  if (bindToken) {
    return { mode: "bind", bindToken };
  }

  const error = params.get("wechatError")?.trim();
  if (error) {
    return { error, mode: "error" };
  }

  return { mode: "password" };
}
