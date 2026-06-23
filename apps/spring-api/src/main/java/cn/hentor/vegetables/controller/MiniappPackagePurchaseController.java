package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.dto.MiniPackagePurchaseRequest;
import cn.hentor.vegetables.dto.MiniPackagePurchaseResponse;
import cn.hentor.vegetables.dto.MiniSessionContext;
import cn.hentor.vegetables.dto.MiniWechatPrepayResponse;
import cn.hentor.vegetables.service.MiniAuthService;
import cn.hentor.vegetables.service.MiniPackagePurchaseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/spring/v1/package-purchases")
public class MiniappPackagePurchaseController {
  private final MiniAuthService miniAuthService;
  private final MiniPackagePurchaseService miniPackagePurchaseService;

  public MiniappPackagePurchaseController(
    MiniAuthService miniAuthService,
    MiniPackagePurchaseService miniPackagePurchaseService
  ) {
    this.miniAuthService = miniAuthService;
    this.miniPackagePurchaseService = miniPackagePurchaseService;
  }

  @PostMapping
  public ApiResponse<MiniPackagePurchaseResponse> createPurchase(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @Valid @RequestBody MiniPackagePurchaseRequest request
  ) {
    MiniSessionContext session = miniAuthService.requireSession(authorization);
    return ApiResponse.ok(miniPackagePurchaseService.createPurchase(session, request));
  }

  @PostMapping("/{purchaseId}/wechat-prepay")
  public ApiResponse<MiniWechatPrepayResponse> reserveWechatPrepay(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @PathVariable String purchaseId,
    @RequestParam(required = false) String storeCode
  ) {
    MiniSessionContext session = miniAuthService.requireSession(authorization);
    return ApiResponse.ok(miniPackagePurchaseService.reserveWechatPrepay(session, purchaseId, storeCode));
  }
}
