import { compare } from "bcryptjs";
import { z } from "zod";

import { prisma } from "@hentor/db";

import { fail, ok } from "@/app/lib/api";
import { setAdminSession } from "@/app/lib/session";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return fail("INVALID_PARAMS", "请输入账号和密码");
  }

  const admin = await prisma.adminUser.findUnique({
    where: { username: parsed.data.username },
    include: {
      roles: {
        include: { role: true },
      },
      stores: {
        include: { store: true },
      },
    },
  });

  if (!admin || admin.status !== "ACTIVE") {
    return fail("LOGIN_FAILED", "账号或密码不正确", 401);
  }

  const passwordMatched = await compare(parsed.data.password, admin.passwordHash);
  if (!passwordMatched) {
    return fail("LOGIN_FAILED", "账号或密码不正确", 401);
  }

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  await setAdminSession({
    adminUserId: admin.id,
    username: admin.username,
    name: admin.name,
    issuedAt: Date.now(),
  });

  return ok({
    id: admin.id,
    username: admin.username,
    name: admin.name,
    roles: admin.roles.map(({ role }) => role.name),
    stores: admin.stores.map(({ store }) => ({
      id: store.id,
      code: store.code,
      name: store.name,
    })),
  });
}
