"use client";

import {
  Maximize2,
  Minimize2,
  Pencil,
  RefreshCw,
  Save,
  Settings,
  X,
} from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";

import { AdminTimePicker } from "./admin-date-time-picker";
import { canCloseAdminModal } from "./admin-modal-close-guard";
import { hasAdminFormChanges } from "./admin-form-dirty";
import {
  buildSystemSettingsPayload,
  canSubmitSystemSettings,
  type SystemSettingsFormState,
} from "./system-settings-form";

type StoreOption = {
  id: string;
  name: string;
};

export type SystemSettingsPanelItem = Omit<
  SystemSettingsFormState,
  "deliveryCities" | "deliveryProvinces"
> & {
  deliveryCities: string[];
  deliveryProvinces: string[];
  store: StoreOption;
};

type SystemSettingsPanelProps = {
  initialSettings: SystemSettingsPanelItem | null;
  store: StoreOption | null;
};

type ApiResponse<T> = {
  data?: T;
  error?: {
    message: string;
  };
  success: boolean;
};

function buildForm(settings: SystemSettingsPanelItem | null): SystemSettingsFormState {
  return {
    aboutText: settings?.aboutText ?? "",
    cutoffTime: settings?.cutoffTime ?? "18:00",
    customerServiceTel: settings?.customerServiceTel ?? "",
    deliveryCities: settings?.deliveryCities.join("、") ?? "",
    deliveryProvinces: settings?.deliveryProvinces.join("、") ?? "",
    loginImageUrl: settings?.loginImageUrl ?? "",
    loginSubtitle: settings?.loginSubtitle ?? "",
    loginTitle: settings?.loginTitle ?? "",
    loginWelcome: settings?.loginWelcome ?? "",
    privacyPolicyUrl: settings?.privacyPolicyUrl ?? "",
    userAgreementUrl: settings?.userAgreementUrl ?? "",
  };
}

function linkStatus(value: string) {
  return value.trim() ? "已配置" : "未配置";
}

function rangeStatus(value: string) {
  return value.trim() ? value : "不限";
}

