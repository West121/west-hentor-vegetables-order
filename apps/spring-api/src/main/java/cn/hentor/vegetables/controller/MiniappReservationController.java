package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.dto.MiniReservationRequest;
import cn.hentor.vegetables.dto.MiniReservationResponse;
import cn.hentor.vegetables.dto.MiniSessionContext;
import cn.hentor.vegetables.service.MiniAuthService;
import cn.hentor.vegetables.service.MiniReservationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MiniappReservationController {
  private final MiniAuthService miniAuthService;
  private final MiniReservationService miniReservationService;

  public MiniappReservationController(
    MiniAuthService miniAuthService,
    MiniReservationService miniReservationService
  ) {
    this.miniAuthService = miniAuthService;
    this.miniReservationService = miniReservationService;
  }

  @PostMapping("/api/spring/v1/reservations")
  public ApiResponse<MiniReservationResponse> submit(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @Valid @RequestBody MiniReservationRequest request
  ) {
    MiniSessionContext session = miniAuthService.requireSession(authorization);
    return ApiResponse.ok(miniReservationService.submit(session, request));
  }

  @PutMapping("/api/spring/v1/orders/{orderId}")
  public ApiResponse<MiniReservationResponse> update(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @PathVariable String orderId,
    @Valid @RequestBody MiniReservationRequest request
  ) {
    MiniSessionContext session = miniAuthService.requireSession(authorization);
    return ApiResponse.ok(miniReservationService.update(session, orderId, request));
  }
}
