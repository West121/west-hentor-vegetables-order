package cn.hentor.vegetables.dto;

import java.math.BigDecimal;

public record MiniHomeDishDto(
  String id,
  String name,
  String category,
  BigDecimal stepJin,
  BigDecimal stockJin,
  BigDecimal totalWeightJin,
  BigDecimal usedWeightJin,
  BigDecimal remainingWeightJin,
  String imageUrl,
  String description
) {}