export function SystemSettingsPanel({
  initialSettings,
  store,
}: SystemSettingsPanelProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [form, setForm] = useState<SystemSettingsFormState>(() =>
    buildForm(initialSettings),
  );
  const [initialForm, setInitialForm] = useState<SystemSettingsFormState>(() =>
    buildForm(initialSettings),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
  } | null>(null);

  function resetModalPosition() {
    setFullscreen(false);
    setOffset({ x: 0, y: 0 });
  }

  function openEditModal() {
    const nextForm = buildForm(settings);
    setForm(nextForm);
    setInitialForm(nextForm);
    resetModalPosition();
    setMessage(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    if (
      !canCloseAdminModal({
        hasUnsavedChanges: hasAdminFormChanges({
          current: form,
          initial: initialForm,
        }),
      })
    ) {
      return;
    }

    setModalOpen(false);
  }

  function handleHeaderPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (fullscreen) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: offset.x,
      y: offset.y,
    };
  }

  function handleHeaderPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    setOffset({
      x: drag.x + event.clientX - drag.startX,
      y: drag.y + event.clientY - drag.startY,
    });
  }

  function handleHeaderPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function updateField<Key extends keyof SystemSettingsFormState>(
    key: Key,
    value: SystemSettingsFormState[Key],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function reloadSettings() {
    if (!store) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/system-settings?storeId=${encodeURIComponent(store.id)}`,
      );
      const result = (await response.json()) as ApiResponse<{
        settings: SystemSettingsPanelItem;
      }>;

      if (!response.ok || !result.success || !result.data?.settings) {
        throw new Error(result.error?.message ?? "系统设置加载失败");
      }

      const nextForm = buildForm(result.data.settings);
      setSettings(result.data.settings);
      setForm(nextForm);
      setInitialForm(nextForm);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "系统设置加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    if (!store) {
      setMessage("当前数据范围不可用，暂不能保存系统设置");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/system-settings", {
        body: JSON.stringify(buildSystemSettingsPayload(store.id, form)),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const result = (await response.json()) as ApiResponse<{
        settings: SystemSettingsPanelItem;
      }>;

      if (!response.ok || !result.success || !result.data?.settings) {
        throw new Error(result.error?.message ?? "保存系统设置失败");
      }

      const nextForm = buildForm(result.data.settings);
      setSettings(result.data.settings);
      setForm(nextForm);
      setInitialForm(nextForm);
      setModalOpen(false);
      setMessage("系统设置已保存");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存系统设置失败");
    } finally {
      setSaving(false);
    }
  }

  const submitEnabled = canSubmitSystemSettings({
    saving,
    storeId: store?.id ?? null,
  });

  const currentForm = buildForm(settings);

  return (
    <section className="rounded-2xl border border-[#dbe6dc] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1f8f4f]">
            <Settings size={18} />
            系统设置
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-normal">
            基础配置
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#66756d]">
          配置截单时间、客服电话、小程序协议链接和配送范围。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="flex h-10 items-center gap-2 rounded-xl border border-[#dbe6dc] bg-white px-4 text-sm font-semibold text-[#405248] disabled:opacity-50"
            disabled={!store || loading || saving}
            onClick={reloadSettings}
            type="button"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            刷新
          </button>
          <button
            className="flex h-10 items-center gap-2 rounded-xl bg-[#1f8f4f] px-4 text-sm font-semibold text-white disabled:opacity-50"
            disabled={!store || loading || saving}
            onClick={openEditModal}
            type="button"
          >
            <Pencil size={16} />
            编辑设置
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["每日截单", currentForm.cutoffTime],
          ["客服电话", currentForm.customerServiceTel || "未配置"],
          ["配送省份", rangeStatus(currentForm.deliveryProvinces)],
          ["配送城市", rangeStatus(currentForm.deliveryCities)],
          ["登录页", currentForm.loginTitle || "默认标题"],
          ["协议链接", `用户协议${linkStatus(currentForm.userAgreementUrl)} / 隐私${linkStatus(currentForm.privacyPolicyUrl)}`],
        ].map(([label, value]) => (
          <div
            className="rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] p-4"
            key={label}
          >
            <div className="text-xs font-medium text-[#66756d]">{label}</div>
            <div className="mt-2 truncate text-base font-semibold text-[#102017]">
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] p-4">
        <div className="text-xs font-medium text-[#66756d]">关于我们</div>
        <div className="mt-2 line-clamp-3 text-sm leading-6 text-[#405248]">
          {currentForm.aboutText || "未配置介绍、配送范围和客服说明"}
        </div>
      </div>

      {message ? (
        <div className="mt-4 rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] px-4 py-3 text-sm text-[#405248]">
          {message}
        </div>
      ) : null}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 bg-[#0f2418]/35 p-5">
          <div
            aria-modal="true"
            className={[
              "mx-auto flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-2xl",
              fullscreen
                ? "h-full w-full"
                : "h-[64vh] w-[760px] max-w-full resize",
            ].join(" ")}
            role="dialog"
            style={
              fullscreen
                ? undefined
                : { transform: `translate(${offset.x}px, ${offset.y}px)` }
            }
          >
            <div
              className="flex cursor-move items-center justify-between border-b border-[#dbe6dc] px-6 py-4"
              onPointerDown={handleHeaderPointerDown}
              onPointerMove={handleHeaderPointerMove}
              onPointerCancel={handleHeaderPointerUp}
              onPointerUp={handleHeaderPointerUp}
            >
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold">
                  编辑系统设置
                </div>
                <div className="mt-1 truncate text-sm text-[#66756d]">
                  设置保存后会影响小程序登录、协议、客服和截单规则
                </div>
              </div>
              <div
                className="flex items-center gap-2"
                onPointerDown={(event) => event.stopPropagation()}
              >
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
                  onClick={closeModal}
                  title="关闭"
                  type="button"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="grid gap-4 lg:grid-cols-2">
                <AdminTimePicker
                  buttonClassName="h-11 w-full"
                  label="每日截单时间"
                  onChange={(value) => updateField("cutoffTime", value)}
                  value={form.cutoffTime}
                />
                <label className="flex flex-col gap-2 text-sm font-medium">
                  客服电话
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 text-sm outline-none focus:border-[#1f8f4f]"
                    onChange={(event) =>
                      updateField("customerServiceTel", event.target.value)
                    }
                    placeholder="例如 400-800-1000"
                    value={form.customerServiceTel}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  配送省份
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 text-sm outline-none focus:border-[#1f8f4f]"
                    onChange={(event) =>
                      updateField("deliveryProvinces", event.target.value)
                    }
                    placeholder="例如 江苏省、安徽省；为空表示不限省份"
                    value={form.deliveryProvinces}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  配送城市
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 text-sm outline-none focus:border-[#1f8f4f]"
                    onChange={(event) =>
                      updateField("deliveryCities", event.target.value)
                    }
                    placeholder="例如 南京市、合肥市；为空表示不限城市"
                    value={form.deliveryCities}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  登录页主标题
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 text-sm outline-none focus:border-[#1f8f4f]"
                    onChange={(event) =>
                      updateField("loginTitle", event.target.value)
                    }
                    placeholder="例如 Hentor Fresh"
                    value={form.loginTitle}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  登录页副标题
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 text-sm outline-none focus:border-[#1f8f4f]"
                    onChange={(event) =>
                      updateField("loginSubtitle", event.target.value)
                    }
                    placeholder="例如 社区鲜蔬会员"
                    value={form.loginSubtitle}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  登录页欢迎语
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 text-sm outline-none focus:border-[#1f8f4f]"
                    onChange={(event) =>
                      updateField("loginWelcome", event.target.value)
                    }
                    placeholder="例如 欢迎来到蔬菜预订"
                    value={form.loginWelcome}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  登录页图片链接
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 text-sm outline-none focus:border-[#1f8f4f]"
                    onChange={(event) =>
                      updateField("loginImageUrl", event.target.value)
                    }
                    placeholder="https://... 或 /uploads/..."
                    value={form.loginImageUrl}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  用户协议链接
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 text-sm outline-none focus:border-[#1f8f4f]"
                    onChange={(event) =>
                      updateField("userAgreementUrl", event.target.value)
                    }
                    placeholder="https://..."
                    value={form.userAgreementUrl}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  隐私政策链接
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 text-sm outline-none focus:border-[#1f8f4f]"
                    onChange={(event) =>
                      updateField("privacyPolicyUrl", event.target.value)
                    }
                    placeholder="https://..."
                    value={form.privacyPolicyUrl}
                  />
                </label>
                <div className="rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] p-4 text-sm leading-6 text-[#66756d] lg:col-span-2">
                  <div className="mb-1 font-semibold text-[#102017]">
                    配送范围限制
                  </div>
                  配送范围按当前业务规则生效。省份为空时不限制省份；城市为空时不限制城市。
                  例如只允许南京地址，可填写省份“江苏省”、城市“南京市”。
                </div>
                <label className="flex flex-col gap-2 text-sm font-medium lg:col-span-2">
                  关于我们
                  <textarea
                    className="min-h-28 resize-y rounded-xl border border-[#dbe6dc] p-3 text-sm outline-none focus:border-[#1f8f4f]"
                    onChange={(event) => updateField("aboutText", event.target.value)}
                    placeholder="服务介绍、配送范围、客服说明"
                    value={form.aboutText}
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-[#dbe6dc] px-6 py-4">
              <button
                className="rounded-xl border border-[#dbe6dc] px-5 py-2 text-sm font-semibold text-[#405248]"
                onClick={closeModal}
                type="button"
              >
                取消
              </button>
              <button
                className="flex items-center gap-2 rounded-xl bg-[#1f8f4f] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={!submitEnabled}
                onClick={saveSettings}
                type="button"
              >
                <Save size={16} />
                {saving ? "保存中" : "保存设置"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
