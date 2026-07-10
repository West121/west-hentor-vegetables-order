package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.OnlineSessionKickResponse;
import cn.hentor.vegetables.dto.OnlineSessionListResponse;
import cn.hentor.vegetables.service.AdminAuthService;
import cn.hentor.vegetables.service.OnlineSessionService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/spring/admin/online-sessions")
public class OnlineSessionController {
  private final AdminAuthService adminAuthService;
  private final OnlineSessionService onlineSessionService;

  public OnlineSessionController(
    AdminAuthService adminAuthService,
    OnlineSessionService onlineSessionService
  ) {
    this.adminAuthService = adminAuthService;
    this.onlineSessionService = onlineSessionService;
  }

  @GetMapping
  public ApiResponse<OnlineSessionListResponse> list(
    @RequestParam(value = "type", required = false) String type,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireAdminSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "system.manage");
    return ApiResponse.ok(onlineSessionService.list(session, type));
  }

  @DeleteMapping("/{sessionId}")
  public ApiResponse<OnlineSessionKickResponse> kick(
    @PathVariable String sessionId,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireAdminSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "system.manage");
    return ApiResponse.ok(onlineSessionService.kick(sessionId));
  }

  private AdminSessionDto requireAdminSession(String authorization, String tokenHeader, String tokenCookie) {
    return adminAuthService.getSession(resolveToken(authorization, tokenHeader, tokenCookie));
  }

  private void requirePermission(AdminSessionDto session, String permission) {
    if (!session.permissionCodes().contains(permission)) {
      throw new ApiException("FORBIDDEN", "无权访问当前功能", HttpStatus.FORBIDDEN);
    }
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
}
