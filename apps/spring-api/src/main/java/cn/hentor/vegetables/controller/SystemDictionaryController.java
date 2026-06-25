package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.StoreDto;
import cn.hentor.vegetables.dto.SystemDictionaryListResponse;
import cn.hentor.vegetables.dto.SystemDictionaryRequest;
import cn.hentor.vegetables.dto.SystemDictionaryResponse;
import cn.hentor.vegetables.dto.SystemDictionaryUpsertRequest;
import cn.hentor.vegetables.service.AdminAuthService;
import cn.hentor.vegetables.service.SystemDictionaryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/spring/admin/dictionaries")
public class SystemDictionaryController {
  private final AdminAuthService adminAuthService;
  private final SystemDictionaryService systemDictionaryService;

  public SystemDictionaryController(
    AdminAuthService adminAuthService,
    SystemDictionaryService systemDictionaryService
  ) {
    this.adminAuthService = adminAuthService;
    this.systemDictionaryService = systemDictionaryService;
  }

  @GetMapping
  public ApiResponse<SystemDictionaryListResponse> list(
    @RequestParam String storeId,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requireAnyPermission(session, "system.manage", "dishes.read", "dishes.write");
    requireStoreAccess(session, storeId);
    return ApiResponse.ok(systemDictionaryService.listDictionaries(storeId));
  }

  @PostMapping
  public ApiResponse<SystemDictionaryListResponse> upsert(
    @Valid @RequestBody SystemDictionaryUpsertRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "system.manage");
    requireStoreAccess(session, request.storeId());
    return ApiResponse.ok(systemDictionaryService.upsertDictionary(request, session));
  }

  @GetMapping("/{type}")
  public ApiResponse<SystemDictionaryResponse> get(
    @PathVariable String type,
    @RequestParam String storeId,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requireAnyPermission(session, "system.manage", "dishes.read", "dishes.write");
    requireStoreAccess(session, storeId);
    return ApiResponse.ok(systemDictionaryService.getDictionary(storeId, type));
  }

  @PutMapping("/{type}")
  public ApiResponse<SystemDictionaryResponse> update(
    @PathVariable String type,
    @Valid @RequestBody SystemDictionaryRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "system.manage");
    requireStoreAccess(session, request.storeId());
    return ApiResponse.ok(systemDictionaryService.updateDictionary(type, request, session));
  }

  @DeleteMapping("/{type}")
  public ApiResponse<SystemDictionaryListResponse> delete(
    @PathVariable String type,
    @RequestParam String storeId,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "system.manage");
    requireStoreAccess(session, storeId);
    return ApiResponse.ok(systemDictionaryService.deleteDictionary(storeId, type, session));
  }

  private AdminSessionDto requireSession(String authorization, String tokenHeader, String tokenCookie) {
    return adminAuthService.getSession(resolveToken(authorization, tokenHeader, tokenCookie));
  }

  private void requirePermission(AdminSessionDto session, String permission) {
    if (!session.permissionCodes().contains(permission)) {
      throw new ApiException("FORBIDDEN", "没有操作权限", HttpStatus.FORBIDDEN);
    }
  }

  private void requireAnyPermission(AdminSessionDto session, String... permissions) {
    for (String permission : permissions) {
      if (session.permissionCodes().contains(permission)) {
        return;
      }
    }
    throw new ApiException("FORBIDDEN", "没有操作权限", HttpStatus.FORBIDDEN);
  }

  private void requireStoreAccess(AdminSessionDto session, String storeId) {
    if ("ALL".equals(session.storeScope())) {
      return;
    }
    boolean allowed = session.stores().stream().map(StoreDto::id).anyMatch(storeId::equals);
    if (!allowed) {
      throw new ApiException("STORE_FORBIDDEN", "没有该门店权限", HttpStatus.FORBIDDEN);
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
