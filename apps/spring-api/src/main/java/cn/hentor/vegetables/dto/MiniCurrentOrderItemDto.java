package cn.hentor.vegetables.dto;

import java.math.BigDecimal;

public record MiniCurrentOrderItemDto(
  String dishId,
  String id,
  String name,
  BigDecimal weightJin
) {}
