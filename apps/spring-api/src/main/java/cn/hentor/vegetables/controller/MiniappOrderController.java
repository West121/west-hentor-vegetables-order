package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.dto.MiniOrderCancelRequest;
import cn.hentor.vegetables.dto.MiniOrderCancelResponse;
import cn.hentor.vegetables.dto.MiniOrderHideResponse;
import cn.hentor.vegetables.dto.MiniOrderListData;
import cn.hentor.vegetables.dto.MiniOrderListItemDto;
import cn.hentor.vegetables.dto.MiniReservationRequest;
import cn.hentor.vegetables.dto.MiniReservationResponse;
import cn.hentor.vegetables.dto.MiniSessionContext;
import cn.hentor.vegetables.service.MiniAuthService;
import cn.hentor.vegetables.service.MiniOrderService;
import cn.hentor.vegetables.service.MiniReservationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MiniappOrderController {
  private final MiniAuthService miniAuthService;
  private final MiniOrderService miniOrderService;
  private final MiniReservationService miniReservationService;

  public MiniappOrderController(
    MiniAuthService miniAuthService,
    MiniOrderService miniOrderService,
    MiniReservationService miniReservationService
  ) {
    this.miniAuthService = miniAuthService;
    this.miniOrderService = miniOrderService;
    this.miniReservationService = miniReservationService;
  }

  @GetMapping("/api/spring/v1/orders")
  public ApiResponse<MiniOrderListData> list(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestParam(defaultValue = "lotus-garden") String storeCode
  ) {
    MiniSessionContext session = miniAuthService.requireSession(authorization);
    return ApiResponse.ok(miniOrderService.listOrders(session, storeCode));
  }

  @PostMapping("/api/spring/v1/orders")
  public ApiResponse<MiniReservationResponse> submit(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @Valid @RequestBody MiniReservationRequest request
  ) {
    MiniSessionContext session = miniAuthService.requireSession(authorization);
    return ApiResponse.ok(miniReservationService.submit(session, request));
  }

  @GetMapping("/api/spring/v1/orders/{orderId}")
  public ApiResponse<MiniOrderListItemDto> get(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @PathVariable String orderId,
    @RequestParam(defaultValue = "lotus-garden") String storeCode
  ) {
    MiniSessionContext session = miniAuthService.requireSession(authorization);
    return ApiResponse.ok(miniOrderService.getOrder(session, storeCode, orderId));
  }

  @PostMapping("/api/spring/v1/orders/{orderId}/cancel")
  public ApiResponse<MiniOrderCancelResponse> cancel(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @PathVariable String orderId,
    @RequestBody MiniOrderCancelRequest request
  ) {
    MiniSessionContext session = miniAuthService.requireSession(authorization);
    return ApiResponse.ok(miniOrderService.cancel(session, orderId, request));
  }

  @DeleteMapping("/api/spring/v1/orders/{orderId}/user-visible")
  public ApiResponse<MiniOrderHideResponse> hide(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @PathVariable String orderId,
    @RequestParam(defaultValue = "lotus-garden") String storeCode
  ) {
    MiniSessionContext session = miniAuthService.requireSession(authorization);
    return ApiResponse.ok(miniOrderService.hide(session, storeCode, orderId));
  }
}
