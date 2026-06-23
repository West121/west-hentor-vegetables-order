import { Input, Picker, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useEffect, useRef, useState } from "react";

import {
  buildAddressListUrl,
  buildAddressRegionPickerValue,
  buildAddressResourceUrl,
  buildAddressSubmitPayload,
  buildSetDefaultAddressUrl,
  formatAddressFullAddress,
  formatAddressRegion,
  formatAddressReceiverLine,
  getAddressDetailError,
  getDefaultAddressSwitchState,
  getAddressRegionError,
  isValidReceiverPhone,
  parseAddressRegionPickerValue,
} from "../../lib/addresses";
import { MiniCustomTop } from "../../components/mini-custom-top";
import { ACTIVE_STORE_CODE_KEY, getActiveStoreCode } from "../../lib/stores";
import "./index.scss";

const API_BASE_URL =
  process.env.TARO_APP_API_BASE_URL || "https://mmprd.hentor.com:8103";
const DEFAULT_STORE_CODE = process.env.TARO_APP_STORE_CODE ?? "lotus-garden";

type ApiResponse<T> = {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  success: boolean;
};

type AddressItem = {
  city: string | null;
  detail: string;
  district: string | null;
  fullAddress: string;
  id: string;
  isDefault: boolean;
  province: string | null;
  receiverName: string;
  receiverPhone: string;
};

type AddressData = {
  defaultAddress: AddressItem | null;
  items: AddressItem[];
};

type FormState = {
  city: string;
  detail: string;
  district: string;
  isDefault: boolean;
  province: string;
  receiverName: string;
  receiverPhone: string;
};

function buildForm(item?: AddressItem | null): FormState {
  return {
    city: item?.city ?? "",
    detail: item?.detail ?? "",
    district: item?.district ?? "",
    isDefault: item?.isDefault ?? true,
    province: item?.province ?? "",
    receiverName: item?.receiverName ?? "",
    receiverPhone: item?.receiverPhone ?? "",
  };
}

