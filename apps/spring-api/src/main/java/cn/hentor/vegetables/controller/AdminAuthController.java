package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.dto.AdminLoginRequest;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.service.AdminAuthService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/spring/admin/auth")
public class AdminAuthController {
  private static final Duration SESSION_TTL = Duration.ofDays(7);
  private final AdminAuthService adminAuthService;

  public AdminAuthController(AdminAuthService adminAuthService) {
    this.adminAuthService = adminAuthService;
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
      .from(AdminAuthService.SESSION_COOKIE, token)
      .httpOnly(true)
      .sameSite("Lax")
      .path("/")
      .maxAge(maxAge)
      .build();
  }
}
