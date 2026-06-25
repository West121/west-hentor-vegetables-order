package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;

public record MiniWxSessionLoginRequest(
  @NotBlank(message = "微信登录凭证不能为空") String loginCode,
  String storeCode
) {}
