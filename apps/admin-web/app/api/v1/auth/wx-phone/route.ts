import { z } from "zod";

import {
  createMiniappOperationLog,
  findAvailableMiniappStore,
  prisma,
} from "@hentor/db";
import { storeCodeSchema } from "@hentor/shared";

import { fail, ok } from "@/app/lib/api";
import { createMiniToken } from "@/app/lib/mini-auth";
import { getRequestAuditMeta } from "@/app/lib/request-audit";
import {
  exchangeWechatLoginCode,
  exchangeWechatPhoneCode,
} from "@/app/lib/wechat";

const wxPhoneLoginSchema = z.object({
  loginCode: z.string().min(1),
  phoneCode: z.string().min(1),
  storeCode: storeCodeSchema.optional(),
});

function maskPhone(phone: string | null | undefined) {
  return phone ? phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2") : null;
}

async function upsertWechatPhoneUser(input: {
  defaultStoreId: string;
  openid: string;
  phone: string;
  unionid?: string | null;
}) {
  const existingWechatUser = await prisma.user.findUnique({
    where: { openid: input.openid },
  });

  if (existingWechatUser) {
    return prisma.user.update({
      data: {
        defaultStoreId: input.defaultStoreId,
        phone: input.phone,
        unionid: input.unionid,
      },
      where: { id: existingWechatUser.id },
    });
  }

  const importedUser = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    where: {
      openid: { startsWith: "imported-phone:" },
      phone: input.phone,
    },
  });

  if (importedUser) {
    return prisma.user.update({
      data: {
        defaultStoreId: input.defaultStoreId,
        openid: input.openid,
        phone: input.phone,
        unionid: input.unionid,
      },
      where: { id: importedUser.id },
    });
  }

  return prisma.user.create({
    data: {
      defaultStoreId: input.defaultStoreId,
      openid: input.openid,
      phone: input.phone,
      unionid: input.unionid,
    },
  });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
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

    const store = await findAvailableMiniappStore({
      storeCode: parsed.data.storeCode,
    });

    if (!store) {
      return fail("STORE_NOT_FOUND", "当前门店不可用", 404);
    }

    const user = await upsertWechatPhoneUser({
      defaultStoreId: store.id,
      openid: wechatSession.openid,
      phone: phoneInfo.phone,
      unionid: wechatSession.unionid,
    });

    await prisma.memberStoreBinding.upsert({
      where: {
        userId_storeId: {
          userId: user.id,
          storeId: store.id,
        },
      },
      update: {
        status: user.status === "DISABLED" ? "DISABLED" : "ACTIVE",
        isDefault: true,
      },
      create: {
        userId: user.id,
        storeId: store.id,
        status: user.status === "DISABLED" ? "DISABLED" : "ACTIVE",
        isDefault: true,
        source: "wechat_login",
      },
    });

    const responseData = {
      store: {
        code: store.code,
        id: store.id,
        name: store.name,
      },
      success: true,
      token: "[issued]",
      user: {
        defaultStoreId: store.id,
        id: user.id,
        nickname: user.nickname,
        phone: maskPhone(user.phone),
      },
    };

    await createMiniappOperationLog({
      action: "MINIAPP_PHONE_LOGIN",
      afterValue: {
        phone: maskPhone(user.phone),
        storeCode: store.code,
      },
      durationMs: Date.now() - startedAt,
      resource: "miniapp_session",
      resourceId: user.id,
      requestParams: {
        loginCode: parsed.data.loginCode ? "[provided]" : "[missing]",
        phoneCode: parsed.data.phoneCode ? "[provided]" : "[missing]",
        storeCode: parsed.data.storeCode ?? null,
      },
      responseData,
      storeId: store.id,
      statusCode: 200,
      userId: user.id,
      ...getRequestAuditMeta(request),
    });

    return ok({
      token: createMiniToken({
        issuedAt: Date.now(),
        openid: user.openid,
        storeId: store.id,
        userId: user.id,
      }),
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
