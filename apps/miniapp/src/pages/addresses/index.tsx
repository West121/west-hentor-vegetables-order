import { Input, Switch, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useEffect, useState } from "react";

import "./index.scss";

const API_BASE_URL =
  process.env.TARO_APP_API_BASE_URL || "http://127.0.0.1:3000";
const STORE_CODE = process.env.TARO_APP_STORE_CODE ?? "lotus-garden";

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

function isValidPhone(value: string) {
  return /^1[3-9]\d{9}$/.test(value.trim());
}

export default function AddressesPage() {
  const [items, setItems] = useState<AddressItem[]>([]);
  const [editing, setEditing] = useState<AddressItem | null>(null);
  const [form, setForm] = useState<FormState>(buildForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
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

      const response = await Taro.request<ApiResponse<AddressData>>({
        header: { authorization: `Bearer ${token}` },
        method: "GET",
        url: `${API_BASE_URL}/api/v1/addresses?storeCode=${STORE_CODE}`,
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
    setForm(buildForm());
    setFormOpen(true);
  }

  function openEdit(item: AddressItem) {
    setEditing(item);
    setForm(buildForm(item));
    setFormOpen(true);
  }

  async function submitAddress() {
    if (!form.receiverName.trim()) {
      Taro.showToast({ icon: "none", title: "请输入收货人" });
      return;
    }
    if (!form.receiverPhone.trim()) {
      Taro.showToast({ icon: "none", title: "请输入联系电话" });
      return;
    }
    if (!isValidPhone(form.receiverPhone)) {
      Taro.showToast({ icon: "none", title: "请输入正确的手机号" });
      return;
    }
    if (!form.detail.trim()) {
      Taro.showToast({ icon: "none", title: "请输入详细地址" });
      return;
    }

    setSaving(true);
    Taro.showLoading({ title: "保存中" });

    try {
      const token = Taro.getStorageSync("mini_session_token");
      const response = await Taro.request<ApiResponse<unknown>>({
        data: {
          city: form.city || null,
          detail: form.detail,
          district: form.district || null,
          isDefault: form.isDefault,
          province: form.province || null,
          receiverName: form.receiverName,
          receiverPhone: form.receiverPhone,
          storeCode: STORE_CODE,
        },
        header: { authorization: `Bearer ${token}` },
        method: editing ? "PATCH" : "POST",
        url: editing
          ? `${API_BASE_URL}/api/v1/addresses/${editing.id}`
          : `${API_BASE_URL}/api/v1/addresses`,
      });
      const payload = response.data;

      if (!payload.success) {
        throw new Error(payload.error?.message ?? "地址保存失败");
      }

      await loadAddresses({ quiet: true });
      setFormOpen(false);
      setEditing(null);
      Taro.showToast({ icon: "success", title: "已保存" });
    } catch (error) {
      Taro.showToast({
        icon: "none",
        title: error instanceof Error ? error.message : "地址保存失败",
      });
    } finally {
      Taro.hideLoading();
      setSaving(false);
    }
  }

  async function setDefaultAddress(item: AddressItem) {
    setEditing(item);
    setForm({ ...buildForm(item), isDefault: true });
    setSaving(true);

    try {
      const token = Taro.getStorageSync("mini_session_token");
      const response = await Taro.request<ApiResponse<unknown>>({
        data: {
          city: item.city,
          detail: item.detail,
          district: item.district,
          isDefault: true,
          province: item.province,
          receiverName: item.receiverName,
          receiverPhone: item.receiverPhone,
          storeCode: STORE_CODE,
        },
        header: { authorization: `Bearer ${token}` },
        method: "PATCH",
        url: `${API_BASE_URL}/api/v1/addresses/${item.id}`,
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
      setSaving(false);
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

    setSaving(true);

    try {
      const token = Taro.getStorageSync("mini_session_token");
      const response = await Taro.request<ApiResponse<unknown>>({
        header: { authorization: `Bearer ${token}` },
        method: "DELETE",
        url: `${API_BASE_URL}/api/v1/addresses/${item.id}?storeCode=${STORE_CODE}`,
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
      setSaving(false);
    }
  }

  return (
    <View className="addresses">
      <View className="header">
        <View>
          <View className="header__title">地址管理</View>
          <View className="header__meta">用于蔬菜配送和预订修改确认</View>
        </View>
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
              {item.receiverName} {item.receiverPhone}
            </View>
            {item.isDefault ? (
              <Text className="address-card__tag">默认</Text>
            ) : null}
          </View>
          <View className="address-card__detail">
            {item.fullAddress || item.detail}
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
        <View className="form-panel">
          <View className="form-panel__head">
            <View className="form-panel__title">
              {editing ? "编辑地址" : "新增地址"}
            </View>
            {items.length > 0 ? (
              <Text className="form-panel__close" onClick={() => setFormOpen(false)}>
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
          <View className="field-grid">
            <View className="field">
              <View className="field__label">省</View>
              <Input
                className="field__input"
                onInput={(event) => updateForm("province", event.detail.value)}
                placeholder="北京"
                value={form.province}
              />
            </View>
            <View className="field">
              <View className="field__label">市</View>
              <Input
                className="field__input"
                onInput={(event) => updateForm("city", event.detail.value)}
                placeholder="北京"
                value={form.city}
              />
            </View>
          </View>
          <View className="field-grid">
            <View className="field">
              <View className="field__label">区</View>
              <Input
                className="field__input"
                onInput={(event) => updateForm("district", event.detail.value)}
                placeholder="朝阳区"
                value={form.district}
              />
            </View>
            <View className="field field--switch">
              <View>
                <View className="field__label">默认地址</View>
                <View className="field__hint">下单优先使用</View>
              </View>
              <Switch
                checked={form.isDefault}
                color="#1F8F4F"
                onChange={(event) => updateForm("isDefault", event.detail.value)}
              />
            </View>
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

          <Text
            className={saving ? "save-button save-button--disabled" : "save-button"}
            onClick={saving ? undefined : submitAddress}
          >
            {saving ? "保存中" : "保存地址"}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
