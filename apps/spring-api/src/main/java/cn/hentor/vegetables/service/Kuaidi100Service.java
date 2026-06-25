package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.config.Kuaidi100Properties;
import cn.hentor.vegetables.dto.Kuaidi100PrintConfig;
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
import java.util.LinkedHashMap;
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
    return missingConfig(defaultConfig());
  }

  public List<String> missingConfig(Kuaidi100PrintConfig config) {
    List<String> missing = new ArrayList<>();
    if (!StringUtils.hasText(config.key())) {
      missing.add("KUAIDI100_KEY");
    }
    if (!StringUtils.hasText(config.secret())) {
      missing.add("KUAIDI100_SECRET");
    }
    if (!StringUtils.hasText(config.partnerId())) {
      missing.add("KUAIDI100_PARTNER_ID");
    }
    if (!StringUtils.hasText(config.partnerKey())) {
      missing.add("KUAIDI100_PARTNER_KEY");
    }
    if (!StringUtils.hasText(config.code())) {
      missing.add("KUAIDI100_CODE");
    }
    if (!StringUtils.hasText(config.tempId())) {
      missing.add("KUAIDI100_TEMP_ID");
    }
    if (!StringUtils.hasText(config.siid())) {
      missing.add("KUAIDI100_SIID");
    }
    return missing;
  }

  public Kuaidi100PrintResultDto submitCloudPrint(Kuaidi100PrintTaskDto task) {
    return submitCloudPrint(task, defaultConfig());
  }

  public Kuaidi100PrintResultDto submitCloudPrint(
    Kuaidi100PrintTaskDto task,
    Kuaidi100PrintConfig config
  ) {
    List<String> missing = missingConfig(config);
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
        Long.toString(System.currentTimeMillis()),
        config
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
    return buildSignedRequest(task, timestamp, defaultConfig());
  }

  SignedCloudPrintRequest buildSignedRequest(
    Kuaidi100PrintTaskDto task,
    String timestamp,
    Kuaidi100PrintConfig config
  ) throws IOException {
    String param = objectMapper.writeValueAsString(buildParam(task, config));
    String sign = md5Upper(param + timestamp + config.key() + config.secret());
    URI uri = URI.create(LABEL_ORDER_URL + "?" + formBody(Map.of(
      "key",
      config.key(),
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
    return buildParam(task, defaultConfig());
  }

  Map<String, Object> buildParam(Kuaidi100PrintTaskDto task, Kuaidi100PrintConfig config) {
    Map<String, Object> param = new LinkedHashMap<>();
    param.put("cargo", task.cargo());
    param.put("count", task.count());
    param.put("backTempId", nullToBlank(config.backTempId()));
    param.put("childTempId", nullToBlank(config.childTempId()));
    param.put("code", nullToBlank(config.code()));
    param.put("expType", nullToBlank(config.expType()));
    param.put("kuaidicom", nullToBlank(config.kuaidicom()));
    param.put("needBack", nullToBlank(config.needBack()));
    param.put("needChild", nullToBlank(config.needChild()));
    param.put("needDesensitization", config.needDesensitization());
    param.put("needLogo", config.needLogo());
    param.put("needOcr", config.needOcr());
    param.put("orderId", task.orderNo() + "-" + lastEight(task.shipmentId()));
    param.put("partnerId", nullToBlank(config.partnerId()));
    param.put("partnerKey", nullToBlank(config.partnerKey()));
    param.put("payType", nullToBlank(config.payType()));
    param.put("printType", "CLOUD");
    param.put("recMan", Map.of(
      "company",
      "",
      "mobile",
      task.receiverMobile(),
      "name",
      task.receiverName(),
      "printAddr",
      task.receiverAddress()
    ));
    param.put("remark", nullToBlank(task.remark()));
    param.put("sendMan", Map.of(
      "company",
      nullToBlank(config.senderCompany()),
      "mobile",
      task.senderMobile(),
      "name",
      task.senderName(),
      "printAddr",
      task.senderAddress()
    ));
    param.put("siid", nullToBlank(config.siid()));
    param.put("tempId", nullToBlank(config.tempId()));
    param.put("weight", task.weightKg());
    if (config.requestParams() != null) {
      config.requestParams().forEach((key, value) -> {
        if (StringUtils.hasText(key) && value != null) {
          param.put(key, value);
        }
      });
    }
    return param;
  }

  private Kuaidi100PrintConfig defaultConfig() {
    return new Kuaidi100PrintConfig(
      properties.getBackTempId(),
      properties.getChildTempId(),
      properties.getCode(),
      properties.getExpType(),
      properties.getKey(),
      properties.getKuaidicom(),
      properties.getNeedBack(),
      properties.getNeedChild(),
      properties.isNeedDesensitization(),
      properties.isNeedLogo(),
      properties.isNeedOcr(),
      properties.getPartnerId(),
      properties.getPartnerKey(),
      properties.getPayType(),
      null,
      "环境变量默认打印机",
      Map.of(),
      properties.getSecret(),
      properties.getSenderCompany(),
      properties.getSiid(),
      properties.getTempId()
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
