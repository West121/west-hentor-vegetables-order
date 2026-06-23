package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.dto.MiniDevLoginRequest;
import cn.hentor.vegetables.dto.MiniLoginResponse;
import cn.hentor.vegetables.dto.MiniWxPhoneLoginRequest;
import cn.hentor.vegetables.service.MiniAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/spring/v1/auth")
public class MiniappAuthController {
  private final MiniAuthService miniAuthService;

  public MiniappAuthController(MiniAuthService miniAuthService) {
    this.miniAuthService = miniAuthService;
  }

  @PostMapping("/dev-login")
  public ApiResponse<MiniLoginResponse> devLogin(@Valid @RequestBody MiniDevLoginRequest request) {
    return ApiResponse.ok(miniAuthService.devLogin(request));
  }

  @PostMapping("/wx-phone")
  public ApiResponse<MiniLoginResponse> wxPhoneLogin(
    @Valid @RequestBody MiniWxPhoneLoginRequest request,
    HttpServletRequest servletRequest
  ) {
    return ApiResponse.ok(miniAuthService.wxPhoneLogin(request, servletRequest));
  }
}
