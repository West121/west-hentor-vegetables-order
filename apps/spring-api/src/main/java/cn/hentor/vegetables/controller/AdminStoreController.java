package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.FranchiseeListResponse;
import cn.hentor.vegetables.dto.FranchiseeRequest;
import cn.hentor.vegetables.dto.FranchiseeResponse;
import cn.hentor.vegetables.dto.StoreManagementListResponse;
import cn.hentor.vegetables.dto.StoreManagementRequest;
import cn.hentor.vegetables.dto.StoreManagementResponse;
import cn.hentor.vegetables.service.AdminAuthService;
import cn.hentor.vegetables.service.StoreManagementService;
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
public class AdminStoreController {
  private final AdminAuthService adminAuthService;
  private final StoreManagementService storeManagementService;

  public AdminStoreController(
    AdminAuthService adminAuthService,
    StoreManagementService storeManagementService
  ) {
    this.adminAuthService = adminAuthService;
    this.storeManagementService = storeManagementService;
  }

  @GetMapping("/api/spring/admin/stores")
  public ApiResponse<StoreManagementListResponse> listStores(
    @RequestParam(required = false) String query,
    @RequestParam(required = false) String status,
    @RequestParam(required = false) String type,
    @RequestParam(defaultValue = "1") long page,
    @RequestParam(defaultValue = "10") long pageSize,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "stores.manage");
    return ApiResponse.ok(storeManagementService.listStores(session, query, status, type, page, pageSize));
  }

  @PostMapping("/api/spring/admin/stores")
  public ApiResponse<StoreManagementResponse> createStore(
    @Valid @RequestBody StoreManagementRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "stores.manage");
    requireAllStoreScope(session);
    return ApiResponse.ok(storeManagementService.createStore(session, request));
  }

  @GetMapping("/api/spring/admin/stores/{storeId}")
  public ApiResponse<StoreManagementResponse> getStore(
    @PathVariable String storeId,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "stores.manage");
    requireAllStoreScope(session);
    return ApiResponse.ok(storeManagementService.getStore(storeId));
  }

  @PatchMapping("/api/spring/admin/stores/{storeId}")
  public ApiResponse<StoreManagementResponse> updateStore(
    @PathVariable String storeId,
    @Valid @RequestBody StoreManagementRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "stores.manage");
    requireAllStoreScope(session);
    return ApiResponse.ok(storeManagementService.updateStore(session, storeId, request));
  }

  @PutMapping("/api/spring/admin/stores/{storeId}")
  public ApiResponse<StoreManagementResponse> putStore(
    @PathVariable String storeId,
    @Valid @RequestBody StoreManagementRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    return updateStore(storeId, request, authorization, tokenHeader, tokenCookie);
  }

  @GetMapping("/api/spring/admin/franchisees")
  public ApiResponse<FranchiseeListResponse> listFranchisees(
    @RequestParam(required = false) String query,
    @RequestParam(required = false) String status,
    @RequestParam(defaultValue = "1") long page,
    @RequestParam(defaultValue = "10") long pageSize,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "stores.manage");
    requireAllStoreScope(session);
    return ApiResponse.ok(storeManagementService.listFranchisees(query, status, page, pageSize));
  }

  @PostMapping("/api/spring/admin/franchisees")
  public ApiResponse<FranchiseeResponse> createFranchisee(
    @Valid @RequestBody FranchiseeRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "stores.manage");
    requireAllStoreScope(session);
    return ApiResponse.ok(storeManagementService.createFranchisee(session, request));
  }

  @GetMapping("/api/spring/admin/franchisees/{franchiseeId}")
  public ApiResponse<FranchiseeResponse> getFranchisee(
    @PathVariable String franchiseeId,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "stores.manage");
    requireAllStoreScope(session);
    return ApiResponse.ok(storeManagementService.getFranchisee(franchiseeId));
  }

  @PatchMapping("/api/spring/admin/franchisees/{franchiseeId}")
  public ApiResponse<FranchiseeResponse> updateFranchisee(
    @PathVariable String franchiseeId,
    @Valid @RequestBody FranchiseeRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "stores.manage");
    requireAllStoreScope(session);
    return ApiResponse.ok(storeManagementService.updateFranchisee(session, franchiseeId, request));
  }

  @PutMapping("/api/spring/admin/franchisees/{franchiseeId}")
  public ApiResponse<FranchiseeResponse> putFranchisee(
    @PathVariable String franchiseeId,
    @Valid @RequestBody FranchiseeRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    return updateFranchisee(franchiseeId, request, authorization, tokenHeader, tokenCookie);
  }

  private AdminSessionDto requireSession(String authorization, String tokenHeader, String tokenCookie) {
    return adminAuthService.getSession(resolveToken(authorization, tokenHeader, tokenCookie));
  }

  private void requirePermission(AdminSessionDto session, String permission) {
    if (!session.permissionCodes().contains(permission)) {
      throw new ApiException("FORBIDDEN", "没有操作权限", HttpStatus.FORBIDDEN);
    }
  }

  private void requireAllStoreScope(AdminSessionDto session) {
    if (!"ALL".equals(session.storeScope())) {
      throw new ApiException("FORBIDDEN", "需要全部门店权限", HttpStatus.FORBIDDEN);
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
