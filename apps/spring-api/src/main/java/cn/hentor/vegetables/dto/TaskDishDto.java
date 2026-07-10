package cn.hentor.vegetables.dto;

import java.math.BigDecimal;

public record TaskDishDto(
  String category,
  String description,
  String id,
  String imageKey,
  String imageUrl,
  String name,
  BigDecimal remainingWeightJin,
  Integer sortOrder,
  String status,
  BigDecimal stepJin,
  BigDecimal stockJin,
  BigDecimal totalWeightJin,
  BigDecimal usedWeightJin
) {}
