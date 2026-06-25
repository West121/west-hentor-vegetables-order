import { describe, expect, it } from "vitest";

import {
  buildAddressListUrl,
  buildAddressRegionMultiPickerModel,
  buildAddressRegionPickerValue,
  buildAddressResourceUrl,
  buildAddressSubmitPayload,
  buildSetDefaultAddressUrl,
  formatDeliveryRangeText,
  formatAddressFullAddress,
  formatAddressRegion,
  formatAddressReceiverLine,
  getAddressDeliveryRangeError,
  getAddressDetailError,
  getDefaultAddressSwitchState,
  hasDeliveryRangeLimit,
  isAddressInDeliveryRange,
  getAddressRegionError,
  maskReceiverPhone,
  normalizeDeliveryRange,
  parseAddressRegionMultiPickerColumnChange,
  parseAddressRegionMultiPickerValue,
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

  it("requires detailed address text before submit without a minimum length", () => {
    expect(getAddressDetailError("")).toBe("请输入详细地址");
    expect(getAddressDetailError(" 3栋602 ")).toBeNull();
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

  it("matches address regions against province and city delivery scopes", () => {
    const range = normalizeDeliveryRange({
      deliveryCities: [" 南京市 ", "南京市"],
      deliveryProvinces: [" 江苏省 "],
    });

    expect(range).toEqual({
      deliveryCities: ["南京市"],
      deliveryProvinces: ["江苏省"],
    });
    expect(hasDeliveryRangeLimit(range)).toBe(true);
    expect(formatDeliveryRangeText(range)).toBe("江苏省全省、南京市");
    expect(
      isAddressInDeliveryRange(
        { city: "苏州市", province: "江苏省" },
        range,
      ),
    ).toBe(true);
    expect(
      isAddressInDeliveryRange(
        { city: "南京市", province: "安徽省" },
        range,
      ),
    ).toBe(true);
    expect(
      isAddressInDeliveryRange(
        { city: "合肥市", province: "安徽省" },
        range,
      ),
    ).toBe(false);
  });

  it("returns a readable delivery range error for unsupported regions", () => {
    expect(
      getAddressDeliveryRangeError(
        { city: "苏州市", province: "江苏省" },
        { deliveryCities: ["南京市"], deliveryProvinces: [] },
      ),
    ).toBe("该地区暂不配送，仅配送：南京市");
    expect(
      getAddressDeliveryRangeError(
        { city: "南京市", province: "江苏省" },
        { deliveryCities: ["南京市"], deliveryProvinces: [] },
      ),
    ).toBeNull();
    expect(formatDeliveryRangeText({})).toBe("全国不限");
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

  it("builds filtered region picker columns from delivery range", () => {
    const deliveryRange = {
      deliveryCities: [],
      deliveryProvinces: ["江苏省", "上海市", "浙江省"],
    };
    const model = buildAddressRegionMultiPickerModel(
      {
        city: "",
        district: "",
        province: "",
      },
      deliveryRange,
    );

    expect(model.range[0]).toEqual(
      expect.arrayContaining(["江苏省", "上海市", "浙江省"]),
    );
    expect(model.range[0]).not.toContain("福建省");
    const jiangsuIndex = model.range[0].indexOf("江苏省");
    const parsed = parseAddressRegionMultiPickerValue(
      [jiangsuIndex, 0, 0],
      deliveryRange,
    );
    const jiangsuModel = buildAddressRegionMultiPickerModel(parsed, deliveryRange);
    expect(jiangsuModel.range[1]).toContain("南京市");
    expect(jiangsuModel.range[2]).toContain("玄武区");
    expect(parsed).toEqual({
      city: "南京市",
      district: "玄武区",
      province: "江苏省",
    });
  });

  it("resets city and district when a region picker parent column changes", () => {
    expect(
      parseAddressRegionMultiPickerColumnChange({
        column: 0,
        current: {
          city: "南京市",
          district: "六合区",
          province: "江苏省",
        },
        deliveryRange: {
          deliveryCities: [],
          deliveryProvinces: ["江苏省", "浙江省"],
        },
        value: 1,
      }),
    ).toMatchObject({
      city: "杭州市",
      province: "浙江省",
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
