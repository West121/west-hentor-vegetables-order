package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.ShipmentStatsResponse;
import cn.hentor.vegetables.dto.StoreDto;
import cn.hentor.vegetables.service.AdminAuthService;
import cn.hentor.vegetables.service.ShipmentStatsService;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
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
@RequestMapping("/api/spring/admin/stats")
public class AdminStatsController {
  private final AdminAuthService adminAuthService;
  private final ShipmentStatsService shipmentStatsService;

  public AdminStatsController(
    AdminAuthService adminAuthService,
    ShipmentStatsService shipmentStatsService
  ) {
    this.adminAuthService = adminAuthService;
    this.shipmentStatsService = shipmentStatsService;
  }

  @GetMapping("/shipment")
  public ApiResponse<ShipmentStatsResponse> shipment(
    @RequestParam(required = false) String addressKeyword,
    @RequestParam(required = false) String dateFrom,
    @RequestParam(required = false) String dateTo,
    @RequestParam(required = false) String dishCategory,
    @RequestParam(required = false) String status,
    @RequestParam String storeId,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "orders.read");
    requireStoreAccess(session, storeId);
    return ApiResponse.ok(shipmentStatsService.getShipmentStats(
      storeId,
      status,
      dishCategory,
      addressKeyword,
      parseDateTime(dateFrom),
      parseDateTime(dateTo)
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

  private LocalDateTime parseDateTime(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }
    try {
      return OffsetDateTime.parse(value.trim()).toLocalDateTime();
    } catch (RuntimeException ignored) {
      try {
        return LocalDateTime.parse(value.trim());
      } catch (RuntimeException exception) {
        throw new ApiException("INVALID_PARAMS", "发货统计参数不完整", HttpStatus.BAD_REQUEST);
      }
    }
  }
}
