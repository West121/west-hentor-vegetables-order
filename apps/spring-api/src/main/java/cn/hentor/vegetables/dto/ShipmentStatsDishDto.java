package cn.hentor.vegetables.dto;

import java.math.BigDecimal;

public record ShipmentStatsDishDto(
  String category,
  String dishId,
  String dishName,
  long orderCount,
  BigDecimal totalWeightJin
) {}
