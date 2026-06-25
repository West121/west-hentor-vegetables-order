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

import { CHINA_PROVINCE_REGIONS } from "@hentor/shared";
import { canCloseAdminModal } from "./admin-modal-close-guard";
import { hasAdminFormChanges } from "./admin-form-dirty";
import {
  buildSystemSettingsPayload,
  canSubmitSystemSettings,
  type SystemSettingsFormState,
} from "./system-settings-form";
import { RequiredLabel } from "./required-mark";

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
    customerServiceTel: settings?.customerServiceTel ?? "",
    deliveryCities: settings?.deliveryCities ?? [],
    deliveryProvinces: settings?.deliveryProvinces ?? [],
    homeDishColumns: settings?.homeDishColumns ?? 3,
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

function rangeStatus(values: string[]) {
  return values.length > 0 ? values.join("、") : "不限";
}

function removeValue(values: string[], value: string) {
  return values.filter((item) => item !== value);
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? removeValue(values, value) : [...values, value];
}

function deliveryScopeText(provinces: string[], cities: string[]) {
  const parts = [
    ...provinces.map((province) => `${province}全省`),
    ...cities,
  ];
  return parts.length > 0 ? parts.join("、") : "全国不限";
}

function DeliveryRangePicker({
  cities,
  disabled,
  onChange,
  provinces,
}: {
  cities: string[];
  disabled?: boolean;
  onChange: (next: { cities: string[]; provinces: string[] }) => void;
  provinces: string[];
}) {
  const [activeProvince, setActiveProvince] = useState(
    provinces[0] ?? CHINA_PROVINCE_REGIONS[0]?.province ?? "",
  );
  const activeRegion =
    CHINA_PROVINCE_REGIONS.find((region) => region.province === activeProvince) ??
    CHINA_PROVINCE_REGIONS[0] ??
    { cities: [], province: "" };

  function toggleProvince(province: string) {
    if (disabled) {
      return;
    }

    const provinceCities =
      CHINA_PROVINCE_REGIONS.find((region) => region.province === province)
        ?.cities ?? [];
    const selected = provinces.includes(province);
    onChange({
      cities: selected
        ? cities
        : cities.filter((city) => !provinceCities.includes(city)),
      provinces: toggleValue(provinces, province),
    });
  }

  function toggleCity(city: string) {
    if (disabled || provinces.includes(activeRegion.province)) {
      return;
    }

    onChange({
      cities: toggleValue(cities, city),
      provinces,
    });
  }

  return (
    <div className="rounded-2xl border border-[#dbe6dc] bg-[#f8fbf7] p-4 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[#102017]">配送范围</div>
          <div className="mt-1 text-xs leading-5 text-[#66756d]">
            选中省份表示该省全部城市可配送；不选省份时，可展开省份单独选择城市。
          </div>
        </div>
        <button
          className="h-8 rounded-lg border border-[#cfe3d3] bg-white px-3 text-xs font-semibold text-[#1f8f4f] disabled:opacity-50"
          disabled={disabled || (provinces.length === 0 && cities.length === 0)}
          onClick={() => onChange({ cities: [], provinces: [] })}
          type="button"
        >
          清空范围
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-[#dbe6dc] bg-white p-3 text-sm text-[#405248]">
        当前范围：{deliveryScopeText(provinces, cities)}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[220px_1fr]">
        <div className="max-h-72 overflow-auto rounded-xl border border-[#dbe6dc] bg-white p-2">
          {CHINA_PROVINCE_REGIONS.map((region) => {
            const selected = provinces.includes(region.province);
            const cityCount = region.cities.filter((city) =>
              cities.includes(city),
            ).length;
            return (
              <button
                className={[
                  "mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm",
                  activeProvince === region.province
                    ? "bg-[#e7f4eb] text-[#1f8f4f]"
                    : "text-[#405248] hover:bg-[#f3f7f1]",
                ].join(" ")}
                key={region.province}
                onClick={() => setActiveProvince(region.province)}
                type="button"
              >
                <span className="font-semibold">{region.province}</span>
                <span className="text-xs text-[#66756d]">
                  {selected ? "全省" : cityCount ? `${cityCount}市` : ""}
                </span>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-[#dbe6dc] bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold text-[#102017]">
              {activeRegion.province}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#cfe3d3] px-3 py-2 text-xs font-semibold text-[#1f8f4f]">
              <input
                checked={provinces.includes(activeRegion.province)}
                className="accent-[#1f8f4f]"
                disabled={disabled}
                onChange={() => toggleProvince(activeRegion.province)}
                type="checkbox"
              />
              全省配送
            </label>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {activeRegion.cities.map((city) => {
              const provinceSelected = provinces.includes(activeRegion.province);
              return (
                <label
                  className={[
                    "inline-flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                    provinceSelected
                      ? "border-[#e2ece4] bg-[#f6faf7] text-[#9aa89f]"
                      : cities.includes(city)
                        ? "border-[#b8d8bf] bg-[#eff8f1] text-[#1f8f4f]"
                        : "border-[#dbe6dc] text-[#405248]",
                  ].join(" ")}
                  key={city}
                >
                  <input
                    checked={provinceSelected || cities.includes(city)}
                    className="accent-[#1f8f4f]"
                    disabled={disabled || provinceSelected}
                    onChange={() => toggleCity(city)}
                    type="checkbox"
                  />
                  <span className="truncate">{city}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
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
          配置客服电话、小程序展示、协议链接和配送范围。
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
          ["客服电话", currentForm.customerServiceTel || "未配置"],
          ["配送省份", rangeStatus(currentForm.deliveryProvinces)],
          ["配送城市", rangeStatus(currentForm.deliveryCities)],
          ["首页菜品列数", `每行 ${currentForm.homeDishColumns} 个`],
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
                  设置保存后会影响小程序登录、协议、客服和展示规则
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
                <DeliveryRangePicker
                  cities={form.deliveryCities}
                  onChange={(next) => {
                    updateField("deliveryProvinces", next.provinces);
                    updateField("deliveryCities", next.cities);
                  }}
                  provinces={form.deliveryProvinces}
                />
                <div className="rounded-2xl border border-[#dbe6dc] bg-[#f8fbf7] p-4">
                  <div className="text-sm font-semibold text-[#102017]">
                    <RequiredLabel>首页菜品每行数量</RequiredLabel>
                  </div>
                  <div className="mt-1 text-xs leading-5 text-[#66756d]">
                    控制小程序首页菜品宫格展示密度，默认每行 3 个。
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[2, 3, 4].map((columns) => (
                      <button
                        className={[
                          "h-10 rounded-xl border text-sm font-semibold transition",
                          form.homeDishColumns === columns
                            ? "border-[#1f8f4f] bg-[#1f8f4f] text-white"
                            : "border-[#cfe3d3] bg-white text-[#405248] hover:border-[#1f8f4f]",
                        ].join(" ")}
                        key={columns}
                        onClick={() => updateField("homeDishColumns", columns)}
                        type="button"
                      >
                        {columns} 个
                      </button>
                    ))}
                  </div>
                </div>
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
