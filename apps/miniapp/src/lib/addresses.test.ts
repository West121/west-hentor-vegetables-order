import { describe, expect, it } from "vitest";

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
  maskReceiverPhone,
  parseAddressRegionPickerValue,
  isValidReceiverPhone,
} from "./addresses";

describe("miniapp address helpers", () => {
  it("forces the first address to be default and keeps the switch disabled", () => {
    expect(
      getDefaultAddressSwitchState({
        addressCount: 0,
        editingIsDefault: false,
      }),
    ).toEqual({
      checked: true,
      disabled: true,
      hint: "第一个地址会自动设为默认地址",
    });
  });

  it("does not let users turn off the current default address directly", () => {
    expect(
      getDefaultAddressSwitchState({
        addressCount: 3,
        editingIsDefault: true,
      }),
    ).toEqual({
      checked: true,
      disabled: true,
      hint: "当前默认地址，内容可直接修改",
    });
  });

  it("allows a non-default address to become the default address", () => {
    expect(
      getDefaultAddressSwitchState({
        addressCount: 3,
        editingIsDefault: false,
      }),
    ).toEqual({
      checked: false,
      disabled: false,
      hint: "下单优先使用",
    });
  });

  it("builds a dedicated default-address action url", () => {
    expect(
      buildSetDefaultAddressUrl({
        addressId: "address 1",
        apiBaseUrl: "http://127.0.0.1:3000",
        storeCode: "lotus/garden",
      }),
    ).toBe(
      "http://127.0.0.1:3000/api/v1/addresses/address%201/default?storeCode=lotus%2Fgarden",
    );
  });

  it("builds encoded address list and resource urls", () => {
    expect(
      buildAddressListUrl({
        apiBaseUrl: "http://127.0.0.1:3000",
        storeCode: "lotus/garden",
      }),
    ).toBe(
      "http://127.0.0.1:3000/api/v1/addresses?storeCode=lotus%2Fgarden",
    );
    expect(
      buildAddressResourceUrl({
        addressId: "address 1",
        apiBaseUrl: "http://127.0.0.1:3000",
        storeCode: "lotus/garden",
      }),
    ).toBe(
      "http://127.0.0.1:3000/api/v1/addresses/address%201?storeCode=lotus%2Fgarden",
    );
  });

  it("validates detailed address length before submit", () => {
    expect(getAddressDetailError("")).toBe("请输入详细地址");
    expect(getAddressDetailError(" 3栋602 ")).toBe("详细地址至少 8 个字");
    expect(getAddressDetailError("莲花小区 3 栋 602")).toBeNull();
  });

  it("requires province, city, and district before submitting addresses", () => {
    expect(
      getAddressRegionError({
        city: "南京市",
        district: "六合区",
        province: "",
      }),
    ).toBe("请选择所在地区");
    expect(
      getAddressRegionError({
        city: "",
        district: "六合区",
        province: "江苏省",
      }),
    ).toBe("请选择所在地区");
    expect(
      getAddressRegionError({
        city: "南京市",
        district: "",
        province: "江苏省",
      }),
    ).toBe("请选择所在地区");
    expect(
      getAddressRegionError({
        city: "南京市",
        district: "六合区",
        province: "江苏省",
      }),
    ).toBeNull();
  });

  it("formats and parses region picker values", () => {
    const region = {
      city: " 南京市 ",
      district: " 六合区 ",
      province: " 江苏省 ",
    };

    expect(formatAddressRegion(region)).toBe("江苏省 / 南京市 / 六合区");
    expect(buildAddressRegionPickerValue(region)).toEqual([
      "江苏省",
      "南京市",
      "六合区",
    ]);
    expect(buildAddressRegionPickerValue({ province: "江苏省" })).toEqual([]);
    expect(
      parseAddressRegionPickerValue([" 江苏省 ", " 南京市 ", " 六合区 "]),
    ).toEqual({
      city: "南京市",
      district: "六合区",
      province: "江苏省",
    });
  });

  it("validates mainland mobile numbers for address forms", () => {
    expect(isValidReceiverPhone("15295081992")).toBe(true);
    expect(isValidReceiverPhone(" 15295081992 ")).toBe(true);
    expect(isValidReceiverPhone("123456")).toBe(false);
    expect(isValidReceiverPhone("25295081992")).toBe(false);
  });

  it("masks receiver phones in address cards", () => {
    expect(maskReceiverPhone("15295081992")).toBe("152****1992");
    expect(
      formatAddressReceiverLine({
        receiverName: "张建国",
        receiverPhone: "15295081992",
      }),
    ).toBe("张建国 152****1992");
  });

  it("builds a compact address submit payload shared by page and modal forms", () => {
    expect(
      buildAddressSubmitPayload({
        city: " 南京市 ",
        detail: "莲花小区 3 栋 602",
        district: " 六合区 ",
        isDefault: true,
        province: " 江苏省 ",
        receiverName: "张建国",
        receiverPhone: "15295081992",
        storeCode: "lotus-garden",
      }),
    ).toEqual({
      city: "南京市",
      detail: "莲花小区 3 栋 602",
      district: "六合区",
      isDefault: true,
      province: "江苏省",
      receiverName: "张建国",
      receiverPhone: "15295081992",
      storeCode: "lotus-garden",
    });
  });

  it("formats full addresses with an API fullAddress override when present", () => {
    expect(
      formatAddressFullAddress({
        city: "南京市",
        detail: "龙池街道 1 号",
        district: "六合区",
        province: "江苏省",
      }),
    ).toBe("江苏省 南京市 六合区 龙池街道 1 号");

    expect(
      formatAddressFullAddress({
        detail: "龙池街道 1 号",
        fullAddress: "江苏省 南京市 六合区 龙池街道 1 号",
      }),
    ).toBe("江苏省 南京市 六合区 龙池街道 1 号");
  });
});
