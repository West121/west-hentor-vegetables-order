package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.common.PageResult;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.PackageTemplateImportResultDto;
import cn.hentor.vegetables.dto.PackageTemplateImportRow;
import cn.hentor.vegetables.dto.PackageTemplateListItem;
import cn.hentor.vegetables.dto.PackageTemplateRequest;
import cn.hentor.vegetables.dto.PackageTemplateResponse;
import cn.hentor.vegetables.dto.StoreDto;
import cn.hentor.vegetables.service.AdminAuthService;
import cn.hentor.vegetables.service.PackageTemplateQueryService;
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
@RequestMapping("/api/spring/admin/package-templates")
public class PackageTemplateController {
  private final AdminAuthService adminAuthService;
  private final PackageTemplateQueryService packageTemplateQueryService;
  private final SpreadsheetImportService spreadsheetImportService;

  public PackageTemplateController(
    AdminAuthService adminAuthService,
    PackageTemplateQueryService packageTemplateQueryService,
    SpreadsheetImportService spreadsheetImportService
  ) {
    this.adminAuthService = adminAuthService;
    this.packageTemplateQueryService = packageTemplateQueryService;
    this.spreadsheetImportService = spreadsheetImportService;
  }

  @GetMapping
  public ApiResponse<PageResult<PackageTemplateListItem>> list(
    @RequestParam String storeId,
    @RequestParam(required = false) String status,
    @RequestParam(required = false) String query,
    @RequestParam(defaultValue = "1") long page,
    @RequestParam(defaultValue = "20") long pageSize,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "packages.read");
    requireStoreAccess(session, storeId);
    return ApiResponse.ok(
      packageTemplateQueryService.listTemplates(storeId, status, query, page, pageSize)
    );
  }

  @PostMapping
  public ApiResponse<PackageTemplateResponse> create(
    @Valid @RequestBody PackageTemplateRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "packages.write");
    requireStoreAccess(session, request.storeId());
    return ApiResponse.ok(packageTemplateQueryService.createTemplate(request, session));
  }

  @GetMapping("/{templateId}")
  public ApiResponse<PackageTemplateResponse> get(
    @PathVariable String templateId,
    @RequestParam String storeId,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "packages.read");
    requireStoreAccess(session, storeId);
    return ApiResponse.ok(packageTemplateQueryService.getTemplate(storeId, templateId));
  }

  @PatchMapping("/{templateId}")
  public ApiResponse<PackageTemplateResponse> update(
    @PathVariable String templateId,
    @Valid @RequestBody PackageTemplateRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "packages.write");
    requireStoreAccess(session, request.storeId());
    return ApiResponse.ok(packageTemplateQueryService.updateTemplate(templateId, request, session));
  }

  @PutMapping("/{templateId}")
  public ApiResponse<PackageTemplateResponse> put(
    @PathVariable String templateId,
    @Valid @RequestBody PackageTemplateRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    return update(templateId, request, authorization, tokenHeader, tokenCookie);
  }

  @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ApiResponse<PackageTemplateImportResultDto> importTemplates(
    @RequestParam String storeId,
    @RequestParam MultipartFile file,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "packages.write");
    requireStoreAccess(session, storeId);
    List<PackageTemplateImportRow> rows = spreadsheetImportService.parsePackageTemplateRows(file);
    if (rows.isEmpty()) {
      throw new ApiException("INVALID_PARAMS", "导入文件没有可识别的套餐模板数据", HttpStatus.BAD_REQUEST);
    }
    return ApiResponse.ok(
      packageTemplateQueryService.importTemplates(storeId, rows, session)
    );
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
