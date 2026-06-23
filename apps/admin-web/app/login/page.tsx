import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-[#f3f7f1] p-4 text-[#14231a] lg:grid-cols-[1.05fr_0.95fr] lg:p-6">
      <section
        aria-label="蔬菜图片墙"
        className="relative hidden overflow-hidden rounded-3xl bg-[#0f2418] p-5 shadow-sm lg:block"
      >
        <div className="grid h-full grid-cols-[1.15fr_0.85fr] gap-4">
          <img
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=85"
            alt="市场里的新鲜蔬菜"
            className="h-full min-h-0 w-full rounded-2xl object-cover"
          />
          <div className="grid min-h-0 grid-rows-[1fr_0.78fr] gap-4">
            <img
              src="https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=700&q=85"
              alt="菠菜"
              className="h-full min-h-0 w-full rounded-2xl object-cover"
            />
            <div className="grid min-h-0 grid-cols-2 gap-4">
              <img
                src="https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=700&q=85"
                alt="番茄"
                className="h-full min-h-0 w-full rounded-2xl object-cover"
              />
              <img
                src="https://images.unsplash.com/photo-1604977042946-1eecc30f269e?auto=format&fit=crop&w=700&q=85"
                alt="黄瓜"
                className="h-full min-h-0 w-full rounded-2xl object-cover"
              />
            </div>
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