export default function AddressesPage() {
  const [items, setItems] = useState<AddressItem[]>([]);
  const [editing, setEditing] = useState<AddressItem | null>(null);
  const [form, setForm] = useState<FormState>(buildForm());
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const actionPendingRef = useRef(false);

  function goBack() {
    if (Taro.getCurrentPages().length > 1) {
      Taro.navigateBack();
      return;
    }

    Taro.switchTab({ url: "/pages/me/index" });
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateFormRegion(value?: string[]) {
    setForm((current) => ({
      ...current,
      ...parseAddressRegionPickerValue(value),
    }));
  }

  async function loadAddresses(options?: { quiet?: boolean }) {
    if (!options?.quiet) {
      setLoading(true);
    }

    try {
      const token = Taro.getStorageSync("mini_session_token");
      if (!token) {
        Taro.navigateTo({ url: "/pages/login/index" });
        return;
      }
      const storeCode = getActiveStoreCode(
        Taro.getStorageSync(ACTIVE_STORE_CODE_KEY) as string | undefined,
        DEFAULT_STORE_CODE,
      );

      const response = await Taro.request<ApiResponse<AddressData>>({
        header: { authorization: `Bearer ${token}` },
        method: "GET",
        url: buildAddressListUrl({
          apiBaseUrl: API_BASE_URL,
          storeCode,
        }),
      });
      const payload = response.data;

      if (!payload.success || !payload.data) {
        if (payload.error?.code === "UNAUTHORIZED") {
          Taro.navigateTo({ url: "/pages/login/index" });
          return;
        }

        throw new Error(payload.error?.message ?? "地址加载失败");
      }

      setItems(payload.data.items);
      if (payload.data.items.length === 0) {
        setEditing(null);
        setForm(buildForm());
        setFormOpen(true);
      }
    } catch (error) {
      Taro.showToast({
        icon: "none",
        title: error instanceof Error ? error.message : "地址加载失败",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAddresses();
  }, []);

  function openCreate() {
    if (items.length >= 10) {
      Taro.showToast({ icon: "none", title: "最多只能保存 10 条地址" });
      return;
    }

    setEditing(null);
    setForm({ ...buildForm(), isDefault: items.length === 0 });
    setFormOpen(true);
  }

  function openEdit(item: AddressItem) {
    setEditing(item);
    setForm(buildForm(item));
    setFormOpen(true);
  }

  function closeForm() {
    if (items.length === 0 || actionPendingRef.current) {
      return;
    }

    setFormOpen(false);
    setEditing(null);
  }

  async function submitAddress() {
    if (actionPendingRef.current) {
      return;
    }

    if (!form.receiverName.trim()) {
      Taro.showToast({ icon: "none", title: "请输入收货人" });
      return;
    }
    if (!form.receiverPhone.trim()) {
      Taro.showToast({ icon: "none", title: "请输入联系电话" });
      return;
    }
    if (!isValidReceiverPhone(form.receiverPhone)) {
      Taro.showToast({ icon: "none", title: "请输入正确的手机号" });
      return;
    }
    const regionError = getAddressRegionError(form);
    if (regionError) {
      Taro.showToast({ icon: "none", title: regionError });
      return;
    }
    const detailError = getAddressDetailError(form.detail);
    if (detailError) {
      Taro.showToast({ icon: "none", title: detailError });
      return;
    }

    const defaultSwitch = getDefaultAddressSwitchState({
      addressCount: items.length,
      editingIsDefault: editing?.isDefault,
    });
    const shouldSubmitDefault = defaultSwitch.disabled
      ? defaultSwitch.checked
      : form.isDefault;

    actionPendingRef.current = true;

    try {
      const token = Taro.getStorageSync("mini_session_token");
      const storeCode = getActiveStoreCode(
        Taro.getStorageSync(ACTIVE_STORE_CODE_KEY) as string | undefined,
        DEFAULT_STORE_CODE,
      );
      const response = await Taro.request<ApiResponse<unknown>>({
        data: buildAddressSubmitPayload({
          city: form.city,
          detail: form.detail,
          district: form.district,
          isDefault: shouldSubmitDefault,
          province: form.province,
          receiverName: form.receiverName,
          receiverPhone: form.receiverPhone,
          storeCode,
        }),
        header: { authorization: `Bearer ${token}` },
        method: editing ? "PUT" : "POST",
        url: editing
          ? buildAddressResourceUrl({
              addressId: editing.id,
              apiBaseUrl: API_BASE_URL,
            })
          : `${API_BASE_URL}/api/v1/addresses`,
      });
      const payload = response.data;

      if (!payload.success) {
        throw new Error(payload.error?.message ?? "地址保存失败");
      }

      setFormOpen(false);
      setEditing(null);
      Taro.showToast({ icon: "success", title: "已保存" });
      void loadAddresses({ quiet: true });
    } catch (error) {
      Taro.showToast({
        icon: "none",
        title: error instanceof Error ? error.message : "地址保存失败",
      });
    } finally {
      actionPendingRef.current = false;
    }
  }

  const defaultSwitch = getDefaultAddressSwitchState({
    addressCount: items.length,
    editingIsDefault: editing?.isDefault,
  });

  async function setDefaultAddress(item: AddressItem) {
    if (actionPendingRef.current) {
      return;
    }

    actionPendingRef.current = true;
    setEditing(item);
    setForm({ ...buildForm(item), isDefault: true });

    try {
      const token = Taro.getStorageSync("mini_session_token");
      const storeCode = getActiveStoreCode(
        Taro.getStorageSync(ACTIVE_STORE_CODE_KEY) as string | undefined,
        DEFAULT_STORE_CODE,
      );
      const response = await Taro.request<ApiResponse<unknown>>({
        header: { authorization: `Bearer ${token}` },
        method: "POST",
        url: buildSetDefaultAddressUrl({
          addressId: item.id,
          apiBaseUrl: API_BASE_URL,
          storeCode,
        }),
      });
      const payload = response.data;

      if (!payload.success) {
        throw new Error(payload.error?.message ?? "设置失败");
      }

      await loadAddresses({ quiet: true });
      Taro.showToast({ icon: "success", title: "已设为默认" });
    } catch (error) {
      Taro.showToast({
        icon: "none",
        title: error instanceof Error ? error.message : "设置失败",
      });
    } finally {
      actionPendingRef.current = false;
      setEditing(null);
    }
  }

  async function deleteAddress(item: AddressItem) {
    const modal = await Taro.showModal({
      cancelText: "保留",
      confirmText: "删除",
      content: item.isDefault
        ? "删除默认地址后，会自动选择其他地址作为默认。"
        : "删除后不可恢复。",
      title: "删除地址",
    });

    if (!modal.confirm) {
      return;
    }

    if (actionPendingRef.current) {
      return;
    }

    actionPendingRef.current = true;

    try {
      const token = Taro.getStorageSync("mini_session_token");
      const storeCode = getActiveStoreCode(
        Taro.getStorageSync(ACTIVE_STORE_CODE_KEY) as string | undefined,
        DEFAULT_STORE_CODE,
      );
      const response = await Taro.request<ApiResponse<unknown>>({
        header: { authorization: `Bearer ${token}` },
        method: "DELETE",
        url: buildAddressResourceUrl({
          addressId: item.id,
          apiBaseUrl: API_BASE_URL,
          storeCode,
        }),
      });
      const payload = response.data;

      if (!payload.success) {
        throw new Error(payload.error?.message ?? "删除失败");
      }

      await loadAddresses({ quiet: true });
      Taro.showToast({ icon: "success", title: "已删除" });
    } catch (error) {
      Taro.showToast({
        icon: "none",
        title: error instanceof Error ? error.message : "删除失败",
      });
    } finally {
      actionPendingRef.current = false;
    }
  }

  return (
    <View className="addresses">
      <MiniCustomTop
        back
        className="addresses__custom-top"
        onBack={goBack}
        title="地址管理"
      />
      <View className="header">
        <View className="header__meta">用于蔬菜配送和预订修改确认</View>
        <Text className="header__button" onClick={openCreate}>
          新增
        </Text>
      </View>

      {loading && items.length === 0 ? (
        <View className="empty">正在加载地址...</View>
      ) : null}

      {items.map((item) => (
        <View className="address-card" key={item.id}>
          <View className="address-card__top">
            <View className="address-card__name">
              {formatAddressReceiverLine(item)}
            </View>
            {item.isDefault ? (
              <Text className="address-card__tag">默认</Text>
            ) : null}
          </View>
          <View className="address-card__detail">
            {formatAddressFullAddress(item)}
          </View>
          <View className="address-card__actions">
            <Text
              className="address-card__action address-card__action--danger"
              onClick={() => void deleteAddress(item)}
            >
              删除
            </Text>
            <Text
              className="address-card__action"
              onClick={() => openEdit(item)}
            >
              编辑
            </Text>
            {!item.isDefault ? (
              <Text
                className="address-card__action"
                onClick={() => setDefaultAddress(item)}
              >
                设为默认
              </Text>
            ) : null}
          </View>
        </View>
      ))}

      {!loading && items.length === 0 ? (
        <View className="empty">还没有配送地址，先新增一个默认地址。</View>
      ) : null}

      {formOpen ? (
        <View className="address-form-modal">
          <View className="address-form-modal__mask" onClick={closeForm} />
          <View className="form-panel">
            <View className="form-panel__handle" />
            <View className="form-panel__head">
              <View>
                <View className="form-panel__title">
                  {editing ? "编辑地址" : "新增地址"}
                </View>
                <View className="form-panel__meta">
                  保存后用于首页预订和配送确认
                </View>
              </View>
              {items.length > 0 ? (
                <Text className="form-panel__close" onClick={closeForm}>
                  关闭
                </Text>
              ) : null}
            </View>

            <View className="field">
              <View className="field__label">收货人</View>
              <Input
                className="field__input"
                onInput={(event) => updateForm("receiverName", event.detail.value)}
                placeholder="请输入姓名"
                value={form.receiverName}
              />
            </View>
            <View className="field">
              <View className="field__label">联系电话</View>
              <Input
                className="field__input"
                onInput={(event) => updateForm("receiverPhone", event.detail.value)}
                placeholder="请输入手机号"
                type="number"
                value={form.receiverPhone}
              />
            </View>
            <View className="field">
              <View className="field__label">所在地区</View>
              <Picker
                level="region"
                mode="region"
                onChange={(event) =>
                  updateFormRegion(event.detail.value as string[])
                }
                value={buildAddressRegionPickerValue(form)}
              >
                <View
                  className={[
                    "field__selector",
                    formatAddressRegion(form)
                      ? ""
                      : "field__selector--placeholder",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <Text className="field__selector-text">
                    {formatAddressRegion(form) || "请选择省 / 市 / 区县"}
                  </Text>
                  <Text className="field__selector-arrow">›</Text>
                </View>
              </Picker>
            </View>
            <View className="field">
              <View className="field__label">详细地址</View>
              <Input
                className="field__input"
                onInput={(event) => updateForm("detail", event.detail.value)}
                placeholder="小区、楼栋、门牌号"
                value={form.detail}
              />
            </View>
            <View className="field field--switch">
              <View>
                <View className="field__label">默认地址</View>
                <View className="field__hint">{defaultSwitch.hint}</View>
              </View>
              {defaultSwitch.disabled ? (
                <View className="default-status">当前默认</View>
              ) : (
                <View
                  className={[
                    "default-toggle",
                    form.isDefault ? "default-toggle--checked" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => updateForm("isDefault", !form.isDefault)}
                >
                  <View className="default-toggle__knob" />
                </View>
              )}
            </View>

            <Text
              className="save-button"
              onClick={submitAddress}
            >
              保存地址
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
