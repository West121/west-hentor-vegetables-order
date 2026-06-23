package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.config.Kuaidi100Properties;
import cn.hentor.vegetables.dto.Kuaidi100PrintResultDto;
import cn.hentor.vegetables.dto.Kuaidi100PrintTaskDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class Kuaidi100Service {
  private static final String LABEL_ORDER_URL = "https://api.kuaidi100.com/label/order";

  private final HttpClient httpClient = HttpClient
    .newBuilder()
    .connectTimeout(Duration.ofSeconds(10))
    .build();
  private final ObjectMapper objectMapper;
  private final Kuaidi100Properties properties;

  public Kuaidi100Service(ObjectMapper objectMapper, Kuaidi100Properties properties) {
    this.objectMapper = objectMapper;
    this.properties = properties;
  }

  record SignedCloudPrintRequest(URI uri, String param, String sign, String timestamp) {}

  public List<String> missingConfig() {
    List<String> missing = new ArrayList<>();
    if (!StringUtils.hasText(properties.getKey())) {
      missing.add("KUAIDI100_KEY");
    }
    if (!StringUtils.hasText(properties.getSecret())) {
      missing.add("KUAIDI100_SECRET");
    }
    if (!StringUtils.hasText(properties.getPartnerId())) {
      missing.add("KUAIDI100_PARTNER_ID");
    }
    if (!StringUtils.hasText(properties.getPartnerKey())) {
      missing.add("KUAIDI100_PARTNER_KEY");
    }
    if (!StringUtils.hasText(properties.getCode())) {
      missing.add("KUAIDI100_CODE");
    }
    if (!StringUtils.hasText(properties.getTempId())) {
      missing.add("KUAIDI100_TEMP_ID");
    }
    if (!StringUtils.hasText(properties.getSiid())) {
      missing.add("KUAIDI100_SIID");
    }
    return missing;
  }

  public Kuaidi100PrintResultDto submitCloudPrint(Kuaidi100PrintTaskDto task) {
    List<String> missing = missingConfig();
    if (!missing.isEmpty()) {
      throw new ApiException(
        "KUAIDI100_CONFIG_MISSING",
        "快递100配置缺失：" + String.join(", ", missing),
        HttpStatus.BAD_REQUEST
      );
    }

    try {
      SignedCloudPrintRequest signedRequest = buildSignedRequest(
        task,
        Long.toString(System.currentTimeMillis())
      );
      HttpRequest request = HttpRequest
        .newBuilder(signedRequest.uri())
        .POST(HttpRequest.BodyPublishers.noBody())
        .build();
      HttpResponse<String> response = httpClient.send(
        request,
        HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
      );

      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        throw new ApiException(
          "KUAIDI100_REQUEST_FAILED",
          "快递100请求失败：HTTP " + response.statusCode(),
          HttpStatus.BAD_GATEWAY
        );
      }

      JsonNode payload = objectMapper.readTree(response.body());
      String kuaidinum = payload.path("data").path("kuaidinum").asText("");
      if (!payload.path("success").asBoolean(false) || !StringUtils.hasText(kuaidinum)) {
        String message = payload.path("message").asText("快递100电子面单创建失败");
        throw new ApiException("KUAIDI100_PRINT_FAILED", message, HttpStatus.BAD_GATEWAY);
      }

      return new Kuaidi100PrintResultDto(
        kuaidinum,
        payload,
        task.shipmentId(),
        payload.path("data").path("taskId").asText(null)
      );
    } catch (ApiException exception) {
      throw exception;
    } catch (IOException | InterruptedException exception) {
      if (exception instanceof InterruptedException) {
        Thread.currentThread().interrupt();
      }
      throw new ApiException(
        "KUAIDI100_REQUEST_FAILED",
        "快递100请求失败",
        HttpStatus.BAD_GATEWAY
      );
    }
  }

  SignedCloudPrintRequest buildSignedRequest(
    Kuaidi100PrintTaskDto task,
    String timestamp
  ) throws IOException {
    String param = objectMapper.writeValueAsString(buildParam(task));
    String sign = md5Upper(param + timestamp + properties.getKey() + properties.getSecret());
    URI uri = URI.create(LABEL_ORDER_URL + "?" + formBody(Map.of(
      "key",
      properties.getKey(),
      "method",
      "order",
      "param",
      param,
      "sign",
      sign,
      "t",
      timestamp
    )));
    return new SignedCloudPrintRequest(uri, param, sign, timestamp);
  }

  Map<String, Object> buildParam(Kuaidi100PrintTaskDto task) {
    return Map.ofEntries(
      Map.entry("cargo", task.cargo()),
      Map.entry("count", task.count()),
      Map.entry("backTempId", nullToBlank(properties.getBackTempId())),
      Map.entry("childTempId", nullToBlank(properties.getChildTempId())),
      Map.entry("code", nullToBlank(properties.getCode())),
      Map.entry("expType", nullToBlank(properties.getExpType())),
      Map.entry("kuaidicom", nullToBlank(properties.getKuaidicom())),
      Map.entry("needBack", nullToBlank(properties.getNeedBack())),
      Map.entry("needChild", nullToBlank(properties.getNeedChild())),
      Map.entry("needDesensitization", properties.isNeedDesensitization()),
      Map.entry("needLogo", properties.isNeedLogo()),
      Map.entry("needOcr", properties.isNeedOcr()),
      Map.entry("orderId", task.orderNo() + "-" + lastEight(task.shipmentId())),
      Map.entry("partnerId", nullToBlank(properties.getPartnerId())),
      Map.entry("partnerKey", nullToBlank(properties.getPartnerKey())),
      Map.entry("payType", nullToBlank(properties.getPayType())),
      Map.entry("printType", "CLOUD"),
      Map.entry("recMan", Map.of(
        "company",
        "",
        "mobile",
        task.receiverMobile(),
        "name",
        task.receiverName(),
        "printAddr",
        task.receiverAddress()
      )),
      Map.entry("remark", nullToBlank(task.remark())),
      Map.entry("sendMan", Map.of(
        "company",
        nullToBlank(properties.getSenderCompany()),
        "mobile",
        task.senderMobile(),
        "name",
        task.senderName(),
        "printAddr",
        task.senderAddress()
      )),
      Map.entry("siid", nullToBlank(properties.getSiid())),
      Map.entry("tempId", nullToBlank(properties.getTempId())),
      Map.entry("weight", task.weightKg())
    );
  }

  private String formBody(Map<String, String> values) {
    return values
      .entrySet()
      .stream()
      .map(entry ->
        urlEncode(entry.getKey()) + "=" + urlEncode(entry.getValue())
      )
      .reduce((left, right) -> left + "&" + right)
      .orElse("");
  }

  String md5Upper(String value) {
    try {
      MessageDigest digest = MessageDigest.getInstance("MD5");
      return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8))).toUpperCase();
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("MD5 unavailable", exception);
    }
  }

  private String urlEncode(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }

  private String nullToBlank(String value) {
    return value == null ? "" : value;
  }

  private String lastEight(String value) {
    if (!StringUtils.hasText(value)) {
      return "";
    }
    String trimmed = value.trim();
    return trimmed.length() <= 8 ? trimmed : trimmed.substring(trimmed.length() - 8);
  }
}
