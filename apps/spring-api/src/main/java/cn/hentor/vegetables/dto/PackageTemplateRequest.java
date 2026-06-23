package cn.hentor.vegetables.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

public record PackageTemplateRequest(
  @Valid List<PackageTemplateBenefitRequest> benefits,
  @NotBlank String name,
  Integer sortOrder,
  String status,
  @NotBlank String storeId,
  @NotNull Integer totalTimes,
  BigDecimal weightLimitJin
) {}
