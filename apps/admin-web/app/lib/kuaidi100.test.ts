import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getKuaidi100MissingConfig,
  submitKuaidi100CloudPrint,
} from "./kuaidi100";

describe("kuaidi100 electronic waybill client", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
  });

  it("keeps the legacy Kuaidi100 label/order contract used by Hyhyxcx", async () => {
    process.env.KUAIDI100_KEY = "k100-key";
    process.env.KUAIDI100_SECRET = "k100-secret";
    process.env.KUAIDI100_KUAIDICOM = "shunfeng";
    process.env.KUAIDI100_PARTNER_ID = "0255136562";
    process.env.KUAIDI100_PARTNER_KEY = "HTXXKZR28_KD100";
    process.env.KUAIDI100_CODE = "sf_secret";
    process.env.KUAIDI100_TEMP_ID = "fm_150_standard_SZQHBDWL";
    process.env.KUAIDI100_SIID = "KX100LA924FC3C289";
    process.env.KUAIDI100_EXP_TYPE = "标准快递";
    process.env.KUAIDI100_PAY_TYPE = "SHIPPER";
    process.env.KUAIDI100_SENDER_COMPANY = "涵氧生态";

    let requestedUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: URL | string, init?: RequestInit) => {
        requestedUrl = String(input);
        expect(init?.method).toBe("POST");
        expect(init?.body).toBeUndefined();
        return Response.json({
          data: {
            kuaidinum: "SF3190177140480",
            taskId: "task-001",
          },
          success: true,
        });
      }),
    );

    const result = await submitKuaidi100CloudPrint({
      cargo: "8斤周套餐蔬菜；鸡蛋 1箱",
      count: "1",
      orderId: "order-id",
      orderNo: "OD202606230001",
      packageName: "蔬菜包裹",
      packageType: "VEGETABLE",
      receiverAddress: "江苏省南京市六合区龙池街道冠城大通",
      receiverMobile: "15295081992",
      receiverName: "张建国",
      remark: "配送前电话确认",
      senderAddress: "南京市六合区龙池现代农业园区",
      senderMobile: "13900001111",
      senderName: "莲花小区发货点",
      shipmentId: "shipment",
      weightKg: "4",
    });

    expect(result.kuaidinum).toBe("SF3190177140480");
    expect(result.taskId).toBe("task-001");

    const url = new URL(requestedUrl);
    expect(`${url.origin}${url.pathname}`).toBe("https://api.kuaidi100.com/label/order");
    expect(url.searchParams.get("key")).toBe("k100-key");
    expect(url.searchParams.get("method")).toBe("order");
    expect(url.searchParams.get("sign")).toMatch(/^[A-F0-9]{32}$/);
    expect(url.searchParams.get("t")).toMatch(/^\d+$/);

    const param = JSON.parse(url.searchParams.get("param") ?? "{}") as Record<
      string,
      unknown
    >;
    expect(param).toMatchObject({
      code: "sf_secret",
      expType: "标准快递",
      kuaidicom: "shunfeng",
      needLogo: true,
      payType: "SHIPPER",
      partnerId: "0255136562",
      partnerKey: "HTXXKZR28_KD100",
      printType: "CLOUD",
      siid: "KX100LA924FC3C289",
      tempId: "fm_150_standard_SZQHBDWL",
    });
    expect(param).not.toHaveProperty("tempid");
    expect(param).not.toHaveProperty("partnerSecret");
    expect(param).not.toHaveProperty("method");
    expect(param.recMan).toMatchObject({
      mobile: "15295081992",
      name: "张建国",
      printAddr: "江苏省南京市六合区龙池街道冠城大通",
    });
  });

  it("reports all required electronic waybill configuration fields", () => {
    delete process.env.KUAIDI100_KEY;
    delete process.env.KUAIDI100_SECRET;
    delete process.env.KUAIDI100_PARTNER_ID;
    delete process.env.KUAIDI100_PARTNER_KEY;
    delete process.env.KUAIDI100_CODE;
    delete process.env.KUAIDI100_TEMP_ID;
    delete process.env.KUAIDI100_SIID;

    expect(getKuaidi100MissingConfig()).toEqual([
      "KUAIDI100_KEY",
      "KUAIDI100_SECRET",
      "KUAIDI100_PARTNER_ID",
      "KUAIDI100_PARTNER_KEY",
      "KUAIDI100_CODE",
      "KUAIDI100_TEMP_ID",
      "KUAIDI100_SIID",
    ]);
  });
});
