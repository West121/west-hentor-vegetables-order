package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record UserPackageAdjustRequest(
  @NotBlank String storeId,
  @NotNull Integer totalTimes,
  @NotNull Integer usedTimes,
  @NotNull BigDecimal weightLimitJin,
  @NotBlank String reason
) {}
