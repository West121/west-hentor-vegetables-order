package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;

public record MiniDevLoginRequest(
  @NotBlank(message = "请输入手机号") String phone,
  String storeCode
) {}
