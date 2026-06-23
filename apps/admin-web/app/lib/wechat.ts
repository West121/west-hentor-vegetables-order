import "server-only";

type WechatSessionResponse = {
  openid?: string;
  unionid?: string;
  session_key?: string;
  errcode?: number;
  errmsg?: string;
};

type WechatSession = WechatSessionResponse & {
  openid: string;
};

type WechatAccessTokenResponse = {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
};

type WechatPhoneResponse = {
  errcode?: number;
  errmsg?: string;
  phone_info?: {
    phoneNumber?: string;
    purePhoneNumber?: string;
    countryCode?: string;
  };
};

function requireWechatConfig() {
  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("WECHAT_CONFIG_REQUIRED");
  }

  return { appId, appSecret };
}

function createWechatUrl(path: string) {
  const baseUrl = (
    process.env.WECHAT_API_BASE_URL ?? "https://api.weixin.qq.com"
  ).replace(/\/+$/, "");
  return new URL(`${baseUrl}${path}`);
}

async function readJson<T>(response: Response) {
  if (!response.ok) {
    throw new Error(`WECHAT_HTTP_${response.status}`);
  }

  return (await response.json()) as T;
}

export async function exchangeWechatLoginCode(code: string) {
  const { appId, appSecret } = requireWechatConfig();
  const url = createWechatUrl("/sns/jscode2session");
  url.searchParams.set("appid", appId);
  url.searchParams.set("secret", appSecret);
  url.searchParams.set("js_code", code);
  url.searchParams.set("grant_type", "authorization_code");

  const payload = await readJson<WechatSessionResponse>(await fetch(url));

  if (!payload.openid) {
    throw new Error(payload.errmsg ?? "WECHAT_LOGIN_FAILED");
  }

  return {
    ...payload,
    openid: payload.openid,
  } satisfies WechatSession;
}

export async function getWechatAccessToken() {
  const { appId, appSecret } = requireWechatConfig();
  const url = createWechatUrl("/cgi-bin/token");
  url.searchParams.set("grant_type", "client_credential");
  url.searchParams.set("appid", appId);
  url.searchParams.set("secret", appSecret);

  const payload = await readJson<WechatAccessTokenResponse>(await fetch(url));

  if (!payload.access_token) {
    throw new Error(payload.errmsg ?? "WECHAT_ACCESS_TOKEN_FAILED");
  }

  return payload.access_token;
}

export async function exchangeWechatPhoneCode(code: string) {
  const accessToken = await getWechatAccessToken();
  const url = createWechatUrl("/wxa/business/getuserphonenumber");
  url.searchParams.set("access_token", accessToken);

  const payload = await readJson<WechatPhoneResponse>(
    await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ code }),
    }),
  );

  const phone =
    payload.phone_info?.purePhoneNumber ?? payload.phone_info?.phoneNumber;
  if (!phone) {
    throw new Error(payload.errmsg ?? "WECHAT_PHONE_FAILED");
  }

  return {
    phone,
    countryCode: payload.phone_info?.countryCode,
  };
}
