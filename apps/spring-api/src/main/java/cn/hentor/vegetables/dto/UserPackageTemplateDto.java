package cn.hentor.vegetables.dto;

import java.math.BigDecimal;

public record UserPackageTemplateDto(
  String id,
  String name,
  Integer totalTimes,
  BigDecimal weightLimitJin
) {}
