package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record DishInventoryRequest(
  @NotBlank String storeId,
  @NotNull BigDecimal changeJin,
  @NotBlank String reason
) {}
