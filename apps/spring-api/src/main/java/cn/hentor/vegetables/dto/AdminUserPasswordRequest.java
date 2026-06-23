package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminUserPasswordRequest(
  @NotBlank @Size(min = 8) String newPassword
) {}
