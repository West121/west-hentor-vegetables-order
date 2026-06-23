import { Image, Input, Picker, Text, View } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { useEffect, useMemo, useState } from "react";

import { calculateReservationSummary } from "@hentor/shared";

import { MiniCustomTop } from "../../components/mini-custom-top";
import {
  buildAddressListUrl,
  buildAddressRegionPickerValue,
  buildAddressSubmitPayload,
  buildSetDefaultAddressUrl,
  formatAddressFullAddress,
  formatAddressRegion,
  formatAddressReceiverLine,
  getAddressDetailError,
  getAddressRegionError,
  isValidReceiverPhone,
  parseAddressRegionPickerValue,
} from "../../lib/addresses";
import {
  buildSelectedBenefits,
  buildHomeUrl,
  buildReservationRequestOptions,
  buildSelectedItems,
  changeBenefitSelection,
  changeDishSelection,
  getDishDisplayImage,
  getDisplayDishes,
  getEditingOrderResolution,
  getPackageCardCutoffBadge,
  getPackageBenefitDisplays,
  getHomeDishColumns,
  getPackageUsageProgressPercent,
  getReservationConfirmView,
  getReservationAddress,
  getReservationGate,
  getReservationSummaryMeta,
  getSelectablePackageBenefits,
  getUnavailableSelectedItems,
  isPastCutoff,
} from "../../lib/home";
import { ACTIVE_STORE_CODE_KEY, getActiveStoreCode } from "../../lib/stores";
import cabbageImage from "../../assets/dishes/cabbage.jpg";
import cucumberImage from "../../assets/dishes/cucumber.jpg";
import eggImage from "../../assets/dishes/egg.png";
import greensImage from "../../assets/dishes/mixed-greens.jpg";
import lettuceImage from "../../assets/dishes/lettuce.jpg";
import spinachImage from "../../assets/dishes/spinach.jpg";
import tomatoImage from "../../assets/dishes/tomato.jpg";
import "./index.scss";

const API_BASE_URL =
  process.env.TARO_APP_API_BASE_URL || "https://mmprd.hentor.com:8103";
const DEFAULT_STORE_CODE = process.env.TARO_APP_STORE_CODE ?? "lotus-garden";
const HOME_DISH_COLUMNS = getHomeDishColumns(
  process.env.TARO_APP_HOME_DISH_COLUMNS,
);
const dishFallbackImages = {
  cabbage: cabbageImage,
  cucumber: cucumberImage,
  greens: greensImage,
  lettuce: lettuceImage,
  spinach: spinachImage,
  tomato: tomatoImage,
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
};

type HomeData = {
  currentOrder: null | {
    address: {
      city?: string | null;
      detail?: string;
      district?: string | null;
      fullAddress?: string | null;
      province?: string | null;
      receiverName?: string;
      receiverPhone?: string;
    } | null;
    addressId: string | null;
    benefits?: Array<{
      id: string;
      kind: string;
      nameSnapshot: string;
      quantity: number;
      unitSnapshot: string;
      userPackageBenefitId?: string | null;
    }>;
    id: string;
    items: Array<{
      dishId: string;
      name: string;
      weightJin: number;
    }>;
    orderNo: string;
  };
  defaultAddress: null | {
    city?: string | null;
    detail: string;
    district?: string | null;
    fullAddress?: string | null;
    id: string;
    province?: string | null;
    receiverName?: string;
    receiverPhone?: string;
  };
  dishes: Array<{
    category: string;
    description: string | null;
    id: string;
    imageUrl: string | null;
    name: string;
    stepJin: number;
    stockJin: number;
  }>;
  member: null | {
    bindingStatus?: string | null;
    disabledReason?: string | null;
    id: string;
    status?: string | null;
  };
  package: null | {
    benefits: Array<{
      id: string;
      kind: string;
      name: string;
      remainingQuantity: number;
      totalQuantity: number;
      unit: string;
      usedQuantity: number;
    }>;
    frozenReason: string | null;
    id: string;
    name: string;
    remainingTimes: number;
    status: string;
    storeId: string;
    totalTimes: number;
    userId: string;
    usedTimes: number;
    weightLimitJin: number;
  };
  store: {
    cutoffTime: string;
    id: string;
  };
};

