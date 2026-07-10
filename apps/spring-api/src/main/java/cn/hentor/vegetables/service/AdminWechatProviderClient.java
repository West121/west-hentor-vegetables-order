package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.config.AdminWechatLoginProperties;
import cn.hentor.vegetables.dto.WechatLoginSessionDto;
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
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class AdminWechatProviderClient {
  private final HttpClient httpClient = HttpClient.newBuilder()
    .connectTimeout(Duration.ofSeconds(10))
    .build();
  private final ObjectMapper objectMapper;
  private final AdminWechatLoginProperties properties;

  public AdminWechatProviderClient(ObjectMapper objectMapper, AdminWechatLoginProperties properties) {
    this.objectMapper = objectMapper;
    this.properties = properties;
  }

  public String authorizationUrl(String state) {
    if (properties.isMockEnabled()) {
      String callback = StringUtils.hasText(properties.getRedirectUri())
        ? properties.getRedirectUri()
        : "/api/spring/admin/auth/wechat/callback";
      return callback + "?code=mock-code&state=" + encode(state);
    }
    requireRealConfig();
    Map<String, String> params = new LinkedHashMap<>();
    params.put("appid", properties.getAppId());
    params.put("redirect_uri", properties.getRedirectUri());
    params.put("response_type", "code");
    params.put("scope", "snsapi_login");
    params.put("state", state);
    return properties.getAuthorizationUrl() + "?" + query(params) + "#wechat_redirect";
  }

  public WechatLoginSessionDto exchangeCode(String code) {
    if (properties.isMockEnabled() && "mock-code".equals(code)) {
      return new WechatLoginSessionDto(properties.getMockOpenid(), properties.getMockUnionid());
    }
    requireRealConfig();
    URI uri = URI.create(properties.getApiBaseUrl().replaceAll("/+$", "") + "/sns/oauth2/access_token?" + query(Map.of(
      "appid", properties.getAppId(),
      "secret", properties.getAppSecret(),
      "code", code,
      "grant_type", "authorization_code"
    )));
    try {
      HttpResponse<String> response = httpClient.send(
        HttpRequest.newBuilder(uri).GET().build(),
        HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
      );
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        throw providerError();
      }
      JsonNode payload = objectMapper.readTree(response.body());
      if (payload.path("errcode").asInt(0) != 0 || !StringUtils.hasText(payload.path("openid").asText(""))) {
        throw providerError();
      }
      String unionid = payload.path("unionid").asText("");
      return new WechatLoginSessionDto(
        payload.path("openid").asText(),
        StringUtils.hasText(unionid) ? unionid : null
      );
    } catch (ApiException exception) {
      throw exception;
    } catch (IOException | InterruptedException exception) {
      if (exception instanceof InterruptedException) {
        Thread.currentThread().interrupt();
      }
      throw providerError();
    }
  }

  private void requireRealConfig() {
    if (!properties.isConfigured()) {
      throw new ApiException(
        "WECHAT_OPEN_CONFIG_REQUIRED",
        "微信网站应用尚未配置",
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  private ApiException providerError() {
    return new ApiException("WECHAT_OPEN_LOGIN_FAILED", "微信登录失败，请稍后重试", HttpStatus.BAD_GATEWAY);
  }

  private String query(Map<String, String> params) {
    return params.entrySet().stream()
      .map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue()))
      .reduce((left, right) -> left + "&" + right)
      .orElse("");
  }

  private String encode(String value) {
    return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
  }
}
