package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.dto.MiniDevLoginRequest;
import cn.hentor.vegetables.dto.MiniLoginResponse;
import cn.hentor.vegetables.dto.MiniWxPhoneLoginRequest;
import cn.hentor.vegetables.dto.MiniWxSessionLoginRequest;
import cn.hentor.vegetables.service.MiniAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/spring/v1/auth")
public class MiniappAuthController {
  private final boolean devLoginEnabled;
  private final String devLoginSecret;
  private final MiniAuthService miniAuthService;

  public MiniappAuthController(
    @Value("${hentor.miniapp.dev-login.enabled:false}") boolean devLoginEnabled,
    @Value("${hentor.miniapp.dev-login.secret:}") String devLoginSecret,
    MiniAuthService miniAuthService
  ) {
    this.devLoginEnabled = devLoginEnabled;
    this.devLoginSecret = devLoginSecret;
    this.miniAuthService = miniAuthService;
  }

  @PostMapping("/dev-login")
  public ApiResponse<MiniLoginResponse> devLogin(
    @RequestHeader(value = "X-Dev-Login-Secret", required = false) String requestSecret,
    @Valid @RequestBody MiniDevLoginRequest request
  ) {
    if (!devLoginEnabled) {
      throw new ApiException("DEV_LOGIN_DISABLED", "开发登录已关闭", HttpStatus.NOT_FOUND);
    }
    if (!StringUtils.hasText(devLoginSecret) || !devLoginSecret.equals(requestSecret)) {
      throw new ApiException("DEV_LOGIN_FORBIDDEN", "开发登录校验失败", HttpStatus.FORBIDDEN);
    }
    return ApiResponse.ok(miniAuthService.devLogin(request));
  }

  @PostMapping("/wx-phone")
  public ApiResponse<MiniLoginResponse> wxPhoneLogin(
    @Valid @RequestBody MiniWxPhoneLoginRequest request,
    HttpServletRequest servletRequest
  ) {
    return ApiResponse.ok(miniAuthService.wxPhoneLogin(request, servletRequest));
  }

  @PostMapping("/wx-session")
  public ApiResponse<MiniLoginResponse> wxSessionLogin(
    @Valid @RequestBody MiniWxSessionLoginRequest request,
    HttpServletRequest servletRequest
  ) {
    return ApiResponse.ok(miniAuthService.wxSessionLogin(request, servletRequest));
  }
}
