"use client";

import { CHINA_PROVINCE_REGIONS } from "@hentor/shared";
import { RefreshCw, Save, Truck } from "lucide-react";
import { useState } from "react";

import { AdminDraggableModal } from "./admin-draggable-modal";
import { canCloseAdminModal } from "./admin-modal-close-guard";
import { hasAdminFormChanges } from "./admin-form-dirty";
import {
  buildSystemSettingsPayload,
  canSubmitSystemSettings,
  type SystemSettingsFormState,
} from "./system-settings-form";
import type { SystemSettingsPanelItem } from "./system-settings-panel";

type StoreOption = {
  id: string;
  name: string;
};

type DeliveryRangePanelProps = {
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
    adminSystemName: settings?.adminSystemName ?? "HanYang Fresh",
    aboutText: settings?.aboutText ?? "",
    customerServiceTel: settings?.customerServiceTel ?? "",
    deliveryCities: settings?.deliveryCities ?? [],
    deliveryProvinces: settings?.deliveryProvinces ?? [],
    homeDishColumns: settings?.homeDishColumns ?? 3,
    loginImageUrl: settings?.loginImageUrl ?? "",
    loginSubtitle: settings?.loginSubtitle ?? "",
    loginTitle: settings?.loginTitle ?? "",
    loginWelcome: settings?.loginWelcome ?? "",
    privacyPolicyContent: settings?.privacyPolicyContent ?? "",
    privacyPolicyUrl: settings?.privacyPolicyUrl ?? "",
    userAgreementContent: settings?.userAgreementContent ?? "",
    userAgreementUrl: settings?.userAgreementUrl ?? "",
  };
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

function rangeCountText(provinces: string[], cities: string[]) {
  if (provinces.length === 0 && cities.length === 0) {
    return "不限";
  }
  return `${provinces.length} 个省份 · ${cities.length} 个城市`;
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
    <div className="rounded-2xl border border-[#dbe6dc] bg-[#f8fbf7] p-4">
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

export function DeliveryRangePanel({
  initialSettings,
  store,
}: DeliveryRangePanelProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [form, setForm] = useState<SystemSettingsFormState>(() =>
    buildForm(initialSettings),
  );
  const [initialForm, setInitialForm] = useState<SystemSettingsFormState>(() =>
    buildForm(initialSettings),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function currentRange() {
    const current = buildForm(settings);
    return {
      cities: current.deliveryCities,
      provinces: current.deliveryProvinces,
    };
  }

  function openEditModal() {
    const nextForm = buildForm(settings);
    setForm(nextForm);
    setInitialForm(nextForm);
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
        throw new Error(result.error?.message ?? "配送范围加载失败");
      }

      const nextForm = buildForm(result.data.settings);
      setSettings(result.data.settings);
      setForm(nextForm);
      setInitialForm(nextForm);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "配送范围加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function saveDeliveryRange() {
    if (!store) {
      setMessage("当前数据范围不可用，暂不能保存配送范围");
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
        throw new Error(result.error?.message ?? "保存配送范围失败");
      }

      const nextForm = buildForm(result.data.settings);
      setSettings(result.data.settings);
      setForm(nextForm);
      setInitialForm(nextForm);
      setModalOpen(false);
      setMessage("配送范围已保存");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存配送范围失败");
    } finally {
      setSaving(false);
    }
  }

  const submitEnabled = canSubmitSystemSettings({
    saving,
    storeId: store?.id ?? null,
  });
  const range = currentRange();

  return (
    <section className="rounded-2xl border border-[#dbe6dc] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1f8f4f]">
            <Truck size={18} />
            系统管理
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-normal">
            配送范围
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#66756d]">
            维护小程序可选择和可提交的配送省市范围，空范围表示全国不限。
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
            <Truck size={16} />
            编辑范围
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {[
          ["当前门店", store?.name ?? "未分配"],
          ["范围级别", rangeCountText(range.provinces, range.cities)],
          ["小程序限制", "地址选择与提交校验同步生效"],
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
        <div className="text-xs font-medium text-[#66756d]">当前范围</div>
        <div className="mt-2 text-sm leading-6 text-[#405248]">
          {deliveryScopeText(range.provinces, range.cities)}
        </div>
      </div>

      {message ? (
        <div className="mt-4 rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] px-4 py-3 text-sm text-[#405248]">
          {message}
        </div>
      ) : null}

      {modalOpen ? (
        <AdminDraggableModal
          onClose={closeModal}
          subtitle="保存后会影响小程序地址选择、地址保存和预订提交校验"
          title="编辑配送范围"
          footer={
            <>
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
                onClick={saveDeliveryRange}
                type="button"
              >
                <Save size={16} />
                {saving ? "保存中" : "保存范围"}
              </button>
            </>
          }
        >
              <DeliveryRangePicker
                cities={form.deliveryCities}
                onChange={(next) =>
                  setForm((current) => ({
                    ...current,
                    deliveryCities: next.cities,
                    deliveryProvinces: next.provinces,
                  }))
                }
                provinces={form.deliveryProvinces}
              />
        </AdminDraggableModal>
      ) : null}
    </section>
  );
}
