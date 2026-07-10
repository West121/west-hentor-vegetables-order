package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.common.PageResult;
import cn.hentor.vegetables.dto.AdminOrderBatchShipRequest;
import cn.hentor.vegetables.dto.AdminOrderBatchShipResponse;
import cn.hentor.vegetables.dto.AdminOrderCreateRequest;
import cn.hentor.vegetables.dto.AdminOrderDetailResponse;
import cn.hentor.vegetables.dto.AdminOrderRemarkRequest;
import cn.hentor.vegetables.dto.AdminOrderRemarkResponse;
import cn.hentor.vegetables.dto.AdminOrderShipRequest;
import cn.hentor.vegetables.dto.AdminOrderShipResponse;
import cn.hentor.vegetables.dto.AdminOrderShipmentDto;
import cn.hentor.vegetables.dto.AdminOrderStatusActionRequest;
import cn.hentor.vegetables.dto.AdminOrderStatusResponse;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.Kuaidi100CloudPrintRequest;
import cn.hentor.vegetables.dto.Kuaidi100CloudPrintResponse;
import cn.hentor.vegetables.dto.OrderExportResult;
import cn.hentor.vegetables.dto.OrderListItem;
import cn.hentor.vegetables.dto.OrderPrintLabelResult;
import cn.hentor.vegetables.dto.StoreDto;
import cn.hentor.vegetables.service.AdminAuthService;
import cn.hentor.vegetables.service.OrderQueryService;
import jakarta.validation.Valid;
import java.util.Arrays;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/api/spring/admin/orders")
public class OrderController {
  private final AdminAuthService adminAuthService;
  private final OrderQueryService orderQueryService;

  public OrderController(AdminAuthService adminAuthService, OrderQueryService orderQueryService) {
    this.adminAuthService = adminAuthService;
    this.orderQueryService = orderQueryService;
  }

