import { redirect } from "next/navigation";

import { getAdminSession } from "@/app/lib/session";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getAdminSession();

  if (session) {
    redirect("/");
  }

  return (
    <main className="grid min-h-screen bg-[#f3f7f1] p-4 text-[#14231a] lg:grid-cols-[1.05fr_0.95fr] lg:p-6">
      <section className="relative hidden overflow-hidden rounded-3xl bg-[#0f2418] p-8 shadow-sm lg:block">
        <img
          src="https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=85"
          alt="新鲜蔬菜"
          className="absolute inset-0 h-full w-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f2418]/90 via-[#0f2418]/45 to-[#1f8f4f]/20" />
        <div className="relative flex h-full flex-col justify-between">
          <div>
            <div className="text-2xl font-semibold text-white">Hentor Fresh</div>
            <div className="mt-2 text-sm text-white/75">蔬菜预订运营台</div>
          </div>
          <div className="max-w-xl">
            <div className="mb-4 inline-flex rounded-full bg-white/14 px-4 py-2 text-sm text-white backdrop-blur">
              总部 + 加盟门店统一运营
            </div>
            <h1 className="text-5xl font-semibold leading-tight tracking-normal text-white">
              从套餐、预订到配送任务，一套后台闭环处理。
            </h1>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-2 py-10 lg:px-12">
        <div className="w-full max-w-[430px] rounded-2xl border border-[#dbe6dc] bg-white p-8 shadow-sm">
          <div className="mb-8">
            <div className="text-sm font-medium text-[#1f8f4f]">管理系统登录</div>
            <h2 className="mt-2 text-3xl font-semibold">欢迎回来</h2>
            <p className="mt-2 text-sm leading-6 text-[#66756d]">
              使用后台账号登录，按角色和授权门店进入运营工作台。
            </p>
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
