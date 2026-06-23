package cn.hentor.vegetables.dto;

import java.math.BigDecimal;

public record MiniOrderItemDto(
  String dishId,
  String dishNameSnapshot,
  String id,
  BigDecimal weightJin
) {}
