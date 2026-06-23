package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;

public record MiniWxPhoneLoginRequest(
  @NotBlank(message = "微信登录凭证不能为空") String loginCode,
  @NotBlank(message = "手机号授权凭证不能为空") String phoneCode,
  String storeCode
) {}
