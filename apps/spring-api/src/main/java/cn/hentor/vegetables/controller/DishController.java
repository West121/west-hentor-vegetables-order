package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.DishDetailResponse;
import cn.hentor.vegetables.dto.DishImportResultDto;
import cn.hentor.vegetables.dto.DishImportRow;
import cn.hentor.vegetables.dto.DishInventoryRequest;
import cn.hentor.vegetables.dto.DishListResponse;
import cn.hentor.vegetables.dto.DishRequest;
import cn.hentor.vegetables.dto.DishResponse;
import cn.hentor.vegetables.dto.StoreDto;
import cn.hentor.vegetables.service.AdminAuthService;
import cn.hentor.vegetables.service.DishService;
import cn.hentor.vegetables.service.SpreadsheetImportService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/spring/admin/dishes")
public class DishController {
  private final AdminAuthService adminAuthService;
  private final DishService dishService;
  private final SpreadsheetImportService spreadsheetImportService;

  public DishController(
    AdminAuthService adminAuthService,
    DishService dishService,
    SpreadsheetImportService spreadsheetImportService
  ) {
    this.adminAuthService = adminAuthService;
    this.dishService = dishService;
    this.spreadsheetImportService = spreadsheetImportService;
  }

  @GetMapping
  public ApiResponse<DishListResponse> list(
    @RequestParam String storeId,
    @RequestParam(required = false) String category,
    @RequestParam(required = false) String query,
    @RequestParam(required = false) String status,
    @RequestParam(defaultValue = "1") long page,
    @RequestParam(defaultValue = "20") long pageSize,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "dishes.read");
    requireStoreAccess(session, storeId);
    return ApiResponse.ok(dishService.list(storeId, category, status, query, page, pageSize));
  }

  @PostMapping
  public ApiResponse<DishResponse> create(
    @Valid @RequestBody DishRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "dishes.write");
    requireStoreAccess(session, request.storeId());
    return ApiResponse.ok(dishService.create(request, session));
  }

  @GetMapping("/{dishId}")
  public ApiResponse<DishDetailResponse> get(
    @PathVariable String dishId,
    @RequestParam String storeId,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "dishes.read");
    requireStoreAccess(session, storeId);
    return ApiResponse.ok(dishService.get(storeId, dishId));
  }

  @PatchMapping("/{dishId}")
  public ApiResponse<DishResponse> update(
    @PathVariable String dishId,
    @Valid @RequestBody DishRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "dishes.write");
    requireStoreAccess(session, request.storeId());
    return ApiResponse.ok(dishService.update(dishId, request, session));
  }

  @PutMapping("/{dishId}")
  public ApiResponse<DishResponse> put(
    @PathVariable String dishId,
    @Valid @RequestBody DishRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    return update(dishId, request, authorization, tokenHeader, tokenCookie);
  }

  @PostMapping("/{dishId}/inventory")
  public ApiResponse<DishResponse> adjustInventory(
    @PathVariable String dishId,
    @Valid @RequestBody DishInventoryRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "dishes.write");
    requireStoreAccess(session, request.storeId());
    return ApiResponse.ok(dishService.adjustInventory(dishId, request, session));
  }

  @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ApiResponse<DishImportResultDto> importDishes(
    @RequestParam String storeId,
    @RequestParam MultipartFile file,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "dishes.write");
    requireStoreAccess(session, storeId);
    List<DishImportRow> rows = spreadsheetImportService.parseDishRows(file);
    if (rows.isEmpty()) {
      throw new ApiException("INVALID_PARAMS", "导入文件没有可识别的菜品数据", HttpStatus.BAD_REQUEST);
    }
    return ApiResponse.ok(dishService.importDishes(storeId, rows, session));
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