  @GetMapping
  public ApiResponse<PageResult<OrderListItem>> list(
    @RequestParam String storeId,
    @RequestParam(required = false) String status,
    @RequestParam(required = false) String query,
    @RequestParam(required = false) String dateFrom,
    @RequestParam(required = false) String dateTo,
    @RequestParam(defaultValue = "1") long page,
    @RequestParam(defaultValue = "10") long pageSize,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "orders.read");
    requireStoreAccess(session, storeId);
    return ApiResponse.ok(
      orderQueryService.listOrders(storeId, status, query, dateFrom, dateTo, page, pageSize)
    );
  }

  @PostMapping
  public ApiResponse<AdminOrderDetailResponse> create(
    @Valid @RequestBody AdminOrderCreateRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "orders.write");
    requireStoreAccess(session, request.storeId());
    return ApiResponse.ok(orderQueryService.createOrder(request, session));
  }

  @GetMapping(value = "/export", produces = "text/csv; charset=utf-8")
  public ResponseEntity<String> export(
    @RequestParam String storeId,
    @RequestParam(required = false) String status,
    @RequestParam(required = false) String query,
    @RequestParam(required = false) String dateFrom,
    @RequestParam(required = false) String dateTo,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "orders.read");
    requireStoreAccess(session, storeId);
    OrderExportResult result = orderQueryService.exportOrders(
      storeId,
      status,
      query,
      dateFrom,
      dateTo
    );
    return ResponseEntity
      .ok()
      .header("content-disposition", "attachment; filename=\"orders-export.csv\"")
      .header("x-export-row-count", String.valueOf(result.rowCount()))
      .body(result.csvText());
  }

  @PostMapping("/batch-ship")
  public ApiResponse<AdminOrderBatchShipResponse> batchShip(
    @Valid @RequestBody AdminOrderBatchShipRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "orders.write");
    requireStoreAccess(session, request.storeId());
    return ApiResponse.ok(orderQueryService.batchShipOrders(request, session));
  }

  @GetMapping("/{orderId}")
  public ApiResponse<AdminOrderDetailResponse> get(
    @PathVariable String orderId,
    @RequestParam String storeId,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "orders.read");
    requireStoreAccess(session, storeId);
    return ApiResponse.ok(orderQueryService.getOrder(storeId, orderId));
  }

  @PatchMapping("/{orderId}")
  public ApiResponse<AdminOrderRemarkResponse> updateRemark(
    @PathVariable String orderId,
    @Valid @RequestBody AdminOrderRemarkRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "orders.write");
    requireStoreAccess(session, request.storeId());
    return ApiResponse.ok(orderQueryService.updateInternalRemark(orderId, request, session));
  }

  @PutMapping("/{orderId}")
  public ApiResponse<AdminOrderRemarkResponse> putRemark(
    @PathVariable String orderId,
    @Valid @RequestBody AdminOrderRemarkRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    return updateRemark(orderId, request, authorization, tokenHeader, tokenCookie);
  }

  @PostMapping("/{orderId}/ship")
  public ApiResponse<AdminOrderShipResponse> ship(
    @PathVariable String orderId,
    @Valid @RequestBody AdminOrderShipRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "orders.write");
    requireStoreAccess(session, request.storeId());
    return ApiResponse.ok(orderQueryService.shipOrder(orderId, request, session));
  }

  @PostMapping("/{orderId}/sign")
  public ApiResponse<AdminOrderStatusResponse> sign(
    @PathVariable String orderId,
    @Valid @RequestBody AdminOrderStatusActionRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "orders.write");
    requireStoreAccess(session, request.storeId());
    return ApiResponse.ok(orderQueryService.signOrder(orderId, request, session));
  }

  @PostMapping("/{orderId}/cancel")
  public ApiResponse<AdminOrderStatusResponse> cancelOrder(
    @PathVariable String orderId,
    @Valid @RequestBody AdminOrderStatusActionRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "orders.write");
    requireStoreAccess(session, request.storeId());
    return ApiResponse.ok(orderQueryService.cancelOrder(orderId, request, session));
  }

  @PostMapping("/{orderId}/void")
  public ApiResponse<AdminOrderStatusResponse> voidOrder(
    @PathVariable String orderId,
    @Valid @RequestBody AdminOrderStatusActionRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "orders.write");
    requireStoreAccess(session, request.storeId());
    return ApiResponse.ok(orderQueryService.voidOrder(orderId, request, session));
  }

  @PostMapping("/{orderId}/shipments/{shipmentId}/track/refresh")
  public ApiResponse<AdminOrderShipmentDto> refreshShipmentTrack(
    @PathVariable String orderId,
    @PathVariable String shipmentId,
    @RequestParam String storeId,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "orders.read");
    requireStoreAccess(session, storeId);
    return ApiResponse.ok(orderQueryService.refreshShipmentTrack(storeId, orderId, shipmentId));
  }

  @GetMapping(value = "/print-labels", produces = MediaType.TEXT_HTML_VALUE)
  public ResponseEntity<String> printLabels(
    @RequestParam String orderIds,
    @RequestParam String storeId,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "orders.read");
    requireStoreAccess(session, storeId);
    OrderPrintLabelResult result = orderQueryService.buildOrderPrintLabels(
      storeId,
      splitOrderIds(orderIds)
    );
    return ResponseEntity
      .ok()
      .contentType(MediaType.TEXT_HTML)
      .header("x-print-label-count", String.valueOf(result.labelCount()))
      .body(result.html());
  }

  @PostMapping("/print-labels")
  public ApiResponse<Kuaidi100CloudPrintResponse> cloudPrint(
    @Valid @RequestBody Kuaidi100CloudPrintRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "orders.write");
    requireStoreAccess(session, request.storeId());
    return ApiResponse.ok(orderQueryService.cloudPrint(request, session));
  }

  private List<String> splitOrderIds(String value) {
    return Arrays
      .stream(value.split(","))
      .map(String::trim)
      .filter(StringUtils::hasText)
      .distinct()
      .toList();
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
