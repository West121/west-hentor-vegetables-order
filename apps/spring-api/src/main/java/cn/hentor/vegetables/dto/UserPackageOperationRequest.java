package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;

public record UserPackageOperationRequest(
  @NotBlank String storeId,
  @NotBlank String reason
) {}
