package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.dto.AdminPermissionListResponse;
import cn.hentor.vegetables.dto.AdminRoleCreateRequest;
import cn.hentor.vegetables.dto.AdminRoleListResponse;
import cn.hentor.vegetables.dto.AdminRoleResponse;
import cn.hentor.vegetables.dto.AdminRoleUpdateRequest;
import cn.hentor.vegetables.dto.AdminSessionDto;
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
@RequestMapping("/api/spring/admin/roles")
public class AdminRoleController {
  private final AdminAuthService adminAuthService;
  private final SystemManagementService systemManagementService;

  public AdminRoleController(
    AdminAuthService adminAuthService,
    SystemManagementService systemManagementService
  ) {
    this.adminAuthService = adminAuthService;
    this.systemManagementService = systemManagementService;
  }

  @GetMapping
  public ApiResponse<AdminRoleListResponse> list(
    @RequestParam(required = false) String query,
    @RequestParam(defaultValue = "1") long page,
    @RequestParam(defaultValue = "20") long pageSize,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "system.manage");
    return ApiResponse.ok(systemManagementService.listAdminRoles(query, page, pageSize));
  }

  @GetMapping("/permissions")
  public ApiResponse<AdminPermissionListResponse> permissions(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "system.manage");
    return ApiResponse.ok(systemManagementService.listAdminPermissions());
  }

  @PostMapping
  public ApiResponse<AdminRoleResponse> create(
    @Valid @RequestBody AdminRoleCreateRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "system.manage");
    return ApiResponse.ok(systemManagementService.createAdminRole(session, request));
  }

  @PatchMapping("/{roleId}")
  public ApiResponse<AdminRoleResponse> update(
    @PathVariable String roleId,
    @Valid @RequestBody AdminRoleUpdateRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "system.manage");
    return ApiResponse.ok(systemManagementService.updateAdminRole(session, roleId, request));
  }

  @PutMapping("/{roleId}")
  public ApiResponse<AdminRoleResponse> put(
    @PathVariable String roleId,
    @Valid @RequestBody AdminRoleUpdateRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    return update(roleId, request, authorization, tokenHeader, tokenCookie);
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
