package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;

public record AdminLoginRequest(
  @NotBlank(message = "请输入账号") String username,
  @NotBlank(message = "请输入密码") String password
) {}
