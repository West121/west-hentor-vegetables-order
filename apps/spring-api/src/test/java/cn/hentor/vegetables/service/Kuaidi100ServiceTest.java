package cn.hentor.vegetables.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import cn.hentor.vegetables.config.Kuaidi100Properties;
import cn.hentor.vegetables.dto.Kuaidi100PrintConfig;
import cn.hentor.vegetables.dto.Kuaidi100PrintTaskDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class Kuaidi100ServiceTest {
  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  void missingConfigReportsRequiredCloudPrintFields() {
    Kuaidi100Service service = new Kuaidi100Service(objectMapper, new Kuaidi100Properties());

    assertEquals(
      List.of(
        "KUAIDI100_KEY",
        "KUAIDI100_SECRET",
        "KUAIDI100_PARTNER_ID",
        "KUAIDI100_PARTNER_KEY",
        "KUAIDI100_CODE",
        "KUAIDI100_TEMP_ID",
        "KUAIDI100_SIID"
      ),
      service.missingConfig()
    );
  }

  @Test
  void buildParamKeepsKuaidi100CloudPrintContract() {
    Kuaidi100Service service = new Kuaidi100Service(objectMapper, configuredProperties());
    Map<String, Object> param = service.buildParam(printTask());

    assertEquals("shunfeng", param.get("kuaidicom"));
    assertEquals("SHIPPER", param.get("payType"));
    assertEquals("顺丰标快", param.get("expType"));
    assertEquals("sf_secret", param.get("code"));
    assertEquals("CLOUD", param.get("printType"));
    assertEquals(true, param.get("needLogo"));
    assertEquals(false, param.get("needOcr"));
    assertEquals(false, param.get("needDesensitization"));
    assertEquals("SF_MONTHLY", param.get("partnerId"));
    assertEquals("customer-code", param.get("partnerKey"));
    assertEquals("template-001", param.get("tempId"));
    assertEquals("printer-siid", param.get("siid"));
    assertEquals("8斤周套餐蔬菜；鸡蛋 1箱", param.get("cargo"));
    assertEquals("OD202606230001-shipment", param.get("orderId"));

    Map<?, ?> recMan = (Map<?, ?>) param.get("recMan");
    assertEquals("张建国", recMan.get("name"));
    assertEquals("15295081992", recMan.get("mobile"));
    assertEquals("江苏省南京市六合区龙池街道冠城大通", recMan.get("printAddr"));

    Map<?, ?> sendMan = (Map<?, ?>) param.get("sendMan");
    assertEquals("莲花小区发货点", sendMan.get("name"));
    assertEquals("13900001111", sendMan.get("mobile"));
    assertEquals("南京市六合区龙池现代农业园区", sendMan.get("printAddr"));
    assertEquals("涵氧生态", sendMan.get("company"));
  }

  @Test
  void buildSignedRequestUsesOfficialMd5ParamTimestampKeySecretOrder() throws Exception {
    Kuaidi100Properties properties = configuredProperties();
    Kuaidi100Service service = new Kuaidi100Service(objectMapper, properties);
    Kuaidi100Service.SignedCloudPrintRequest request =
      service.buildSignedRequest(printTask(), "1700000000000");

    String expectedSign = md5Upper(
      request.param() + request.timestamp() + properties.getKey() + properties.getSecret()
    );
    assertEquals(expectedSign, request.sign());
    String requestUri = request.uri().toString();
    assertTrue(requestUri.startsWith("https://api.kuaidi100.com/label/order?"));
    assertTrue(requestUri.contains("method=order"));
    assertTrue(requestUri.contains("key=k100-key"));
    assertTrue(requestUri.contains("t=1700000000000"));
    assertTrue(
      requestUri.contains("sign=" + URLEncoder.encode(expectedSign, StandardCharsets.UTF_8))
    );

    JsonNode param = objectMapper.readTree(request.param());
    assertEquals("OD202606230001-shipment", param.path("orderId").asText());
    assertEquals("printer-siid", param.path("siid").asText());
    assertEquals("template-001", param.path("tempId").asText());
    assertEquals("sf_secret", param.path("code").asText());
    assertEquals("CLOUD", param.path("printType").asText());
    assertEquals(
      "江苏省南京市六合区龙池街道冠城大通",
      param.path("recMan").path("printAddr").asText()
    );
  }

  @Test
  void printerConfigOverridesCloudPrintRequestFields() {
    Kuaidi100Service service = new Kuaidi100Service(objectMapper, configuredProperties());
    Kuaidi100PrintConfig printerConfig = new Kuaidi100PrintConfig(
      "",
      "",
      "printer-code",
      "顺丰即日",
      "printer-key",
      "shunfeng",
      "0",
      "0",
      false,
      true,
      false,
      "printer-partner",
      "printer-partner-key",
      "SHIPPER",
      "printer-id",
      "前台热敏打印机",
      Map.of("type", "10"),
      "printer-secret",
      "南京市六合区打印机发货仓",
      "涵氧生态",
      "18800002222",
      "printer-siid-02",
      "template-002"
    );

    Map<String, Object> param = service.buildParam(printTask(), printerConfig);

    assertEquals("printer-code", param.get("code"));
    assertEquals("printer-partner", param.get("partnerId"));
    assertEquals("printer-partner-key", param.get("partnerKey"));
    assertEquals("printer-siid-02", param.get("siid"));
    assertEquals("template-002", param.get("tempId"));
    assertEquals("10", param.get("type"));
    Map<?, ?> sendMan = (Map<?, ?>) param.get("sendMan");
    assertEquals("南京市六合区打印机发货仓", sendMan.get("printAddr"));
    assertEquals("18800002222", sendMan.get("mobile"));
  }

  private Kuaidi100Properties configuredProperties() {
    Kuaidi100Properties properties = new Kuaidi100Properties();
    properties.setKey("k100-key");
    properties.setSecret("k100-secret");
    properties.setPartnerId("SF_MONTHLY");
    properties.setPartnerKey("customer-code");
    properties.setCode("sf_secret");
    properties.setPartnerSecret("sf-secret");
    properties.setPartnerName("涵氧生态");
    properties.setKuaidicom("shunfeng");
    properties.setExpType("顺丰标快");
    properties.setTempId("template-001");
    properties.setSiid("printer-siid");
    properties.setSenderCompany("涵氧生态");
    return properties;
  }

  private Kuaidi100PrintTaskDto printTask() {
    return new Kuaidi100PrintTaskDto(
      "8斤周套餐蔬菜；鸡蛋 1箱",
      "1",
      "order-id",
      "OD202606230001",
      "蔬菜包裹",
      "VEGETABLE",
      "江苏省南京市六合区龙池街道冠城大通",
      "15295081992",
      "张建国",
      "配送前电话确认",
      "南京市六合区龙池现代农业园区",
      "13900001111",
      "莲花小区发货点",
      "shipment",
      "4"
    );
  }

  private String md5Upper(String value) throws Exception {
    MessageDigest digest = MessageDigest.getInstance("MD5");
    return HexFormat
      .of()
      .formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)))
      .toUpperCase();
  }
}
