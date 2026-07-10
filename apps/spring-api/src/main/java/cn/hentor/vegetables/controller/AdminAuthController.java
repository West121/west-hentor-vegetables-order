package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.dto.AdminLoginRequest;
import cn.hentor.vegetables.dto.AdminPasswordChangeRequest;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.AdminWechatBindRequest;
import cn.hentor.vegetables.dto.AdminWechatStatusDto;
import cn.hentor.vegetables.config.AdminWechatLoginProperties;
import cn.hentor.vegetables.service.AdminAuthService;
import cn.hentor.vegetables.service.AdminWechatLoginService;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/spring/admin/auth")
public class AdminAuthController {
  private static final Duration SESSION_TTL = Duration.ofDays(7);
  private final AdminAuthService adminAuthService;
  private final AdminWechatLoginService adminWechatLoginService;
  private final AdminWechatLoginProperties adminWechatLoginProperties;
  private final String sessionCookieName;

  public AdminAuthController(
    AdminAuthService adminAuthService,
    AdminWechatLoginService adminWechatLoginService,
    AdminWechatLoginProperties adminWechatLoginProperties,
    @Value("${hentor.admin.session-cookie-name:${ADMIN_SESSION_COOKIE_NAME:hentor_spring_admin_session}}")
    String sessionCookieName
  ) {
    this.adminAuthService = adminAuthService;
    this.adminWechatLoginService = adminWechatLoginService;
    this.adminWechatLoginProperties = adminWechatLoginProperties;
    this.sessionCookieName = sessionCookieName;
  }

  @PostMapping("/login")
  public ApiResponse<AdminSessionDto> login(
    @Valid @RequestBody AdminLoginRequest request,
    HttpServletResponse response
  ) {
    AdminSessionDto session = adminAuthService.login(request);
    response.addHeader(HttpHeaders.SET_COOKIE, sessionCookie(session.token(), SESSION_TTL).toString());
    return ApiResponse.ok(session);
  }

  @GetMapping("/me")
  public ApiResponse<AdminSessionDto> me(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    return ApiResponse.ok(adminAuthService.getSession(resolveToken(authorization, tokenHeader, tokenCookie)));
  }

  @PostMapping("/logout")
  public ApiResponse<Void> logout(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie,
    HttpServletResponse response
  ) {
    adminAuthService.logout(resolveToken(authorization, tokenHeader, tokenCookie));
    response.addHeader(HttpHeaders.SET_COOKIE, sessionCookie("", Duration.ZERO).toString());
    return ApiResponse.ok(null);
  }

  @PostMapping("/password")
  public ApiResponse<Void> changePassword(
    @Valid @RequestBody AdminPasswordChangeRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = adminAuthService.getSession(resolveToken(authorization, tokenHeader, tokenCookie));
    adminAuthService.changePassword(session, request);
    return ApiResponse.ok(null);
  }

  @GetMapping("/wechat/status")
  public ApiResponse<AdminWechatStatusDto> wechatStatus() {
    return ApiResponse.ok(adminWechatLoginService.status());
  }

  @GetMapping("/wechat/start")
  public void startWechatLogin(HttpServletResponse response) throws IOException {
    response.sendRedirect(adminWechatLoginService.startAuthorization());
  }

  @GetMapping("/wechat/callback")
  public void wechatCallback(
    @RequestParam(value = "code", required = false) String code,
    @RequestParam(value = "state", required = false) String state,
    HttpServletResponse response
  ) throws IOException {
    try {
      AdminWechatLoginService.AdminWechatLoginResult result = adminWechatLoginService.complete(code, state);
      if (result.requiresBinding()) {
        redirect(response, frontendRedirect("/login?wechatBindToken=" + encode(result.bindToken())));
        return;
      }
      response.addHeader(HttpHeaders.SET_COOKIE, sessionCookie(result.session().token(), SESSION_TTL).toString());
      redirect(response, frontendRedirect("/"));
    } catch (RuntimeException exception) {
      String message = exception instanceof cn.hentor.vegetables.common.ApiException apiException
        ? apiException.getMessage()
        : "微信登录失败，请稍后重试";
      redirect(response, frontendRedirect("/login?wechatError=" + encode(message)));
    }
  }

  @PostMapping("/wechat/bind")
  public ApiResponse<AdminSessionDto> bindWechat(
    @Valid @RequestBody AdminWechatBindRequest request,
    HttpServletResponse response
  ) {
    AdminSessionDto session = adminWechatLoginService.bind(
      request.bindToken(),
      request.username(),
      request.password()
    );
    response.addHeader(HttpHeaders.SET_COOKIE, sessionCookie(session.token(), SESSION_TTL).toString());
    return ApiResponse.ok(session);
  }

  private void redirect(HttpServletResponse response, String location) throws IOException {
    response.sendRedirect(location);
  }

  private String encode(String value) {
    return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
  }

  private String frontendRedirect(String path) {
    String callback = adminWechatLoginProperties.getRedirectUri();
    if (!StringUtils.hasText(callback)) {
      return path;
    }
    URI uri = URI.create(callback);
    return uri.getScheme() + "://" + uri.getRawAuthority() + path;
  }

  private String resolveToken(String authorization, String tokenHeader, String tokenCookie) {
    if (StringUtils.hasText(authorization) && authorization.startsWith("Bearer ")) {
      return authorization.substring("Bearer ".length()).trim();
    }
    if (StringUtils.hasText(tokenHeader)) {
      return tokenHeader.trim();
    }
    return tokenCookie;
  }

  private ResponseCookie sessionCookie(String token, Duration maxAge) {
    return ResponseCookie
      .from(sessionCookieName, token)
      .httpOnly(true)
      .sameSite("Lax")
      .path("/")
      .maxAge(maxAge)
      .build();
  }
}
