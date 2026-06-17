import { z } from "zod";

import { prisma } from "@hentor/db";
import { storeCodeSchema } from "@hentor/shared";

import { fail, ok } from "@/app/lib/api";
import {
  exchangeWechatLoginCode,
  exchangeWechatPhoneCode,
} from "@/app/lib/wechat";

const wxPhoneLoginSchema = z.object({
  loginCode: z.string().min(1),
  phoneCode: z.string().min(1),
  storeCode: storeCodeSchema.optional(),
});

export async function POST(request: Request) {
  const parsed = wxPhoneLoginSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return fail("INVALID_PARAMS", "登录参数不完整");
  }

  try {
    const [wechatSession, phoneInfo] = await Promise.all([
      exchangeWechatLoginCode(parsed.data.loginCode),
      exchangeWechatPhoneCode(parsed.data.phoneCode),
    ]);

    const store = await prisma.store.findFirst({
      where: parsed.data.storeCode
        ? { code: parsed.data.storeCode, status: "ACTIVE" }
        : { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });

    if (!store) {
      return fail("STORE_NOT_FOUND", "当前门店不可用", 404);
    }

    const user = await prisma.user.upsert({
      where: { openid: wechatSession.openid },
      update: {
        unionid: wechatSession.unionid,
        phone: phoneInfo.phone,
        defaultStoreId: store.id,
      },
      create: {
        openid: wechatSession.openid,
        unionid: wechatSession.unionid,
        phone: phoneInfo.phone,
        defaultStoreId: store.id,
      },
    });

    await prisma.memberStoreBinding.upsert({
      where: {
        userId_storeId: {
          userId: user.id,
          storeId: store.id,
        },
      },
      update: {
        status: "ACTIVE",
        isDefault: true,
      },
      create: {
        userId: user.id,
        storeId: store.id,
        status: "ACTIVE",
        isDefault: true,
        source: "wechat_login",
      },
    });

    return ok({
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        defaultStoreId: store.id,
      },
      store: {
        id: store.id,
        code: store.code,
        name: store.name,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "WECHAT_CONFIG_REQUIRED") {
      return fail(
        "WECHAT_CONFIG_REQUIRED",
        "请先在 .env 配置 WECHAT_APP_SECRET，才能启用真实微信登录",
        503,
      );
    }

    return fail("WECHAT_LOGIN_FAILED", "微信登录失败，请稍后重试", 502);
  }
}