type AddressFormState = {
  city: string;
  detail: string;
  district: string;
  province: string;
  receiverName: string;
  receiverPhone: string;
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

type ReservationSubmitResult = {
  reservation?: {
    id?: string;
  };
};

const emptyAddressForm: AddressFormState = {
  city: "",
  detail: "",
  district: "",
  province: "",
  receiverName: "",
  receiverPhone: "",
};

export default function HomePage() {
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [selectedBenefits, setSelectedBenefits] = useState<Record<string, number>>(
    {},
  );
  const [submitting, setSubmitting] = useState(false);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [addressForm, setAddressForm] =
    useState<AddressFormState>(emptyAddressForm);
  const [addressItems, setAddressItems] = useState<AddressItem[]>([]);
  const [addressSwitchOpen, setAddressSwitchOpen] = useState(false);
  const [addressSwitchLoading, setAddressSwitchLoading] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<AddressItem | null>(
    null,
  );
  const [switchingAddressId, setSwitchingAddressId] = useState<string | null>(
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function loadHome(options?: { quiet?: boolean }) {
    if (!options?.quiet) {
      setLoading(true);
    }

    try {
      const token = Taro.getStorageSync("mini_session_token");
      if (!token) {
        Taro.navigateTo({ url: "/pages/login/index" });
        return;
      }
      const storedEditingOrderId = Taro.getStorageSync("editing_order_id") as
        | string
        | undefined;
      const storeCode = getActiveStoreCode(
        Taro.getStorageSync(ACTIVE_STORE_CODE_KEY) as string | undefined,
        DEFAULT_STORE_CODE,
      );
      const homeUrl = buildHomeUrl({
        apiBaseUrl: API_BASE_URL,
        editingOrderId: storedEditingOrderId,
        storeCode,
      });

      const response = await Taro.request<ApiResponse<HomeData>>({
        url: homeUrl,
        method: "GET",
        header: {
          authorization: `Bearer ${token}`,
        },
      });
      const payload = response.data;

      if (!payload.success || !payload.data) {
        if (payload.error?.code === "UNAUTHORIZED") {
          Taro.navigateTo({ url: "/pages/login/index" });
          return;
        }

        throw new Error(payload.error?.message ?? "首页数据加载失败");
      }

      setHomeData(payload.data);
      const editingResolution = getEditingOrderResolution(storedEditingOrderId, {
        currentOrder: payload.data.currentOrder,
      });
      const activeEditingOrderId = payload.data.currentOrder?.id ?? null;
      if (editingResolution.shouldClearEditingOrder) {
        Taro.removeStorageSync("editing_order_id");
        setSelectedAddress(null);
        if (!payload.data.currentOrder) {
          Taro.showToast({
            title: editingResolution.toastTitle ?? "该订单已不可修改",
            icon: "none",
          });
        }
      }
      setEditingOrderId(activeEditingOrderId);
      setSelected(
        activeEditingOrderId
          ? payload.data.currentOrder?.items.reduce<Record<string, number>>(
              (result, item) => ({
                ...result,
                [item.dishId]: item.weightJin,
              }),
              {},
            ) ?? {}
          : {},
      );
      setSelectedBenefits(
        activeEditingOrderId
          ? payload.data.currentOrder?.benefits?.reduce<Record<string, number>>(
              (result, benefit) =>
                benefit.userPackageBenefitId
                  ? {
                      ...result,
                      [benefit.userPackageBenefitId]: benefit.quantity,
                    }
                  : result,
              {},
            ) ?? {}
          : {},
      );
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : "首页数据加载失败",
        icon: "none",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHome();
  }, []);

  useDidShow(() => {
    if (homeData) {
      void loadHome({ quiet: true });
    }
  });

  const packageInfo = homeData?.package;
  const dishes = homeData?.dishes ?? [];
  const hasPackage = Boolean(packageInfo);
  const reservationGate = getReservationGate({
    hasCurrentOrder: Boolean(homeData?.currentOrder),
    isPastCutoff: isPastCutoff(homeData?.store.cutoffTime),
    memberInfo: homeData?.member,
    packageInfo,
  });
  const isEditingCurrentOrder = Boolean(
    editingOrderId && homeData?.currentOrder?.id === editingOrderId,
  );
  const editableCurrentOrder = isEditingCurrentOrder
    ? homeData?.currentOrder
    : null;
  const selectedItems = useMemo(
    () => buildSelectedItems(dishes, selected, editableCurrentOrder?.items ?? []),
    [dishes, editableCurrentOrder?.items, selected],
  );
  const unavailableSelectedItems = useMemo(
    () =>
      getUnavailableSelectedItems(
        dishes,
        selected,
        editableCurrentOrder?.items ?? [],
      ),
    [dishes, editableCurrentOrder?.items, selected],
  );
  const summary = calculateReservationSummary(
    selectedItems,
    packageInfo?.weightLimitJin ?? 0,
  );
  const displayDishes = getDisplayDishes(dishes);
  const reservationAddress = getReservationAddress({
    currentOrder: editableCurrentOrder,
    defaultAddress: homeData?.defaultAddress,
    selectedAddress: selectedAddress
      ? {
          city: selectedAddress.city,
          detail: selectedAddress.detail,
          district: selectedAddress.district,
          fullAddress: selectedAddress.fullAddress,
          id: selectedAddress.id,
          province: selectedAddress.province,
        }
      : null,
  });
  const reservationReceiver = {
    name:
      selectedAddress?.receiverName ??
      (reservationAddress.source === "currentOrder"
        ? editableCurrentOrder?.address?.receiverName
        : homeData?.defaultAddress?.receiverName),
    phone:
      selectedAddress?.receiverPhone ??
      (reservationAddress.source === "currentOrder"
        ? editableCurrentOrder?.address?.receiverPhone
        : homeData?.defaultAddress?.receiverPhone),
  };
  const submitDisabled =
    submitting || summary.isOverLimit || reservationGate.submitDisabled;
  const summaryMeta = getReservationSummaryMeta({
    isOverLimit: summary.isOverLimit,
    packageMeta: reservationGate.packageMeta,
    selectedCount: summary.itemCount,
  });
  const packageProgressPercent = packageInfo
    ? getPackageUsageProgressPercent({
        remainingTimes: packageInfo.remainingTimes,
        totalTimes: packageInfo.totalTimes,
        usedTimes: packageInfo.usedTimes,
      })
    : 0;
  const packageTotalTimes = packageInfo?.totalTimes ?? 0;
  const packageUsedTimes = packageInfo?.usedTimes ?? 0;
  const packageRemainingTimes = packageInfo?.remainingTimes ?? 0;
  const packageBenefits = getPackageBenefitDisplays(packageInfo?.benefits ?? []);
  const editableBenefitQuantityByPackageId =
    editableCurrentOrder?.benefits?.reduce<Record<string, number>>(
      (result, benefit) =>
        benefit.userPackageBenefitId
          ? {
              ...result,
              [benefit.userPackageBenefitId]: benefit.quantity,
            }
          : result,
      {},
    ) ?? {};
  const selectablePackageBenefits = packageBenefits
    .map((benefit) => ({
      ...benefit,
      remainingQuantity:
        benefit.remainingQuantity +
        (editableBenefitQuantityByPackageId[benefit.id] ?? 0),
    }))
    .filter((benefit) => getSelectablePackageBenefits([benefit]).length > 0);
  const selectedPackageBenefits = buildSelectedBenefits(
    selectablePackageBenefits,
    selectedBenefits,
  );
  const confirmationBenefits = selectedPackageBenefits.map((benefit) => ({
    kind: benefit.kind,
    name: benefit.name,
    quantity: benefit.quantity,
    unit: benefit.unit,
  }));
  const selectedBenefitSummary = selectedPackageBenefits
    .map((benefit) => `${benefit.name}${benefit.quantity}${benefit.unit}`)
    .join(" · ");
  const confirmationView =
    confirmOpen && homeData && packageInfo
      ? getReservationConfirmView({
          addressDetail: reservationAddress.detail,
          benefits: confirmationBenefits,
          cutoffTime: homeData.store.cutoffTime,
          currentItems: selectedItems,
          mode: isEditingCurrentOrder ? "edit" : "create",
          originalItems: editableCurrentOrder?.items,
          receiverName: reservationReceiver.name,
          receiverPhone: reservationReceiver.phone,
          totalWeightJin: summary.totalWeightJin,
          weightLimitJin: packageInfo.weightLimitJin,
        })
      : null;

  function getDishImage(dish: HomeData["dishes"][number]) {
    return getDishDisplayImage(dish, dishFallbackImages);
  }

  function getBenefitIcon(benefit: { kind?: string | null; name: string }) {
    const key = `${benefit.kind} ${benefit.name}`.toLowerCase();
    if (key.includes("chicken") || key.includes("鸡")) {
      return "🐔";
    }
    return "🎁";
  }

  function getBenefitImage(benefit: { kind?: string | null; name: string }) {
    const key = `${benefit.kind} ${benefit.name}`.toLowerCase();
    if (key.includes("egg") || key.includes("蛋")) {
      return eggImage;
    }
    return null;
  }

  function changeDish(dish: HomeData["dishes"][number], delta: number) {
    if (!reservationGate.canReserve) {
      Taro.showToast({
        title:
          reservationGate.packageMeta ??
          reservationGate.emptyMessage ??
          "暂无可用套餐",
        icon: "none",
      });
      return;
    }

    const currentWeight = selected[dish.id] ?? 0;
    const reservedWeight =
      editableCurrentOrder?.items.find((item) => item.dishId === dish.id)
        ?.weightJin ?? 0;
    const availableStockJin = dish.stockJin + reservedWeight;
    if (delta > 0 && availableStockJin <= 0) {
      Taro.showToast({ title: "该菜品已售罄", icon: "none" });
      return;
    }
    if (delta > 0 && currentWeight + dish.stepJin > availableStockJin) {
      Taro.showToast({ title: "菜品库存不足", icon: "none" });
      return;
    }

    const nextSelected = changeDishSelection(selected, {
      delta,
      dishId: dish.id,
      isAvailable: availableStockJin > 0,
      stepJin: dish.stepJin,
    });
    const nextSummary = calculateReservationSummary(
      buildSelectedItems(dishes, nextSelected, editableCurrentOrder?.items ?? []),
      packageInfo?.weightLimitJin ?? 0,
    );

    if (delta > 0 && nextSummary.isOverLimit) {
      Taro.showToast({ title: "已超过套餐额度", icon: "none" });
      return;
    }

    setSelected(nextSelected);
  }

  function removeUnavailableDish(dishId: string) {
    setSelected((current) => ({
      ...current,
      [dishId]: 0,
    }));
  }

  function changePackageBenefit(
    benefit: NonNullable<HomeData["package"]>["benefits"][number],
    delta: number,
  ) {
    if (!reservationGate.canReserve) {
      return;
    }

    setSelectedBenefits((current) =>
      changeBenefitSelection(current, {
        benefitId: benefit.id,
        delta,
        maxQuantity: benefit.remainingQuantity,
      }),
    );
  }

  function openCreateAddressFromSwitch() {
    setAddressSwitchOpen(false);
    setAddressForm(emptyAddressForm);
    setAddressFormOpen(true);
  }

  async function loadAddressItems() {
    setAddressSwitchLoading(true);

    try {
      const storeCode = getActiveStoreCode(
        Taro.getStorageSync(ACTIVE_STORE_CODE_KEY) as string | undefined,
        DEFAULT_STORE_CODE,
      );
      const response = await Taro.request<ApiResponse<AddressData>>({
        header: {
          authorization: `Bearer ${Taro.getStorageSync("mini_session_token")}`,
        },
        method: "GET",
        url: buildAddressListUrl({
          apiBaseUrl: API_BASE_URL,
          storeCode,
        }),
      });
      const payload = response.data;

      if (!payload.success || !payload.data) {
        throw new Error(payload.error?.message ?? "地址加载失败");
      }

      setAddressItems(payload.data.items);
      if (payload.data.items.length === 0) {
        openCreateAddressFromSwitch();
      }
    } catch (error) {
      Taro.showToast({
        icon: "none",
        title: error instanceof Error ? error.message : "地址加载失败",
      });
    } finally {
      setAddressSwitchLoading(false);
    }
  }

  function openAddressAction() {
    if (!reservationAddress.id) {
      setAddressForm(emptyAddressForm);
      setAddressFormOpen(true);
      return;
    }

    setAddressSwitchOpen(true);
    void loadAddressItems();
  }

  async function selectReservationAddress(item: AddressItem) {
    if (switchingAddressId) {
      return;
    }

    if (item.isDefault) {
      setSelectedAddress(item);
      setAddressSwitchOpen(false);
      return;
    }

    setSwitchingAddressId(item.id);
    Taro.showLoading({ title: "切换中" });

    try {
      const storeCode = getActiveStoreCode(
        Taro.getStorageSync(ACTIVE_STORE_CODE_KEY) as string | undefined,
        DEFAULT_STORE_CODE,
      );
      const response = await Taro.request<
        ApiResponse<{ reservation?: { id?: string } }>
      >({
        header: {
          authorization: `Bearer ${Taro.getStorageSync("mini_session_token")}`,
        },
        method: "POST",
        url: buildSetDefaultAddressUrl({
          addressId: item.id,
          apiBaseUrl: API_BASE_URL,
          storeCode,
        }),
      });

      if (!response.data.success) {
        throw new Error(response.data.error?.message ?? "地址切换失败");
      }

      setSelectedAddress(item);
      setAddressSwitchOpen(false);
      await loadHome({ quiet: true });
      Taro.showToast({ icon: "success", title: "地址已切换" });
    } catch (error) {
      Taro.showToast({
        icon: "none",
        title: error instanceof Error ? error.message : "地址切换失败",
      });
    } finally {
      Taro.hideLoading();
      setSwitchingAddressId(null);
    }
  }

  function updateAddressForm<K extends keyof AddressFormState>(
    key: K,
    value: AddressFormState[K],
  ) {
    setAddressForm((current) => ({ ...current, [key]: value }));
  }

  function updateAddressFormRegion(value?: string[]) {
    setAddressForm((current) => ({
      ...current,
      ...parseAddressRegionPickerValue(value),
    }));
  }

  async function saveAddressFromHome() {
    if (!addressForm.receiverName.trim()) {
      Taro.showToast({ icon: "none", title: "请输入收货人" });
      return;
    }
    if (!isValidReceiverPhone(addressForm.receiverPhone)) {
      Taro.showToast({ icon: "none", title: "请输入正确的手机号" });
      return;
    }
    const regionError = getAddressRegionError(addressForm);
    if (regionError) {
      Taro.showToast({ icon: "none", title: regionError });
      return;
    }
    const detailError = getAddressDetailError(addressForm.detail);
    if (detailError) {
      Taro.showToast({ icon: "none", title: detailError });
      return;
    }

    setAddressSaving(true);
    Taro.showLoading({ title: "保存中" });

    try {
      const storeCode = getActiveStoreCode(
        Taro.getStorageSync(ACTIVE_STORE_CODE_KEY) as string | undefined,
        DEFAULT_STORE_CODE,
      );
      const response = await Taro.request<ApiResponse<{ address: AddressItem }>>({
        data: buildAddressSubmitPayload({
          city: addressForm.city,
          detail: addressForm.detail,
          district: addressForm.district,
          isDefault: true,
          province: addressForm.province,
          receiverName: addressForm.receiverName,
          receiverPhone: addressForm.receiverPhone,
          storeCode,
        }),
        header: {
          authorization: `Bearer ${Taro.getStorageSync("mini_session_token")}`,
        },
        method: "POST",
        url: `${API_BASE_URL}/api/v1/addresses`,
      });

      if (!response.data.success) {
        throw new Error(response.data.error?.message ?? "地址保存失败");
      }

      if (response.data.data?.address) {
        setSelectedAddress(response.data.data.address);
      }
      setAddressFormOpen(false);
      setAddressForm(emptyAddressForm);
      await loadHome({ quiet: true });
      Taro.showToast({ icon: "success", title: "地址已保存" });
    } catch (error) {
      Taro.showToast({
        icon: "none",
        title: error instanceof Error ? error.message : "地址保存失败",
      });
    } finally {
      Taro.hideLoading();
      setAddressSaving(false);
    }
  }

  async function submitOrder() {
    if (!reservationGate.canReserve) {
      Taro.showToast({
        title:
          reservationGate.packageMeta ??
          reservationGate.emptyMessage ??
          "请先购买套餐",
        icon: "none",
      });
      return;
    }

    if (!homeData || !packageInfo || !reservationAddress.id) {
      Taro.showToast({ title: "请先维护配送地址", icon: "none" });
      return;
    }

    if (!selectedItems.length) {
      Taro.showToast({ title: "请选择菜品", icon: "none" });
      return;
    }

    if (unavailableSelectedItems.length > 0) {
      Taro.showToast({
        title: "已选菜品有已下架项，请先移除",
        icon: "none",
      });
      return;
    }

    if (summary.isOverLimit) {
      Taro.showToast({ title: "已超过套餐额度", icon: "none" });
      return;
    }

    setConfirmOpen(true);
  }

  async function confirmSubmitOrder() {
    if (!homeData || !packageInfo || !reservationAddress.id) {
      setConfirmOpen(false);
      Taro.showToast({ title: "请先维护配送地址", icon: "none" });
      return;
    }

    if (!selectedItems.length || summary.isOverLimit) {
      setConfirmOpen(false);
      Taro.showToast({
        title: summary.isOverLimit ? "已超过套餐额度" : "请选择菜品",
        icon: "none",
      });
      return;
    }

    if (unavailableSelectedItems.length > 0) {
      setConfirmOpen(false);
      Taro.showToast({
        title: "已选菜品有已下架项，请先移除",
        icon: "none",
      });
      return;
    }

    setSubmitting(true);
    Taro.showLoading({ title: "提交中" });

    try {
      const requestOptions = buildReservationRequestOptions({
        addressId: reservationAddress.id,
        apiBaseUrl: API_BASE_URL,
        benefitSelections: selectedPackageBenefits.map((benefit) => ({
          quantity: benefit.quantity,
          userPackageBenefitId: benefit.id,
        })),
        editingOrderId: isEditingCurrentOrder
          ? editingOrderId ?? undefined
          : undefined,
        items: selectedItems,
        storeCode: getActiveStoreCode(
          Taro.getStorageSync(ACTIVE_STORE_CODE_KEY) as string | undefined,
          DEFAULT_STORE_CODE,
        ),
        userPackageId: packageInfo.id,
      });
      const response = await Taro.request<ApiResponse<ReservationSubmitResult>>({
        url: requestOptions.url,
        method: requestOptions.method,
        header: {
          authorization: `Bearer ${Taro.getStorageSync("mini_session_token")}`,
        },
        data: requestOptions.data,
      });
      const payload = response.data;

      if (!payload.success) {
        throw new Error(payload.error?.message ?? "预订提交失败");
      }

      const nextEditingOrderId = payload.data?.reservation?.id;
      if (nextEditingOrderId) {
        Taro.setStorageSync("editing_order_id", nextEditingOrderId);
      }
      await loadHome({ quiet: true });
      setSelectedAddress(null);
      setConfirmOpen(false);
      Taro.showToast({
        title: isEditingCurrentOrder ? "修改已保存" : "预订已提交",
        icon: "success",
      });
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : "预订提交失败",
        icon: "none",
      });
    } finally {
      Taro.hideLoading();
      setSubmitting(false);
    }
  }

  return (
    <View className="home">
      <MiniCustomTop className="home__custom-top" />
      {loading && !homeData ? (
        <View className="empty-package">正在加载今日可预订内容...</View>
      ) : hasPackage && packageInfo ? (
        <View
          className={
            reservationGate.canReserve
              ? "package-card"
              : "package-card package-card--disabled"
          }
        >
          <View className="package-card__content">
            <View className="package-card__head">
              <View className="package-card__name">{packageInfo.name}</View>
              <Text className="package-card__cutoff">
                {getPackageCardCutoffBadge(homeData?.store.cutoffTime)}
              </Text>
            </View>
            <View className="package-card__stats">
              <View className="package-card__stat">
                <Text className="package-card__stat-value">
                  {packageTotalTimes}次
                </Text>
                <Text className="package-card__stat-label">总次数</Text>
              </View>
              <View className="package-card__stat">
                <Text className="package-card__stat-value">
                  {packageUsedTimes}次
                </Text>
                <Text className="package-card__stat-label">已用</Text>
              </View>
              <View className="package-card__stat package-card__stat--strong">
                <Text className="package-card__stat-value">
                  {packageRemainingTimes}次
                </Text>
                <Text className="package-card__stat-label">剩余</Text>
              </View>
            </View>
            {packageBenefits.length > 0 ? (
              <View className="package-card__benefits">
                {packageBenefits.map((benefit) => (
                  <View className="package-card__benefit" key={benefit.id}>
                    <Text className="package-card__benefit-name">
                      {benefit.name}
                    </Text>
                    <Text className="package-card__benefit-value">
                      剩余 {benefit.remainingQuantity}
                      {benefit.unit}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            {!isEditingCurrentOrder && reservationGate.packageMeta ? (
              <View className="package-card__notice">
                {reservationGate.packageMeta}
              </View>
            ) : null}
            <View className="package-card__progress">
              <View
                className="package-card__progress-fill"
                style={{ width: `${packageProgressPercent}%` }}
              />
            </View>
          </View>
        </View>
      ) : (
        <View className="package-card package-card--empty">
          <View className="package-card__content">
            <View className="package-card__head">
              <View className="package-card__name">暂无套餐</View>
              <Text className="package-card__cutoff">
                {getPackageCardCutoffBadge(homeData?.store.cutoffTime)}
              </Text>
            </View>
            <View className="package-card__empty-title">暂不能下单</View>
            <View className="package-card__empty-meta">
              {reservationGate.emptyMessage}
            </View>
            <View className="package-card__empty-reserve">
              微信支付入口已预留
            </View>
            <View className="package-card__progress">
              <View className="package-card__progress-fill package-card__progress-fill--empty" />
            </View>
          </View>
        </View>
      )}

      <View className="section-head">
        <Text className="section-head__title">今日菜品</Text>
        <Text className="section-head__hint">按 + 选择斤数，可随时减回</Text>
      </View>

      <View className="content">
        <View className={`dish-grid dish-grid--cols-${HOME_DISH_COLUMNS}`}>
          {displayDishes.map((dish) => {
            const weight = selected[dish.id] ?? 0;
            const soldOut = dish.stockJin <= 0;
            return (
              <View
                className={soldOut ? "dish-card dish-card--disabled" : "dish-card"}
                key={dish.id}
              >
                <View className="dish-card__media">
                  <Image
                    className="dish-card__image"
                    mode="aspectFill"
                    src={getDishImage(dish)}
                  />
                </View>
                <View className="dish-card__name">{dish.name}</View>
                <View className="dish-card__actions">
                  <Text
                    className="step-btn step-btn--minus"
                    onClick={() => changeDish(dish, -dish.stepJin)}
                  >
                    -
                  </Text>
                  <Text className="dish-card__weight">{weight}斤</Text>
                  <Text
                    className={soldOut ? "step-btn step-btn--disabled" : "step-btn"}
                    onClick={() => changeDish(dish, dish.stepJin)}
                  >
                    +
                  </Text>
                </View>
              </View>
            );
          })}
          {selectablePackageBenefits.map((benefit) => {
            const quantity = selectedBenefits[benefit.id] ?? 0;
            const benefitImage = getBenefitImage(benefit);
            return (
              <View className="dish-card benefit-card" key={benefit.id}>
                <View className="dish-card__media benefit-card__media">
                  {benefitImage ? (
                    <Image
                      className="dish-card__image benefit-card__image"
                      mode="aspectFit"
                      src={benefitImage}
                    />
                  ) : (
                    <Text className="benefit-card__icon">
                      {getBenefitIcon(benefit)}
                    </Text>
                  )}
                </View>
                <View className="dish-card__name">{benefit.name}</View>
                <View className="dish-card__actions">
                  <Text
                    className="step-btn step-btn--minus"
                    onClick={() => changePackageBenefit(benefit, -1)}
                  >
                    -
                  </Text>
                  <Text className="dish-card__weight">
                    {quantity}
                    {benefit.unit}
                  </Text>
                  <Text
                    className={
                      quantity >= benefit.remainingQuantity
                        ? "step-btn step-btn--disabled"
                        : "step-btn"
                    }
                    onClick={() => changePackageBenefit(benefit, 1)}
                  >
                    +
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {unavailableSelectedItems.length > 0 ? (
        <View className="unavailable-selection">
          <View className="unavailable-selection__title">
            已选菜品有下架项
          </View>
          <View className="unavailable-selection__meta">
            下架菜品不会出现在今日菜品中，保存修改前请移除。
          </View>
          {unavailableSelectedItems.map((item) => (
            <View className="unavailable-selection__item" key={item.dishId}>
              <Text className="unavailable-selection__name">
                {item.name} {item.weightJin}斤
              </Text>
              <Text
                className="unavailable-selection__remove"
                onClick={() => removeUnavailableDish(item.dishId)}
              >
                移除
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View className="summary">
        <View
          className="summary__address"
          onClick={openAddressAction}
        >
          <View className="summary__address-main">
            <Text className="summary__address-label">配送地址</Text>
            <Text className="summary__address-detail">
              {reservationAddress.detail}
            </Text>
          </View>
          <Text className="summary__address-action">
            {reservationAddress.id ? "切换" : "新增地址"}
          </Text>
        </View>

        <View className="summary__body">
          <View>
            <View className="summary__main">
              已选 {summary.itemCount} 样菜 · {summary.totalWeightJin}斤
            </View>
            <View className="summary__meta">
              {selectedBenefitSummary || summaryMeta}
            </View>
          </View>
          {!reservationGate.hideSubmitButton ? (
            <Text
              className={
                submitDisabled
                  ? "summary__submit summary__submit--disabled"
                  : "summary__submit"
              }
              onClick={submitOrder}
            >
              {submitting
                ? "提交中"
                : isEditingCurrentOrder
                  ? "修改预订"
                  : "提交预订"}
            </Text>
          ) : null}
        </View>
      </View>

      {confirmationView ? (
        <View className="reservation-confirm">
          <MiniCustomTop
            back
            className="reservation-confirm__top"
            onBack={() => setConfirmOpen(false)}
          />
          <View className="reservation-confirm__title">
            {confirmationView.title}
          </View>
          <View className="reservation-confirm__subtitle">
            截单前可回首页继续调整
          </View>

          <View className="confirm-card confirm-selected">
            <View className="confirm-card__title">
              {confirmationView.detailTitle}
            </View>
            <View className="confirm-dish-grid">
              {selectedItems.map((item) => {
                const dish = dishes.find((value) => value.id === item.dishId);
                return (
                  <View
                    className="dish-card dish-card--readonly confirm-dish-card"
                    key={`${item.dishId}-${item.weightJin}`}
                  >
                    <View className="dish-card__media">
                      <Image
                        className="dish-card__image"
                        mode="aspectFill"
                        src={dish ? getDishImage(dish) : greensImage}
                      />
                    </View>
                    <View className="dish-card__name">{item.name}</View>
                    <Text className="dish-card__readonly-weight">
                      {item.weightJin}斤
                    </Text>
                  </View>
                );
              })}
              {confirmationView.benefits.map((benefit) => {
                const benefitImage = getBenefitImage(benefit);
                return (
                  <View
                    className="dish-card dish-card--readonly benefit-card confirm-dish-card"
                    key={`${benefit.name}-${benefit.quantity}-${benefit.unit}`}
                  >
                    <View className="dish-card__media benefit-card__media">
                      {benefitImage ? (
                        <Image
                          className="dish-card__image benefit-card__image"
                          mode="aspectFit"
                          src={benefitImage}
                        />
                      ) : (
                        <Text className="benefit-card__icon">
                          {getBenefitIcon(benefit)}
                        </Text>
                      )}
                    </View>
                    <View className="dish-card__name">{benefit.name}</View>
                    <Text className="dish-card__readonly-weight">
                      {benefit.quantity}
                      {benefit.unit}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View className="confirm-card confirm-address">
            <Text className="confirm-address__icon">⌖</Text>
            <View className="confirm-address__body">
              <View className="confirm-address__detail">
                {confirmationView.addressDetail}
              </View>
              <View className="confirm-address__meta">
                {confirmationView.addressMeta}
              </View>
            </View>
          </View>

          <View className="confirm-notice">
            <View className="confirm-notice__title">
              {confirmationView.noticeTitle}
            </View>
            <View className="confirm-notice__meta">
              {confirmationView.noticeMeta}
            </View>
          </View>

          <Text
            className={
              submitting
                ? "confirm-primary confirm-primary--disabled"
                : "confirm-primary"
            }
            onClick={() => {
              if (!submitting) {
                void confirmSubmitOrder();
              }
            }}
          >
            {submitting ? "提交中" : confirmationView.primaryText}
          </Text>
          <Text
            className="confirm-secondary"
            onClick={() => setConfirmOpen(false)}
          >
            {confirmationView.secondaryText}
          </Text>
        </View>
      ) : null}

      {addressSwitchOpen ? (
        <View className="address-switch-modal">
          <View
            className="address-switch-modal__mask"
            onClick={() => setAddressSwitchOpen(false)}
          />
          <View className="address-switch-panel">
            <View className="address-switch-panel__handle" />
            <View className="address-switch-panel__head">
              <View>
                <View className="address-switch-panel__title">切换配送地址</View>
                <View className="address-switch-panel__meta">
                  选中后用于本次预订和默认配送
                </View>
              </View>
              <Text
                className="address-switch-panel__add"
                onClick={openCreateAddressFromSwitch}
              >
                新增地址
              </Text>
            </View>
            {addressSwitchLoading ? (
              <View className="address-option address-option--muted">
                正在加载地址...
              </View>
            ) : null}
            {!addressSwitchLoading && addressItems.length === 0 ? (
              <View className="address-option address-option--muted">
                暂无配送地址，请先新增地址
              </View>
            ) : null}
            {addressItems.map((item) => (
              <View
                className={
                  item.isDefault
                    ? "address-option address-option--active"
                    : "address-option"
                }
                key={item.id}
                onClick={() => void selectReservationAddress(item)}
              >
                <View className="address-option__body">
                  <View className="address-option__receiver">
                    {formatAddressReceiverLine(item)}
                  </View>
                  <View className="address-option__detail">
                    {formatAddressFullAddress(item)}
                  </View>
                </View>
                <Text className="address-option__tag">
                  {item.isDefault
                    ? "当前"
                    : switchingAddressId === item.id
                      ? "切换中"
                      : "选择"}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {addressFormOpen ? (
        <View className="address-modal">
          <View
            className="address-modal__mask"
            onClick={() => setAddressFormOpen(false)}
          />
          <View className="address-modal__panel">
            <View className="address-modal__head">
              <View>
                <View className="address-modal__title">新增配送地址</View>
                <View className="address-modal__meta">
                  保存后将作为默认配送地址
                </View>
              </View>
              <Text
                className="address-modal__close"
                onClick={() => setAddressFormOpen(false)}
              >
                关闭
              </Text>
            </View>
            <View className="address-modal__field">
              <View className="address-modal__label">收货人</View>
              <Input
                className="address-modal__input"
                onInput={(event) =>
                  updateAddressForm("receiverName", event.detail.value)
                }
                placeholder="请输入姓名"
                value={addressForm.receiverName}
              />
            </View>
            <View className="address-modal__field">
              <View className="address-modal__label">联系电话</View>
              <Input
                className="address-modal__input"
                onInput={(event) =>
                  updateAddressForm("receiverPhone", event.detail.value)
                }
                placeholder="请输入手机号"
                type="number"
                value={addressForm.receiverPhone}
              />
            </View>
            <View className="address-modal__field">
              <View className="address-modal__label">所在地区</View>
              <Picker
                level="region"
                mode="region"
                onChange={(event) =>
                  updateAddressFormRegion(event.detail.value as string[])
                }
                value={buildAddressRegionPickerValue(addressForm)}
              >
                <View
                  className={[
                    "address-modal__selector",
                    formatAddressRegion(addressForm)
                      ? ""
                      : "address-modal__selector--placeholder",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <Text className="address-modal__selector-text">
                    {formatAddressRegion(addressForm) ||
                      "请选择省 / 市 / 区县"}
                  </Text>
                  <Text className="address-modal__selector-arrow">›</Text>
                </View>
              </Picker>
            </View>
            <View className="address-modal__field">
              <View className="address-modal__label">详细地址</View>
              <Input
                className="address-modal__input"
                onInput={(event) =>
                  updateAddressForm("detail", event.detail.value)
                }
                placeholder="小区、楼栋、门牌号"
                value={addressForm.detail}
              />
            </View>
            <Text
              className={
                addressSaving
                  ? "address-modal__save address-modal__save--disabled"
                  : "address-modal__save"
              }
              onClick={() => {
                if (!addressSaving) {
                  void saveAddressFromHome();
                }
              }}
            >
              {addressSaving ? "保存中" : "保存地址"}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
