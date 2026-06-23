package cn.hentor.vegetables.dto;

import java.math.BigDecimal;

public record TaskDishDto(
  String category,
  String description,
  String id,
  String imageKey,
  String imageUrl,
  String name,
  Integer sortOrder,
  String status,
  BigDecimal stepJin,
  BigDecimal stockJin
) {}
