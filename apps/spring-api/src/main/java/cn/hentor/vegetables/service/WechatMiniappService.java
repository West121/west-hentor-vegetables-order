package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.config.WechatMiniappProperties;
import cn.hentor.vegetables.dto.WechatLoginSessionDto;
import cn.hentor.vegetables.dto.WechatPhoneDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class WechatMiniappService {
  private final HttpClient httpClient = HttpClient
    .newBuilder()
    .connectTimeout(Duration.ofSeconds(10))
    .build();
  private final ObjectMapper objectMapper;
  private final WechatMiniappProperties properties;

  public WechatMiniappService(ObjectMapper objectMapper, WechatMiniappProperties properties) {
    this.objectMapper = objectMapper;
    this.properties = properties;
  }

  public WechatLoginSessionDto exchangeLoginCode(String code) {
    requireConfig();
    URI uri = buildUri(
      "/sns/jscode2session",
      Map.of(
        "appid", properties.getAppId(),
        "secret", properties.getAppSecret(),
        "js_code", code,
        "grant_type", "authorization_code"
      )
    );
    JsonNode payload = get(uri);
    String openid = payload.path("openid").asText("");
    if (!StringUtils.hasText(openid)) {
      throw new ApiException("WECHAT_LOGIN_FAILED", "微信登录失败，请稍后重试", HttpStatus.BAD_GATEWAY);
    }
    return new WechatLoginSessionDto(openid, blankToNull(payload.path("unionid").asText(null)));
  }

  public WechatPhoneDto exchangePhoneCode(String code) {
    String accessToken = getAccessToken();
    URI uri = buildUri("/wxa/business/getuserphonenumber", Map.of("access_token", accessToken));
    JsonNode payload = postJson(uri, Map.of("code", code));
    JsonNode phoneInfo = payload.path("phone_info");
    String phone = phoneInfo.path("purePhoneNumber").asText("");
    if (!StringUtils.hasText(phone)) {
      phone = phoneInfo.path("phoneNumber").asText("");
    }
    if (!StringUtils.hasText(phone)) {
      throw new ApiException("WECHAT_PHONE_FAILED", "手机号授权失败，请稍后重试", HttpStatus.BAD_GATEWAY);
    }
    return new WechatPhoneDto(phone, blankToNull(phoneInfo.path("countryCode").asText(null)));
  }

  private String getAccessToken() {
    requireConfig();
    URI uri = buildUri(
      "/cgi-bin/token",
      Map.of(
        "grant_type", "client_credential",
        "appid", properties.getAppId(),
        "secret", properties.getAppSecret()
      )
    );
    JsonNode payload = get(uri);
    String accessToken = payload.path("access_token").asText("");
    if (!StringUtils.hasText(accessToken)) {
      throw new ApiException("WECHAT_LOGIN_FAILED", "微信登录失败，请稍后重试", HttpStatus.BAD_GATEWAY);
    }
    return accessToken;
  }

  private void requireConfig() {
    if (!StringUtils.hasText(properties.getAppId()) || !StringUtils.hasText(properties.getAppSecret())) {
      throw new ApiException(
        "WECHAT_CONFIG_REQUIRED",
        "请先配置 WECHAT_APP_ID 和 WECHAT_APP_SECRET，才能启用真实微信登录",
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  private JsonNode get(URI uri) {
    HttpRequest request = HttpRequest.newBuilder(uri).GET().build();
    return send(request);
  }

  private JsonNode postJson(URI uri, Object body) {
    try {
      HttpRequest request = HttpRequest
        .newBuilder(uri)
        .header("content-type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body), StandardCharsets.UTF_8))
        .build();
      return send(request);
    } catch (IOException exception) {
      throw new ApiException("WECHAT_LOGIN_FAILED", "微信登录失败，请稍后重试", HttpStatus.BAD_GATEWAY);
    }
  }

  private JsonNode send(HttpRequest request) {
    try {
      HttpResponse<String> response = httpClient.send(
        request,
        HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
      );
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        throw new ApiException("WECHAT_LOGIN_FAILED", "微信登录失败，请稍后重试", HttpStatus.BAD_GATEWAY);
      }
      JsonNode payload = objectMapper.readTree(response.body());
      if (payload.path("errcode").asInt(0) != 0) {
        throw new ApiException("WECHAT_LOGIN_FAILED", "微信登录失败，请稍后重试", HttpStatus.BAD_GATEWAY);
      }
      return payload;
    } catch (ApiException exception) {
      throw exception;
    } catch (IOException | InterruptedException exception) {
      if (exception instanceof InterruptedException) {
        Thread.currentThread().interrupt();
      }
      throw new ApiException("WECHAT_LOGIN_FAILED", "微信登录失败，请稍后重试", HttpStatus.BAD_GATEWAY);
    }
  }

  private URI buildUri(String path, Map<String, String> params) {
    String baseUrl = StringUtils.hasText(properties.getApiBaseUrl())
      ? properties.getApiBaseUrl().replaceAll("/+$", "")
      : "https://api.weixin.qq.com";
    StringBuilder builder = new StringBuilder(baseUrl).append(path).append("?");
    params.forEach((key, value) -> {
      if (builder.charAt(builder.length() - 1) != '?') {
        builder.append("&");
      }
      builder
        .append(urlEncode(key))
        .append("=")
        .append(urlEncode(value));
    });
    return URI.create(builder.toString());
  }

  private String urlEncode(String value) {
    return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
  }

  private String blankToNull(String value) {
    return StringUtils.hasText(value) ? value : null;
  }
}
