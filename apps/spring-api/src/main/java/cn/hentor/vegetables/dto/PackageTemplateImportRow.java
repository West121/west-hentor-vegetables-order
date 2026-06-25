package cn.hentor.vegetables.dto;

import java.math.BigDecimal;

public record PackageTemplateImportRow(
  String benefitName,
  Integer benefitSortOrder,
  BigDecimal benefitTotalQuantity,
  String benefitUnit,
  Integer rowNumber,
  Integer sortOrder,
  String status,
  String templateName,
  Integer totalTimes,
  BigDecimal weightLimitJin
) {}
