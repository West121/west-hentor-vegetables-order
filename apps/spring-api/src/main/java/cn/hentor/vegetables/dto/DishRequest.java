package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record DishRequest(
  @NotBlank String storeId,
  @NotBlank String name,
  @NotBlank String category,
  String status,
  @NotNull @DecimalMin(value = "0.0", inclusive = false) BigDecimal stepJin,
  @NotNull @DecimalMin("0.0") BigDecimal stockJin,
  String imageKey,
  String imageUrl,
  String description,
  Integer sortOrder
) {}
