package cn.hentor.vegetables.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@ConfigurationProperties(prefix = "wechat.open")
public class AdminWechatLoginProperties {
  private String appId = "";
  private String appSecret = "";
  private String redirectUri = "";
  private String authorizationUrl = "https://open.weixin.qq.com/connect/qrconnect";
  private String apiBaseUrl = "https://api.weixin.qq.com";
  private boolean mockEnabled = false;
  private String mockOpenid = "mock-admin-wechat";
  private String mockUnionid = "mock-admin-wechat-unionid";

  public boolean isConfigured() {
    return StringUtils.hasText(appId)
      && StringUtils.hasText(appSecret)
      && StringUtils.hasText(redirectUri);
  }

  public String getAppId() { return appId; }
  public void setAppId(String appId) { this.appId = appId; }
  public String getAppSecret() { return appSecret; }
  public void setAppSecret(String appSecret) { this.appSecret = appSecret; }
  public String getRedirectUri() { return redirectUri; }
  public void setRedirectUri(String redirectUri) { this.redirectUri = redirectUri; }
  public String getAuthorizationUrl() { return authorizationUrl; }
  public void setAuthorizationUrl(String authorizationUrl) { this.authorizationUrl = authorizationUrl; }
  public String getApiBaseUrl() { return apiBaseUrl; }
  public void setApiBaseUrl(String apiBaseUrl) { this.apiBaseUrl = apiBaseUrl; }
  public boolean isMockEnabled() { return mockEnabled; }
  public void setMockEnabled(boolean mockEnabled) { this.mockEnabled = mockEnabled; }
  public String getMockOpenid() { return mockOpenid; }
  public void setMockOpenid(String mockOpenid) { this.mockOpenid = mockOpenid; }
  public String getMockUnionid() { return mockUnionid; }
  public void setMockUnionid(String mockUnionid) { this.mockUnionid = mockUnionid; }
}
