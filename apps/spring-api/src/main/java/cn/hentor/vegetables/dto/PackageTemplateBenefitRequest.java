package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record PackageTemplateBenefitRequest(
  String kind,
  @NotBlank String name,
  Integer sortOrder,
  @NotNull BigDecimal totalQuantity,
  @NotBlank String unit
) {}
