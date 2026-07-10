"use client";

import { Maximize2, Minimize2, MoreHorizontal, X } from "lucide-react";
import { useState } from "react";

export function OrderModalPreview() {
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(true);

  return (
    <>
      <button
        className="h-10 rounded-xl bg-[#1f8f4f] px-4 text-sm font-semibold text-white hover:bg-[#16753f]"
        onClick={() => setOpen(true)}
        type="button"
      >
        新建订单
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-[#0f2418]/35 p-5">
          <div
            className={[
              "mx-auto flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-2xl resize",
              fullscreen ? "h-full w-full" : "h-[68vh] w-[760px] max-w-full",
            ].join(" ")}
          >
            <div className="flex cursor-move items-center justify-between border-b border-[#dbe6dc] px-6 py-4">
              <div>
                <div className="text-lg font-semibold">订单详情 · OD202606170042</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="grid h-9 w-9 place-items-center rounded-xl border border-transparent text-[#66756d] hover:bg-[#f3f7f1]"
                  title="更多"
                  type="button"
                >
                  <MoreHorizontal size={18} />
                </button>
                <button
                  className="grid h-9 w-9 place-items-center rounded-xl border border-[#cfe3d3] bg-[#eff8f1] text-[#1f8f4f]"
                  onClick={() => setFullscreen((value) => !value)}
                  title={fullscreen ? "退出全屏" : "全屏"}
                  type="button"
                >
                  {fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                </button>
                <button
                  className="grid h-9 w-9 place-items-center rounded-xl border border-red-100 bg-red-50 text-red-600"
                  onClick={() => setOpen(false)}
                  title="关闭"
                  type="button"
                >
                  <X size={17} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="space-y-6">
                <section>
                  <h3 className="font-semibold">基础信息</h3>
                  <div className="mt-4 rounded-xl border border-[#dbe6dc] p-4 text-sm leading-8">
                    会员：张建国 13812345678
                    <br />
                    地址：莲花小区 3 栋 602
                  </div>
                </section>
                <section>
                  <h3 className="font-semibold">菜品明细</h3>
                  <div className="mt-4 rounded-xl border border-[#dbe6dc] p-4 text-sm leading-8">
                    菠菜 1.0斤 / 黄瓜 1.5斤
                    <br />
                    备注：不要香菜，配送前电话确认。
                  </div>
                </section>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-[#dbe6dc] px-6 py-4">
              <button
                className="h-10 rounded-xl border border-[#dbe6dc] px-5"
                type="button"
              >
                取消
              </button>
              <button
                className="h-10 rounded-xl bg-[#1f8f4f] px-5 font-semibold text-white"
                type="button"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
