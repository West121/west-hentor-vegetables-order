package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public record UserPackageRequest(
  @NotBlank String storeId,
  @NotBlank String userId,
  @NotBlank String templateId,
  Integer totalTimes,
  Integer usedTimes,
  BigDecimal weightLimitJin,
  String status,
  @NotBlank String reason
) {}
