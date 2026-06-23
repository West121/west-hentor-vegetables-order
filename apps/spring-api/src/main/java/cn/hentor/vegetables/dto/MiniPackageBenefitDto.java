package cn.hentor.vegetables.dto;

import java.math.BigDecimal;

public record MiniPackageBenefitDto(
  String id,
  String kind,
  String name,
  BigDecimal remainingQuantity,
  Integer sortOrder,
  BigDecimal totalQuantity,
  String unit,
  BigDecimal usedQuantity
) {}
