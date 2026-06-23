package cn.hentor.vegetables.dto;

import java.math.BigDecimal;

public record MiniPackageTemplateBenefitOptionDto(
  String id,
  String kind,
  String name,
  BigDecimal totalQuantity,
  String unit
) {}
