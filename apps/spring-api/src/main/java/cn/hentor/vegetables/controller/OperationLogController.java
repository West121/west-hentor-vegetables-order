package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.common.PageResult;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.OperationLogItemDto;
import cn.hentor.vegetables.dto.StoreDto;
import cn.hentor.vegetables.service.AdminAuthService;
import cn.hentor.vegetables.service.OperationLogQueryService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/spring/admin/operation-logs")
public class OperationLogController {
  private final AdminAuthService adminAuthService;
  private final OperationLogQueryService operationLogQueryService;

  public OperationLogController(
    AdminAuthService adminAuthService,
    OperationLogQueryService operationLogQueryService
  ) {
    this.adminAuthService = adminAuthService;
    this.operationLogQueryService = operationLogQueryService;
  }

  @GetMapping
  public ApiResponse<PageResult<OperationLogItemDto>> list(
    @RequestParam(required = false) String action,
    @RequestParam(required = false) String dateFrom,
    @RequestParam(required = false) String dateTo,
    @RequestParam(required = false) String operatorId,
    @RequestParam(defaultValue = "1") long page,
    @RequestParam(defaultValue = "20") long pageSize,
    @RequestParam(required = false) String query,
    @RequestParam(required = false) String resource,
    @RequestParam(required = false) Integer statusCode,
    @RequestParam(required = false) String storeId,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "system.manage");
    if (StringUtils.hasText(storeId)) {
      requireStoreAccess(session, storeId.trim());
    } else if (!"ALL".equals(session.storeScope())) {
      throw new ApiException("STORE_FORBIDDEN", "没有全部数据权限", HttpStatus.FORBIDDEN);
    }
    return ApiResponse.ok(operationLogQueryService.listOperationLogs(
      action,
      parseStartOfDay(dateFrom),
      parseEndOfDay(dateTo),
      operatorId,
      page,
      pageSize,
      query,
      resource,
      statusCode,
      storeId
    ));
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

  private LocalDateTime parseStartOfDay(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }
    return LocalDate.parse(value.trim()).atStartOfDay();
  }

  private LocalDateTime parseEndOfDay(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }
    return LocalDateTime.of(LocalDate.parse(value.trim()), LocalTime.MAX);
  }
}
