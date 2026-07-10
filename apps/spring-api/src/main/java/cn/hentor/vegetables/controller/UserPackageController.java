package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.common.PageResult;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.StoreDto;
import cn.hentor.vegetables.dto.UserPackageAdjustRequest;
import cn.hentor.vegetables.dto.UserPackageDetailResponse;
import cn.hentor.vegetables.dto.UserPackageImportResultDto;
import cn.hentor.vegetables.dto.UserPackageImportRow;
import cn.hentor.vegetables.dto.UserPackageListItem;
import cn.hentor.vegetables.dto.UserPackageOperationRequest;
import cn.hentor.vegetables.dto.UserPackageRequest;
import cn.hentor.vegetables.dto.UserPackageResponse;
import cn.hentor.vegetables.service.AdminAuthService;
import cn.hentor.vegetables.service.SpreadsheetImportService;
import cn.hentor.vegetables.service.UserPackageQueryService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/spring/admin/user-packages")
public class UserPackageController {
  private final AdminAuthService adminAuthService;
  private final SpreadsheetImportService spreadsheetImportService;
  private final UserPackageQueryService userPackageQueryService;

  public UserPackageController(
    AdminAuthService adminAuthService,
    SpreadsheetImportService spreadsheetImportService,
    UserPackageQueryService userPackageQueryService
  ) {
    this.adminAuthService = adminAuthService;
    this.spreadsheetImportService = spreadsheetImportService;
    this.userPackageQueryService = userPackageQueryService;
  }

  @GetMapping
  public ApiResponse<PageResult<UserPackageListItem>> list(
    @RequestParam String storeId,
    @RequestParam(required = false) String status,
    @RequestParam(required = false) String query,
    @RequestParam(defaultValue = "1") long page,
    @RequestParam(defaultValue = "10") long pageSize,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "members.read");
    requireStoreAccess(session, storeId);
    return ApiResponse.ok(
      userPackageQueryService.listUserPackages(storeId, status, query, page, pageSize)
    );
  }

  @PostMapping
  public ApiResponse<UserPackageResponse> create(
    @Valid @RequestBody UserPackageRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "members.write");
    requireStoreAccess(session, request.storeId());
    return ApiResponse.ok(userPackageQueryService.createUserPackage(request, session));
  }

  @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ApiResponse<UserPackageImportResultDto> importUserPackages(
    @RequestParam String storeId,
    @RequestParam MultipartFile file,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "members.write");
    requireStoreAccess(session, storeId);
    List<UserPackageImportRow> rows = spreadsheetImportService.parseUserPackageRows(file);
    if (rows.isEmpty()) {
      throw new ApiException("INVALID_PARAMS", "导入文件没有可识别的会员套餐数据", HttpStatus.BAD_REQUEST);
    }
    return ApiResponse.ok(userPackageQueryService.importUserPackages(storeId, rows, session));
  }

  @GetMapping("/{packageId}")
  public ApiResponse<UserPackageDetailResponse> get(
    @PathVariable String packageId,
    @RequestParam String storeId,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "members.read");
    requireStoreAccess(session, storeId);
    return ApiResponse.ok(userPackageQueryService.getUserPackage(storeId, packageId));
  }

  @PatchMapping("/{packageId}")
  public ApiResponse<UserPackageResponse> adjust(
    @PathVariable String packageId,
    @Valid @RequestBody UserPackageAdjustRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "members.write");
    requireStoreAccess(session, request.storeId());
    return ApiResponse.ok(userPackageQueryService.adjustUserPackage(packageId, request, session));
  }

  @PutMapping("/{packageId}")
  public ApiResponse<UserPackageResponse> put(
    @PathVariable String packageId,
    @Valid @RequestBody UserPackageAdjustRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    return adjust(packageId, request, authorization, tokenHeader, tokenCookie);
  }

  @PostMapping("/{packageId}/freeze")
  public ApiResponse<UserPackageResponse> freeze(
    @PathVariable String packageId,
    @Valid @RequestBody UserPackageOperationRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "members.write");
    requireStoreAccess(session, request.storeId());
    return ApiResponse.ok(userPackageQueryService.freezeUserPackage(packageId, request, session));
  }

  @PostMapping("/{packageId}/unfreeze")
  public ApiResponse<UserPackageResponse> unfreeze(
    @PathVariable String packageId,
    @Valid @RequestBody UserPackageOperationRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "members.write");
    requireStoreAccess(session, request.storeId());
    return ApiResponse.ok(userPackageQueryService.unfreezeUserPackage(packageId, request, session));
  }

  @DeleteMapping("/{packageId}")
  public ApiResponse<UserPackageResponse> delete(
    @PathVariable String packageId,
    @Valid @RequestBody UserPackageOperationRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "members.write");
    requireStoreAccess(session, request.storeId());
    return ApiResponse.ok(userPackageQueryService.deleteUserPackage(packageId, request, session));
  }

  private AdminSessionDto requireSession(String authorization, String tokenHeader, String tokenCookie) {
    return adminAuthService.getSession(resolveToken(authorization, tokenHeader, tokenCookie));
  }

  private void requirePermission(AdminSessionDto session, String permission) {
    if (!session.permissionCodes().contains(permission)) {
      throw new ApiException("FORBIDDEN", "没有操作权限", HttpStatus.FORBIDDEN);
    }
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
