package cn.hentor.vegetables.dto;

import java.math.BigDecimal;

public record AdminOrderItemDto(
  String dishId,
  String dishNameSnapshot,
  String id,
  BigDecimal weightJin
) {}
