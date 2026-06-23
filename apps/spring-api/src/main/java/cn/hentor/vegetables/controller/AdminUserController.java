package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.AdminUserCreateRequest;
import cn.hentor.vegetables.dto.AdminUserListResponse;
import cn.hentor.vegetables.dto.AdminUserPasswordRequest;
import cn.hentor.vegetables.dto.AdminUserResponse;
import cn.hentor.vegetables.dto.AdminUserUpdateRequest;
import cn.hentor.vegetables.service.AdminAuthService;
import cn.hentor.vegetables.service.SystemManagementService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/spring/admin/admin-users")
public class AdminUserController {
  private final AdminAuthService adminAuthService;
  private final SystemManagementService systemManagementService;

  public AdminUserController(
    AdminAuthService adminAuthService,
    SystemManagementService systemManagementService
  ) {
    this.adminAuthService = adminAuthService;
    this.systemManagementService = systemManagementService;
  }

  @GetMapping
  public ApiResponse<AdminUserListResponse> list(
    @RequestParam(required = false) String query,
    @RequestParam(required = false) String status,
    @RequestParam(required = false) String storeId,
    @RequestParam(defaultValue = "1") long page,
    @RequestParam(defaultValue = "20") long pageSize,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "system.manage");
    return ApiResponse.ok(systemManagementService.listAdminUsers(
      session,
      query,
      status,
      storeId,
      page,
      pageSize
    ));
  }

  @PostMapping
  public ApiResponse<AdminUserResponse> create(
    @Valid @RequestBody AdminUserCreateRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "system.manage");
    return ApiResponse.ok(systemManagementService.createAdminUser(session, request));
  }

  @GetMapping("/{adminUserId}")
  public ApiResponse<AdminUserResponse> get(
    @PathVariable String adminUserId,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    return ApiResponse.ok(systemManagementService.getAdminUser(session, adminUserId));
  }

  @PatchMapping("/{adminUserId}")
  public ApiResponse<AdminUserResponse> update(
    @PathVariable String adminUserId,
    @Valid @RequestBody AdminUserUpdateRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "system.manage");
    return ApiResponse.ok(systemManagementService.updateAdminUser(session, adminUserId, request));
  }

  @PutMapping("/{adminUserId}")
  public ApiResponse<AdminUserResponse> put(
    @PathVariable String adminUserId,
    @Valid @RequestBody AdminUserUpdateRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    return update(adminUserId, request, authorization, tokenHeader, tokenCookie);
  }

  @PostMapping("/{adminUserId}/password")
  public ApiResponse<AdminUserResponse> resetPassword(
    @PathVariable String adminUserId,
    @Valid @RequestBody AdminUserPasswordRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "system.manage");
    return ApiResponse.ok(systemManagementService.resetAdminUserPassword(session, adminUserId, request));
  }

  private AdminSessionDto requireSession(String authorization, String tokenHeader, String tokenCookie) {
    return adminAuthService.getSession(resolveToken(authorization, tokenHeader, tokenCookie));
  }

  private void requirePermission(AdminSessionDto session, String permission) {
    if (!session.permissionCodes().contains(permission)) {
      throw new ApiException("FORBIDDEN", "没有操作权限", HttpStatus.FORBIDDEN);
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
