package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminPasswordChangeRequest(
  @NotBlank(message = "请输入当前密码") String currentPassword,
  @NotBlank(message = "请输入新密码")
  @Size(min = 8, message = "新密码至少需要 8 位")
  String newPassword
) {}
