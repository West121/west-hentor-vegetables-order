package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.dto.MiniAccountCancelRequest;
import cn.hentor.vegetables.dto.MiniAccountCancelResponse;
import cn.hentor.vegetables.dto.MiniAccountUpdateRequest;
import cn.hentor.vegetables.dto.MiniAccountUpdateResponse;
import cn.hentor.vegetables.dto.MiniSessionContext;
import cn.hentor.vegetables.service.MiniAccountService;
import cn.hentor.vegetables.service.MiniAuthService;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/spring/v1/account")
public class MiniappAccountController {
  private final MiniAccountService miniAccountService;
  private final MiniAuthService miniAuthService;

  public MiniappAccountController(MiniAccountService miniAccountService, MiniAuthService miniAuthService) {
    this.miniAccountService = miniAccountService;
    this.miniAuthService = miniAuthService;
  }

  @PatchMapping
  public ApiResponse<MiniAccountUpdateResponse> updateProfile(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestBody MiniAccountUpdateRequest request
  ) {
    MiniSessionContext session = miniAuthService.requireSession(authorization);
    return ApiResponse.ok(miniAccountService.updateProfile(session, request));
  }

  @DeleteMapping
  public ApiResponse<MiniAccountCancelResponse> cancelAccount(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestBody(required = false) MiniAccountCancelRequest request
  ) {
    MiniSessionContext session = miniAuthService.requireSession(authorization);
    return ApiResponse.ok(
      miniAccountService.cancelAccount(
        session,
        request == null ? new MiniAccountCancelRequest(null, null) : request
      )
    );
  }
}
