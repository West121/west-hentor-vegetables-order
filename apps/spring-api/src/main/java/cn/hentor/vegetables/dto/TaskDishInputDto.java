package cn.hentor.vegetables.dto;

import java.math.BigDecimal;

public record TaskDishInputDto(
  String dishId,
  BigDecimal totalWeightJin
) {}
